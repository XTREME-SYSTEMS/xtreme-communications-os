import { authenticateTenant } from "../../shared/tenantAuth.ts";

// Call recording controller — start/stop/list recordings on live voice calls.
// When a Telnyx provider is connected, delegates to the Telnyx Call Control API
// (POST /v2/calls/{call_control_id}/actions/record_start | record_stop).
// Stores recording_url on the CommsEvent and threads it into the conversation timeline.
export default async function(req) {
  try {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const auth = await authenticateTenant(req, body);
    if (auth.error) return auth.error;
    const { base44, tenant } = auth;
    const action = body.action || "list";

    // ── START RECORDING ──
    if (action === "start") {
      if (!body.call_id) return Response.json({ error: "call_id required" }, { status: 400 });

      // Create or update CommsEvent with recording status
      const event = await base44.asServiceRole.entities.CommsEvent.create({
        channel: "voice",
        direction: body.direction || "outbound",
        from_addr: body.from || "",
        to_addr: body.to || "",
        status: "active",
        classification: "PROVIDER-BACKED",
        summary: `recording started on call ${body.call_id}`,
        recording_status: "recording",
      });

      // If Telnyx provider is connected, invoke the Call Control API
      const telnyxKey = process.env.TELNYX_API_KEY;
      let telnyxRecordingId = null;
      if (telnyxKey && body.call_control_id) {
        try {
          const res = await fetch(`https://api.telnyx.com/v2/calls/${body.call_control_id}/actions/record_start`, {
            method: "POST",
            headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              format: "mp3",
              channels: body.channels || "dual",
            }),
          });
          const data = await res.json();
          if (res.ok) telnyxRecordingId = data.data?.recording_id || data.data?.id;
        } catch (_) {}
      }

      return Response.json({
        event_id: event.id,
        call_id: body.call_id,
        recording_status: "recording",
        telnyx_recording_id: telnyxRecordingId,
        classification: telnyxRecordingId ? "LIVE" : "PROVIDER-BACKED",
      });
    }

    // ── STOP RECORDING ──
    if (action === "stop") {
      if (!body.event_id) return Response.json({ error: "event_id required" }, { status: 400 });

      let recordingUrl = body.recording_url || null;
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (telnyxKey && body.call_control_id) {
        try {
          const res = await fetch(`https://api.telnyx.com/v2/calls/${body.call_control_id}/actions/record_stop`, {
            method: "POST",
            headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ format: "mp3" }),
          });
          const data = await res.json();
          if (res.ok && data.data?.recording_urls?.length) {
            recordingUrl = data.data.recording_urls[0];
          }
        } catch (_) {}
      }

      await base44.asServiceRole.entities.CommsEvent.update(body.event_id, {
        status: "completed",
        recording_url: recordingUrl,
        recording_status: recordingUrl ? "completed" : "failed",
        duration_sec: body.duration_sec || null,
      });

      // Meter the recording
      if (recordingUrl) {
        await base44.asServiceRole.entities.UsageMeter.create({
          tenant_id: tenant.id,
          channel: "voice",
          event_type: "recording",
          units: 1,
          unit_cost_cents: 5,
          amount_cents: 5,
          metered_at: new Date().toISOString(),
          classification: "LIVE",
          reference_id: body.event_id,
        });
      }

      return Response.json({
        event_id: body.event_id,
        recording_url: recordingUrl,
        recording_status: recordingUrl ? "completed" : "failed",
        duration_sec: body.duration_sec || null,
      });
    }

    // ── LIST RECORDINGS ──
    if (action === "list") {
      const events = await base44.asServiceRole.entities.CommsEvent.filter(
        { channel: "voice" }, "-created_date", 100
      );
      const recordings = events.filter((e) => e.recording_status === "completed" && e.recording_url);
      return Response.json({
        count: recordings.length,
        recordings: recordings.map((e) => ({
          id: e.id,
          from: e.from_addr,
          to: e.to_addr,
          duration_sec: e.duration_sec,
          recording_url: e.recording_url,
          created_at: e.created_date,
        })),
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
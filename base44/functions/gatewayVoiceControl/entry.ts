import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Telnyx Call Control gateway — programmable voice, IVR/DTMF, media streams, conferencing.
// Real API calls to https://api.telnyx.com/v2/calls/* using TELNYX_API_KEY.
// Actions: dial, hangup, play_audio, gather_digits (IVR/DTMF), speak_text,
//          start_stream (media streams), stop_stream, start_conference, join_conference.
// Surfaces credentials_required when TELNYX_API_KEY is unset — never fakes a live call leg.
async function telnyx(path, method, key, body) {
  const res = await fetch(`https://api.telnyx.com/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

function errMsg(d) {
  return d?.errors?.[0]?.detail || d?.errors?.[0]?.title || d?.message || "unknown";
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const key = keys[0];
    const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    if (!tenant || tenant.status !== "active") return Response.json({ error: "tenant not active" }, { status: 403 });

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return Response.json({
      status: "credentials_required", error: "TELNYX_API_KEY not configured",
      action: body.action,
    }, { status: 503 });

    const action = body.action || "dial";

    // ── DIAL: originate a programmable call ──
    if (action === "dial") {
      const from = body.from || "+18334843799";
      const to = body.to;
      if (!to) return Response.json({ error: "to required" }, { status: 400 });
      // Auto-resolve the Call Control App connection_id if not provided
      let connectionId = body.connection_id;
      if (!connectionId) {
        const apps = await telnyx("/call_control_applications?page[size]=10", "GET", telnyxKey);
        const app = (apps.data?.data || []).find((a) => a.webhook_event_url || a.webhook_url);
        connectionId = app?.id;
      }
      if (!connectionId) return Response.json({
        status: "credentials_required", error: "no Call Control App found — run provisionTelnyxResources first",
      }, { status: 503 });
      const res = await telnyx("/calls", "POST", telnyxKey, {
        connection_id: connectionId,
        from, to,
        timeout_secs: body.timeout_secs || 30,
        answering_machine_detection: body.amd || "disabled",
        webhook_url: body.webhook_url || `https://xtreme-comms.base44.app/functions/telnyxWebhook`,
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data), code: res.data?.errors?.[0]?.code }, { status: res.status });
      const callControlId = res.data.data?.id;
      await base44.asServiceRole.entities.CommsEvent.create({
        channel: "voice", direction: "outbound", from_addr: from, to_addr: to,
        status: "ringing", classification: "LIVE",
        summary: `programmable call via Telnyx Call Control ${callControlId}`,
      });
      return Response.json({
        call_control_id: callControlId, status: "ringing", routed_via: "telnyx-call-control",
        tenant: tenant.name, classification: "LIVE",
      });
    }

    // ── HANGUP ──
    if (action === "hangup") {
      const ccc = body.call_control_id;
      if (!ccc) return Response.json({ error: "call_control_id required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/hangup`, "POST", telnyxKey, {});
      return Response.json({ call_control_id: ccc, status: res.ok ? "hungup" : "failed", detail: res.ok ? null : errMsg(res.data) });
    }

    // ── PLAY AUDIO ──
    if (action === "play_audio") {
      const ccc = body.call_control_id;
      if (!ccc || !body.audio_url) return Response.json({ error: "call_control_id and audio_url required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/playback_start`, "POST", telnyxKey, {
        audio_url: body.audio_url, overlay: body.overlay || false,
      });
      return Response.json({ call_control_id: ccc, status: res.ok ? "playing" : "failed", detail: res.ok ? null : errMsg(res.data) });
    }

    // ── GATHER DIGITS (IVR/DTMF) ──
    if (action === "gather_digits") {
      const ccc = body.call_control_id;
      if (!ccc) return Response.json({ error: "call_control_id required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/gather_using_audio`, "POST", telnyxKey, {
        audio_url: body.audio_url || "",
        minimum_digits: body.min_digits || 1,
        maximum_digits: body.max_digits || 16,
        timeout_millis: body.timeout_millis || 60000,
        terminators: body.terminators || ["#"],
        valid_digits: body.valid_digits || "0123456789",
      });
      return Response.json({
        call_control_id: ccc, status: res.ok ? "gathering" : "failed",
        gather_id: res.data?.data?.id || null,
        detail: res.ok ? null : errMsg(res.data),
      });
    }

    // ── SPEAK TEXT (TTS on call) ──
    if (action === "speak_text") {
      const ccc = body.call_control_id;
      if (!ccc || !body.text) return Response.json({ error: "call_control_id and text required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/speak`, "POST", telnyxKey, {
        payload: body.text, payload_type: "text",
        voice: body.voice || "female",
        language: body.language || "en-US",
      });
      return Response.json({ call_control_id: ccc, status: res.ok ? "speaking" : "failed", detail: res.ok ? null : errMsg(res.data) });
    }

    // ── START MEDIA STREAM ──
    if (action === "start_stream") {
      const ccc = body.call_control_id;
      if (!ccc) return Response.json({ error: "call_control_id required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/streaming_start`, "POST", telnyxKey, {
        target_uri: body.target_uri || "",
        stream_track: body.stream_track || "both",
        stream_status_callback: body.callback_url || null,
      });
      return Response.json({
        call_control_id: ccc, status: res.ok ? "streaming" : "failed",
        stream_id: res.data?.data?.id || null,
        detail: res.ok ? null : errMsg(res.data),
      });
    }

    // ── STOP MEDIA STREAM ──
    if (action === "stop_stream") {
      const ccc = body.call_control_id;
      if (!ccc) return Response.json({ error: "call_control_id required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/streaming_stop`, "POST", telnyxKey, {});
      return Response.json({ call_control_id: ccc, status: res.ok ? "stopped" : "failed", detail: res.ok ? null : errMsg(res.data) });
    }

    // ── START CONFERENCE ──
    if (action === "start_conference") {
      const ccc = body.call_control_id;
      if (!ccc) return Response.json({ error: "call_control_id required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/conference_start`, "POST", telnyxKey, {
        name: body.conference_name || `conf-${Date.now()}`,
        command_id: body.command_id || null,
      });
      return Response.json({
        call_control_id: ccc, status: res.ok ? "conferencing" : "failed",
        conference_id: res.data?.data?.id || null,
        detail: res.ok ? null : errMsg(res.data),
      });
    }

    // ── JOIN CONFERENCE ──
    if (action === "join_conference") {
      const ccc = body.call_control_id;
      if (!ccc || !body.conference_name) return Response.json({ error: "call_control_id and conference_name required" }, { status: 400 });
      const res = await telnyx(`/calls/${ccc}/actions/conference_join`, "POST", telnyxKey, {
        name: body.conference_name,
        end_conference_on_exit: body.end_on_exit || false,
        mute: body.mute || false,
      });
      return Response.json({ call_control_id: ccc, status: res.ok ? "joined" : "failed", conference_name: body.conference_name, detail: res.ok ? null : errMsg(res.data) });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
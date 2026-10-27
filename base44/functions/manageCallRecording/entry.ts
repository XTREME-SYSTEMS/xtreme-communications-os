import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Call Recording Manager — Twilio only
// Actions: start, stop, list
//   start → POST /Calls/{CallSid}/Recordings.json  (live call, recording begins now)
//   stop  → POST /Recordings/{RecordingSid}.json   (Status=stopped)
//   list  → GET  /Recordings.json
// ─────────────────────────────────────────────────────────────────────────────

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!apiKey) return Response.json({ error: 'api_key required' }, { status: 401 });

    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: 'active' });
    if (!keys.length) return Response.json({ error: 'invalid api key' }, { status: 403 });
    const key = keys[0];

    let tenant;
    try { tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id); }
    catch (_) { return Response.json({ error: 'tenant not found' }, { status: 403 }); }
    if (!tenant || tenant.status !== 'active') {
      return Response.json({ error: 'tenant not active' }, { status: 403 });
    }

    const config = twilioConfig();
    if (!config.configured) return Response.json(credentialsRequired({ action: body.action }), { status: 503 });

    const action = body.action || 'start';

    // ── START ──
    if (action === 'start') {
      const callSid = body.call_sid || body.call_control_id;
      if (!callSid) return Response.json({ error: 'call_sid required' }, { status: 400 });

      const params: Record<string, string> = {};
      if (body.recording_channels) params.RecordingChannels = body.recording_channels; // mono | dual
      if (body.play_beep === false) params.PlayBeep = 'false';
      if (body.trim !== undefined) params.Trim = String(body.trim);

      const res = await twilioRequest(`/Calls/${encodeURIComponent(callSid)}/Recordings.json`, {
        method: 'POST',
        params: Object.keys(params).length ? params : undefined,
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({
          status: 'failed', error: twilioError(res.data), code: res.data?.code,
        }, { status: res.status || 502 });
      }

      const recordingSid = res.data?.sid;

      try {
        const events = await base44.asServiceRole.entities.CommsEvent.filter({ provider_message_id: callSid });
        if (events.length) {
          await base44.asServiceRole.entities.CommsEvent.update(events[0].id, {
            recording_status: 'recording',
          });
        }
      } catch (_) { /* non-fatal */ }

      return Response.json({
        recording_id: recordingSid,
        recording_sid: recordingSid,
        call_sid: callSid,
        status: 'recording',
        routed_via: 'twilio',
      });
    }

    // ── STOP ──
    if (action === 'stop') {
      const recordingSid = body.recording_id || body.recording_sid;
      const callSid = body.call_sid || body.call_control_id;
      if (!recordingSid && !callSid) {
        return Response.json({ error: 'recording_id or call_sid required' }, { status: 400 });
      }

      // Resolve the recording SID from the call when only the call SID was given.
      let targetSid = recordingSid;
      if (!targetSid) {
        const list = await twilioRequest(`/Calls/${encodeURIComponent(callSid)}/Recordings.json`);
        if (!list.ok) {
          if (list.credentialsRequired) return Response.json(list.data, { status: 503 });
          return Response.json({ status: 'failed', error: twilioError(list.data) }, { status: list.status });
        }
        targetSid = (list.data?.recordings || [])[0]?.sid;
        if (!targetSid) return Response.json({ status: 'not_found', error: 'no recording on this call' }, { status: 404 });
      }

      const res = await twilioRequest(`/Recordings/${encodeURIComponent(targetSid)}.json`, {
        method: 'POST',
        params: { Status: 'stopped' },
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      try {
        if (callSid) {
          const events = await base44.asServiceRole.entities.CommsEvent.filter({ provider_message_id: callSid });
          if (events.length) {
            await base44.asServiceRole.entities.CommsEvent.update(events[0].id, {
              recording_status: 'completed',
            });
          }
        }
      } catch (_) { /* non-fatal */ }

      return Response.json({
        recording_id: targetSid,
        recording_sid: targetSid,
        status: res.data?.status || 'stopped',
        routed_via: 'twilio',
      });
    }

    // ── LIST ──
    if (action === 'list') {
      const callSid = body.call_sid || body.call_control_id;
      const path = callSid
        ? `/Calls/${encodeURIComponent(callSid)}/Recordings.json`
        : '/Recordings.json';

      const res = await twilioRequest(path, {
        method: 'GET',
        params: callSid ? undefined : { PageSize: Math.min(body.limit || 20, 100) },
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const recordings = (res.data?.recordings || []).map((r) => ({
        recording_id: r.sid,
        recording_sid: r.sid,
        call_sid: r.call_sid,
        duration_sec: r.duration ? Number(r.duration) : 0,
        status: r.status,
        channels: r.channels,
        date_created: r.date_created,
        // Twilio media requires Basic auth to fetch; expose the API path instead of a public URL.
        media_path: `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Recordings/${r.sid}.mp3`,
      }));

      return Response.json({ recordings, count: recordings.length, classification: 'LIVE' });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[manageCallRecording] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
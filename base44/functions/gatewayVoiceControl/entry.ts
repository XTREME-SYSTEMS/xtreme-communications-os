import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  toE164,
  sayTwiml,
  escapeXml,
  WEBHOOKS,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Voice Control Gateway — Twilio only
// ─────────────────────────────────────────────────────────────────────────────
// Programmable voice: originate, hangup, IVR/DTMF, TTS, media streams, conferences.
// Live-call control uses Twilio's call-redirect API (POST /Calls/{sid}.json with
// a TwiML document) which is the supported way to steer an in-progress call.
//
// Actions: dial, hangup, play_audio, gather_digits, speak_text,
//          start_stream, stop_stream, start_conference, join_conference
// ─────────────────────────────────────────────────────────────────────────────

/** Redirect a live call with a fresh TwiML document. */
async function redirectCall(callSid, innerTwiml) {
  const document = `<?xml version="1.0" encoding="UTF-8"?><Response>${innerTwiml}</Response>`;
  return twilioRequest(`/Calls/${encodeURIComponent(callSid)}.json`, {
    method: 'POST',
    params: { Twiml: document },
  });
}

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
    if (!config.configured) {
      return Response.json(credentialsRequired({ action: body.action }), { status: 503 });
    }

    const action = body.action || 'dial';

    // ── DIAL: originate an outbound call ──
    if (action === 'dial') {
      const to = toE164(body.to);
      if (!body.to) return Response.json({ error: 'to required' }, { status: 400 });

      const from = toE164(body.from || config.from);
      const voiceUrl = body.webhook_url || WEBHOOKS.voice;

      const params: Record<string, string> = {
        To: to,
        From: from,
        Url: voiceUrl,
        Timeout: String(body.timeout_secs || 30),
        StatusCallback: WEBHOOKS.status,
        StatusCallbackEvent: 'initiated ringing answered completed',
        StatusCallbackMethod: 'POST',
      };
      if (body.amd && body.amd !== 'disabled') params.MachineDetection = 'Enable';
      if (body.record) params.Record = 'true';

      const res = await twilioRequest('/Calls.json', { method: 'POST', params });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        const message = twilioError(res.data);
        console.error('[gatewayVoiceControl] dial failed:', res.status, message);
        return Response.json({
          status: 'failed',
          error: message,
          code: res.data?.code,
          twilio_detail: res.data,
        }, { status: res.status || 502 });
      }

      const callSid = res.data?.sid;

      await base44.asServiceRole.entities.CommsEvent.create({
        channel: 'voice',
        direction: 'outbound',
        from_addr: from,
        to_addr: to,
        status: 'ringing',
        classification: 'LIVE',
        provider_id: 'twilio',
        provider_message_id: callSid,
        summary: `programmable call via Twilio ${callSid}`,
      });

      return Response.json({
        call_sid: callSid,
        call_control_id: callSid, // backward-compatible alias
        status: 'ringing',
        routed_via: 'twilio',
        tenant: tenant.name,
        classification: 'LIVE',
      });
    }

    // ── HANGUP ──
    if (action === 'hangup') {
      const sid = body.call_sid || body.call_control_id;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });

      const res = await twilioRequest(`/Calls/${encodeURIComponent(sid)}.json`, {
        method: 'POST',
        params: { Status: 'completed' },
      });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      await base44.asServiceRole.entities.CommsEvent.create({
        channel: 'voice',
        direction: 'outbound',
        from_addr: toE164(config.from),
        to_addr: toE164(body.to || ''),
        status: 'completed',
        classification: 'LIVE',
        provider_id: 'twilio',
        provider_message_id: sid,
        summary: `call ${sid} hung up`,
      });

      return Response.json({ call_sid: sid, call_control_id: sid, status: 'completed', routed_via: 'twilio' });
    }

    // ── SPEAK TEXT (TTS into the live call) ──
    if (action === 'speak_text') {
      const sid = body.call_sid || body.call_control_id;
      const text = body.text || body.payload || '';
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });
      if (!text) return Response.json({ error: 'text required' }, { status: 400 });

      const voice = body.voice || 'Polly.Joanna';
      const res = await redirectCall(sid, sayTwiml(text, voice));
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      return Response.json({ call_sid: sid, call_control_id: sid, status: 'speaking', routed_via: 'twilio' });
    }

    // ── PLAY AUDIO (audio file into the live call) ──
    if (action === 'play_audio') {
      const sid = body.call_sid || body.call_control_id;
      const audioUrl = body.audio_url || body.url || body.payload;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });
      if (!audioUrl) return Response.json({ error: 'audio_url required' }, { status: 400 });

      const res = await redirectCall(sid, `<Play>${escapeXml(audioUrl)}</Play>`);
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      return Response.json({ call_sid: sid, call_control_id: sid, status: 'playing', routed_via: 'twilio' });
    }

    // ── GATHER DIGITS (IVR / DTMF) ──
    if (action === 'gather_digits') {
      const sid = body.call_sid || body.call_control_id;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });

      const prompt = body.prompt || body.text || 'Please enter your selection.';
      const numDigits = Math.min(Math.max(parseInt(body.num_digits, 10) || 1, 1), 12);
      const digitTimeout = body.timeout_secs || 5;
      const actionUrl = body.action_url || `${WEBHOOKS.voice}?gather=1`;
      const voice = body.voice || 'Polly.Joanna';

      const inner = `<Gather numDigits="${numDigits}" timeout="${digitTimeout}" action="${escapeXml(actionUrl)}" method="POST">${sayTwiml(prompt, voice)}</Gather>${sayTwiml('We did not receive any input. Goodbye.', voice)}`;

      const res = await redirectCall(sid, inner);
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      return Response.json({
        call_sid: sid,
        call_control_id: sid,
        status: 'gathering',
        num_digits: numDigits,
        routed_via: 'twilio',
      });
    }

    // ── START MEDIA STREAM ──
    if (action === 'start_stream') {
      const sid = body.call_sid || body.call_control_id;
      const streamUrl = body.stream_url || body.url;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });
      if (!streamUrl) return Response.json({ error: 'stream_url required' }, { status: 400 });

      const inner = `<Start><Stream url="${escapeXml(streamUrl)}"${body.track ? ` track="${escapeXml(body.track)}"` : ''} /></Start><Pause length="3600" />`;

      const res = await redirectCall(sid, inner);
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      return Response.json({
        call_sid: sid,
        call_control_id: sid,
        status: 'streaming',
        stream_url: streamUrl,
        routed_via: 'twilio',
      });
    }

    // ── STOP MEDIA STREAM ──
    if (action === 'stop_stream') {
      const sid = body.call_sid || body.call_control_id;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });

      const res = await redirectCall(sid, '<Stop><Stream /></Stop>');
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      return Response.json({ call_sid: sid, call_control_id: sid, status: 'stream_stopped', routed_via: 'twilio' });
    }

    // ── START / JOIN CONFERENCE ──
    if (action === 'start_conference' || action === 'join_conference') {
      const sid = body.call_sid || body.call_control_id;
      const room = body.conference_name || body.name || `conf-${tenant.id}`;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });

      const attrs = [
        `startConferenceOnEnter="${body.start_on_enter === false ? 'false' : 'true'}"`,
        `endConferenceOnExit="${body.end_on_exit === true ? 'true' : 'false'}"`,
        body.muted ? 'muted="true"' : '',
        body.wait_url ? `waitUrl="${escapeXml(body.wait_url)}"` : '',
      ].filter(Boolean).join(' ');

      const inner = `<Dial><Conference ${attrs}>${escapeXml(room)}</Conference></Dial>`;

      const res = await redirectCall(sid, inner);
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      return Response.json({
        call_sid: sid,
        call_control_id: sid,
        conference_name: room,
        status: 'in_conference',
        routed_via: 'twilio',
      });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewayVoiceControl] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
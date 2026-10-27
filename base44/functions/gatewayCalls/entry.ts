import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  toE164,
  WEBHOOKS,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Call Gateway — Twilio only
// Make and manage outbound/inbound voice calls.
// Actions: dial, hangup, list, get
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

    const action = body.action || 'dial';

    // ── DIAL ──
    if (action === 'dial') {
      if (!body.to) return Response.json({ error: 'to required' }, { status: 400 });

      const to = toE164(body.to);
      const from = toE164(body.from || config.from);

      const params: Record<string, string> = {
        To: to,
        From: from,
        Timeout: String(body.timeout_secs || 30),
        StatusCallback: WEBHOOKS.status,
        StatusCallbackEvent: 'initiated ringing answered completed',
        StatusCallbackMethod: 'POST',
      };

      // Either a TwiML URL or inline TwiML must be supplied.
      if (body.twiml) {
        params.Twiml = body.twiml;
      } else {
        params.Url = body.webhook_url || WEBHOOKS.voice;
      }
      if (body.record) params.Record = 'true';
      if (body.amd && body.amd !== 'disabled') params.MachineDetection = 'Enable';

      const res = await twilioRequest('/Calls.json', { method: 'POST', params });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({
          status: 'failed',
          error: twilioError(res.data),
          code: res.data?.code,
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
        summary: `outbound call via Twilio ${callSid}`,
      });

      return Response.json({
        call_sid: callSid,
        call_control_id: callSid,
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
      return Response.json({ call_sid: sid, call_control_id: sid, status: 'completed' });
    }

    // ── GET one call ──
    if (action === 'get') {
      const sid = body.call_sid || body.call_control_id;
      if (!sid) return Response.json({ error: 'call_sid required' }, { status: 400 });

      const res = await twilioRequest(`/Calls/${encodeURIComponent(sid)}.json`);
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }
      const c = res.data || {};
      return Response.json({
        call_sid: c.sid,
        status: c.status,
        from: c.from,
        to: c.to,
        duration_sec: c.duration ? Number(c.duration) : 0,
        price: c.price,
        direction: c.direction,
        started_at: c.start_time,
        ended_at: c.end_time,
        classification: 'LIVE',
      });
    }

    // ── LIST ──
    if (action === 'list') {
      const params: Record<string, string | number> = { PageSize: Math.min(body.limit || 20, 100) };
      if (body.to) params.To = toE164(body.to);
      if (body.from) params.From = toE164(body.from);
      if (body.status) params.Status = body.status;

      const res = await twilioRequest('/Calls.json', { method: 'GET', params });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const calls = (res.data?.calls || []).map((c) => ({
        call_sid: c.sid,
        from: c.from,
        to: c.to,
        status: c.status,
        direction: c.direction,
        duration_sec: c.duration ? Number(c.duration) : 0,
        price: c.price,
        started_at: c.start_time,
      }));

      return Response.json({ calls, count: calls.length, classification: 'LIVE' });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewayCalls] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
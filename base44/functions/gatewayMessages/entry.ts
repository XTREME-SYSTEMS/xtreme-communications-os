import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  twilioCode,
  toE164,
  WEBHOOKS,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Messaging Gateway — Twilio only (SMS / MMS / WhatsApp)
// Public CaaS endpoint: customers call this with their tenant API key.
// ─────────────────────────────────────────────────────────────────────────────

/** Twilio WhatsApp numbers must carry the whatsapp: scheme. */
function whatsappAddress(number) {
  const raw = String(number || '');
  if (raw.startsWith('whatsapp:')) return raw;
  return `whatsapp:${toE164(raw)}`;
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

    const channel = body.channel || 'sms';
    const config = twilioConfig();
    if (!config.configured) {
      return Response.json(credentialsRequired({ channel, tenant: tenant.name }), { status: 503 });
    }

    const text = body.body || body.text || '';
    if (!body.to) return Response.json({ error: 'to required' }, { status: 400 });
    if (!text && !(body.media_urls || []).length) {
      return Response.json({ error: 'body or media_urls required' }, { status: 400 });
    }

    const mediaUrls: string[] = [].concat(body.media_urls || body.media_url || []).filter(Boolean);

    // ── Route resolution (tenant gateway) ──
    let routes = await base44.asServiceRole.entities.ApiRoute.filter({
      tenant_id: tenant.id, channel, enabled: true,
    });
    if (!routes.length && channel === 'mms') {
      routes = await base44.asServiceRole.entities.ApiRoute.filter({
        tenant_id: tenant.id, channel: 'sms', enabled: true,
      });
    }

    if (!routes.length) {
      if (!body.from) {
        return Response.json({ error: 'no route for channel', channel }, { status: 404 });
      }
      console.log('[gatewayMessages] no ApiRoute — sending directly via Twilio');
    }

    const messageId = 'msg_' + Math.random().toString(36).slice(2, 12);

    // ── Twilio dispatch ──
    const from = channel === 'whatsapp'
      ? whatsappAddress(body.from || config.from)
      : toE164(body.from || config.from);
    const to = channel === 'whatsapp' ? whatsappAddress(body.to) : toE164(body.to);

    const params: Record<string, string> = {
      To: to,
      From: from,
      Body: text,
      StatusCallback: WEBHOOKS.status,
    };

    mediaUrls.forEach((url, i) => { params[`MediaUrl${i}`] = url; });

    const res = await twilioRequest('/Messages.json', { method: 'POST', params });

    if (!res.ok) {
      if (res.credentialsRequired) return Response.json(res.data, { status: 503 });

      const code = twilioCode(res.data);
      const message = twilioError(res.data);
      console.error('[gatewayMessages] Twilio send failed:', res.status, code, message);

      // Opt-out (21610) — recipient replied STOP; carrier-level suppression.
      if (code === 21610) {
        return Response.json({
          message_id: messageId, status: 'suppressed', error: message, code,
          action_required: 'recipient opted out — they must reply START to resume',
        }, { status: 403 });
      }

      // Auth / permission failures
      if (res.status === 401 || code === 20003) {
        return Response.json({
          status: 'credentials_required', error: 'Twilio authentication failed',
          console_url: 'https://1console.twilio.com/',
          action_required: 'verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN',
        }, { status: 403 });
      }

      // Region / geo-permission not enabled
      if (code === 21408) {
        return Response.json({
          message_id: messageId, status: 'failed', error: message, code,
          action_required: 'enable the destination country in Twilio Voice & Fax Geographic Permissions',
        }, { status: 403 });
      }

      // Trial account unverified destination (21608) — treat as a billing wall
      if (code === 21608) {
        return Response.json({
          message_id: messageId, status: 'blocked', error: message, code,
          action_required: 'upgrade the Twilio account or verify the destination number',
        }, { status: 402 });
      }

      return Response.json({
        message_id: messageId, status: 'failed', error: message, code,
      }, { status: res.status || 502 });
    }

    return Response.json({
      message_id: res.data?.sid || messageId,
      status: 'queued',
      routed_via: 'twilio',
      tenant: tenant.name,
      channel,
      classification: 'LIVE',
      segments: res.data?.num_segments || null,
      price: res.data?.price || null,
    });
  } catch (error) {
    console.error('[gatewayMessages] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
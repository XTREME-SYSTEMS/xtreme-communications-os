import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  toE164,
  numberKey,
  TWILIO_CONSOLE_URL,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Compliance Gateway — Twilio only
// Actions: check_trust, register_brand, register_campaign,
//          add_opt_out, remove_opt_out, list_opt_outs, is_opted_out
//
// Twilio enforces STOP/HELP at the carrier layer automatically. This gateway
// tracks the account's own suppression list so outbound campaigns never
// re-contact someone who has opted out.
// ─────────────────────────────────────────────────────────────────────────────

const TRUSTHUB_URL = `${TWILIO_CONSOLE_URL}compliance/registration`;

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

    const action = body.action || 'check_trust';

    // ── TRUST STATUS: real read of Messaging Services + compliance of owned numbers ──
    if (action === 'check_trust') {
      const services = await twilioRequest('/Messaging/Services.json', {
        method: 'GET',
        params: { PageSize: 50 },
      });
      if (!services.ok) {
        if (services.credentialsRequired) return Response.json(services.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(services.data) }, { status: services.status });
      }

      const owned = await twilioRequest('/IncomingPhoneNumbers.json', {
        method: 'GET',
        params: { PageSize: 100 },
      });
      const numbers = (owned.data?.incoming_phone_numbers || []).map((n) => ({
        e164: n.phone_number,
        twilio_sid: n.sid,
        sms_capable: Boolean(n.capabilities?.SMS),
        status: n.status,
      }));

      const messagingServices = (services.data?.services || []).map((s) => ({
        sid: s.sid,
        friendly_name: s.friendly_name,
        use_inbound_webhook_on_number: s.use_inbound_webhook_on_number,
      }));

      const optOuts = await base44.asServiceRole.entities.MessagingOptOut.filter(
        { tenant_id: tenant.id, active: true }, { limit: 500 }
      );
      const optOutList = Array.isArray(optOuts) ? optOuts : (optOuts.items || []);

      return Response.json({
        status: 'ok',
        numbers,
        number_count: numbers.length,
        messaging_services: messagingServices,
        service_count: messagingServices.length,
        opt_out_count: optOutList.length,
        a2p_registered: messagingServices.length > 0,
        trust_hub_url: TRUSTHUB_URL,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── BRAND / CAMPAIGN REGISTRATION: Twilio requires TrustHub (no public write API) ──
    if (action === 'register_brand' || action === 'register_campaign') {
      return Response.json({
        status: 'manual_action_required',
        provider: 'twilio',
        action,
        business_name: body.business_name || tenant.name,
        ein: body.ein || null,
        error: 'A2P 10DLC brand and campaign registration is completed in Twilio TrustHub',
        action_required: 'Complete the registration in the Twilio Console — approval is carrier-reviewed',
        trust_hub_url: TRUSTHUB_URL,
      }, { status: 409 });
    }

    // ── ADD OPT-OUT ──
    if (action === 'add_opt_out') {
      const target = body.number || body.e164 || body.to;
      if (!target) return Response.json({ error: 'number required' }, { status: 400 });
      const number = toE164(target);

      const existing = await base44.asServiceRole.entities.MessagingOptOut.filter({
        tenant_id: tenant.id, number_key: numberKey(number),
      });

      if (existing.length) {
        await base44.asServiceRole.entities.MessagingOptOut.update(existing[0].id, {
          active: true,
          reason: body.reason || existing[0].reason || 'manual',
        });
        return Response.json({ status: 'opt_out_recorded', e164: number, updated: true });
      }

      const record = await base44.asServiceRole.entities.MessagingOptOut.create({
        tenant_id: tenant.id,
        e164: number,
        number_key: numberKey(number),
        reason: body.reason || 'manual',
        source: body.source || 'gateway',
        active: true,
        opted_out_at: new Date().toISOString(),
      });

      return Response.json({ status: 'opt_out_recorded', e164: number, id: record.id, created: true });
    }

    // ── REMOVE OPT-OUT ──
    if (action === 'remove_opt_out') {
      const target = body.number || body.e164 || body.to;
      if (!target) return Response.json({ error: 'number required' }, { status: 400 });
      const number = toE164(target);

      const existing = await base44.asServiceRole.entities.MessagingOptOut.filter({
        tenant_id: tenant.id, number_key: numberKey(number),
      });
      if (!existing.length) return Response.json({ status: 'not_found', e164: number }, { status: 404 });

      await base44.asServiceRole.entities.MessagingOptOut.update(existing[0].id, {
        active: false,
        reinstated_at: new Date().toISOString(),
      });

      return Response.json({ status: 'opt_out_removed', e164: number });
    }

    // ── LIST OPT-OUTS ──
    if (action === 'list_opt_outs') {
      const rows = await base44.asServiceRole.entities.MessagingOptOut.filter(
        { tenant_id: tenant.id, active: true },
        { sort: '-opted_out_at', limit: 200 }
      );
      const items = Array.isArray(rows) ? rows : (rows.items || []);
      return Response.json({
        opt_outs: items.map((r) => ({
          e164: r.e164,
          reason: r.reason,
          source: r.source,
          opted_out_at: r.opted_out_at,
        })),
        count: items.length,
      });
    }

    // ── IS OPTED OUT (pre-send check) ──
    if (action === 'is_opted_out') {
      const target = body.number || body.e164 || body.to;
      if (!target) return Response.json({ error: 'number required' }, { status: 400 });
      const match = await base44.asServiceRole.entities.MessagingOptOut.filter({
        tenant_id: tenant.id, number_key: numberKey(toE164(target)), active: true,
      });
      return Response.json({ e164: toE164(target), opted_out: match.length > 0 });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewayCompliance] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
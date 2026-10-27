import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  toE164,
  TWILIO_LOOKUPS,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Lookups Gateway — Twilio Lookups v2
// Carrier, line type, caller name and SMS-pump risk for any number.
// Actions: lookup, bulk_lookup
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS = 'line_type_intelligence,carrier,sms_pumping_risk';

function shapeLookup(d) {
  const line = d?.line_type_intelligence || {};
  const carrier = d?.carrier || {};
  const pump = d?.sms_pumping_risk || {};

  return {
    number: d?.phone_number,
    national_format: d?.national_format,
    country_code: d?.country_code,
    valid: d?.valid ?? null,
    carrier_name: carrier.name || null,
    carrier_type: carrier.type || null,
    line_type: line.type || null,          // mobile | landline | voip | nonFixedVoip
    sms_capable: line.type === 'mobile' || line.type === 'nonFixedVoip' || null,
    sms_pumping_risk_score: pump.sms_pumping_risk_score ?? null,
    sms_pumping_carrier_risk_category: pump.carrier_risk_category || null,
  };
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
    if (!config.configured) return Response.json(credentialsRequired({ action: body.action }), { status: 503 });

    const action = body.action || 'lookup';

    // ── SINGLE LOOKUP ──
    if (action === 'lookup') {
      if (!body.number && !body.phone_number) {
        return Response.json({ error: 'number required' }, { status: 400 });
      }
      const number = toE164(body.number || body.phone_number);

      const res = await twilioRequest(
        `/PhoneNumbers/${encodeURIComponent(number)}?Fields=${FIELDS}`,
        { accountScoped: false, base: TWILIO_LOOKUPS }
      );

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        if (res.status === 404) {
          return Response.json({
            number, status: 'not_found', valid: false, classification: 'LIVE',
          }, { status: 404 });
        }
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const shaped = shapeLookup(res.data);

      // Persist for the number inventory when a matching record exists.
      try {
        const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: number });
        if (existing.length) {
          const target = existing[0];
          await base44.asServiceRole.entities.PhoneNumber.update(target.id, {
            classification: target.classification === 'LIVE' ? 'LIVE' : 'PROVIDER-BACKED',
          });
        }
      } catch (_) { /* non-fatal */ }

      return Response.json({ ...shaped, status: 'ok', classification: 'LIVE', routed_via: 'twilio' });
    }

    // ── BULK LOOKUP ──
    if (action === 'bulk_lookup') {
      const numbers = [].concat(body.numbers || []).slice(0, 25).map(toE164);
      if (!numbers.length) return Response.json({ error: 'numbers required' }, { status: 400 });

      const results = [];
      for (const number of numbers) {
        const res = await twilioRequest(
          `/PhoneNumbers/${encodeURIComponent(number)}?Fields=${FIELDS}`,
          { accountScoped: false, base: TWILIO_LOOKUPS }
        );
        if (res.ok) results.push(shapeLookup(res.data));
        else results.push({ number, valid: false, error: twilioError(res.data) });
      }

      return Response.json({ results, count: results.length, classification: 'LIVE', routed_via: 'twilio' });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewayLookups] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  twilioRequest,
  twilioConfig,
  credentialsRequired,
  twilioError,
  toE164,
  numberKey,
} from '../../shared/twilioClient.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Number Search Gateway — Twilio only
// Actions: search, search_vanity, buy, list_inventory, release
// ─────────────────────────────────────────────────────────────────────────────

function shapeAvailable(n) {
  return {
    e164: n.phone_number,
    friendly_name: n.friendly_name,
    locality: n.locality || null,
    region: n.region || null,
    postal_code: n.postal_code || null,
    iso_country: n.iso_country,
    capabilities: {
      voice: Boolean(n.capabilities?.voice),
      sms: Boolean(n.capabilities?.SMS),
      mms: Boolean(n.capabilities?.MMS),
    },
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

    const action = body.action || 'search';
    const country = (body.country_code || 'US').toUpperCase();
    const numberType = body.type === 'toll_free' ? 'TollFree' : 'Local';

    // ── SEARCH AVAILABLE NUMBERS ──
    if (action === 'search') {
      const params: Record<string, string | number | boolean> = {
        PageSize: Math.min(body.limit || 20, 30),
        VoiceEnabled: body.voice !== false,
        SmsEnabled: body.sms !== false,
      };
      if (body.area_code) params.AreaCode = String(body.area_code).replace(/\D/g, '');
      if (body.contains) params.Contains = String(body.contains).replace(/\D/g, '');
      if (body.in_region) params.InRegion = body.in_region;
      if (body.in_postal_code) params.InPostalCode = body.in_postal_code;

      const res = await twilioRequest(`/AvailablePhoneNumbers/${country}/${numberType}.json`, {
        method: 'GET',
        params,
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const numbers = (res.data?.available_phone_numbers || []).map(shapeAvailable);
      return Response.json({
        numbers,
        count: numbers.length,
        country_code: country,
        type: numberType,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── VANITY SEARCH (digit pattern embedded in the number) ──
    if (action === 'search_vanity') {
      const rawPattern = String(body.pattern || body.vanity || '').trim();
      if (!rawPattern) return Response.json({ error: 'pattern required' }, { status: 400 });

      // Map letters to keypad digits, then look for the digit run.
      const KEYPAD = { a: '2', b: '2', c: '2', d: '3', e: '3', f: '3', g: '4', h: '4', i: '4', j: '5', k: '5', l: '5', m: '6', n: '6', o: '6', p: '7', q: '7', r: '7', s: '7', t: '8', u: '8', v: '8', w: '9', x: '9', y: '9', z: '9' };
      const digits = rawPattern
        .toLowerCase()
        .split('')
        .map((ch) => (/\d/.test(ch) ? ch : KEYPAD[ch] || ''))
        .join('');

      if (digits.length < 3) {
        return Response.json({ error: 'pattern must map to at least 3 digits' }, { status: 400 });
      }

      const res = await twilioRequest(`/AvailablePhoneNumbers/${country}/${numberType}.json`, {
        method: 'GET',
        params: {
          Contains: digits.slice(0, 10),
          PageSize: Math.min(body.limit || 20, 30),
          VoiceEnabled: true,
          SmsEnabled: true,
        },
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const matches = (res.data?.available_phone_numbers || []).map((n) => ({
        ...shapeAvailable(n),
        vanity_pattern: rawPattern,
        vanity_digits: digits,
      }));

      return Response.json({
        matches,
        count: matches.length,
        pattern: rawPattern,
        digits,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── BUY A NUMBER ──
    if (action === 'buy') {
      const target = body.e164 || body.phone_number;
      if (!target) return Response.json({ error: 'e164 required' }, { status: 400 });
      const number = toE164(target);

      const res = await twilioRequest('/IncomingPhoneNumbers.json', {
        method: 'POST',
        params: {
          PhoneNumber: number,
          FriendlyName: body.label || `${tenant.name} · ${number}`,
        },
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({
          status: 'failed',
          error: twilioError(res.data),
          code: res.data?.code,
          action_required: res.data?.code === 21422
            ? 'the number was taken by another account — search again'
            : undefined,
        }, { status: res.status || 502 });
      }

      const record = await base44.asServiceRole.entities.PhoneNumber.create({
        e164: number,
        tenant_id: tenant.id,
        user_id: key.user_id || undefined,
        country_code: country,
        type: body.type || 'local',
        capabilities: [
          res.data?.capabilities?.voice ? 'voice' : null,
          res.data?.capabilities?.SMS ? 'sms' : null,
          res.data?.capabilities?.MMS ? 'mms' : null,
        ].filter(Boolean),
        status: 'assigned',
        classification: 'LIVE',
        provider_id: res.data?.sid,
        monthly_cost: 0,
        purchased_at: new Date().toISOString(),
      });

      return Response.json({
        status: 'purchased',
        number: {
          id: record.id,
          e164: number,
          twilio_sid: res.data?.sid,
          capabilities: record.capabilities,
        },
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── LIST INVENTORY (owned numbers) ──
    if (action === 'list_inventory') {
      const res = await twilioRequest('/IncomingPhoneNumbers.json', {
        method: 'GET',
        params: { PageSize: Math.min(body.limit || 50, 100) },
      });

      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const inventory = (res.data?.incoming_phone_numbers || []).map((n) => ({
        e164: n.phone_number,
        friendly_name: n.friendly_name,
        twilio_sid: n.sid,
        capabilities: {
          voice: Boolean(n.capabilities?.voice),
          sms: Boolean(n.capabilities?.SMS),
          mms: Boolean(n.capabilities?.MMS),
        },
      }));

      return Response.json({
        inventory,
        count: inventory.length,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── RELEASE A NUMBER ──
    if (action === 'release') {
      const target = body.e164 || body.phone_number;
      if (!target) return Response.json({ error: 'e164 required' }, { status: 400 });
      const number = toE164(target);

      const owned = await twilioRequest('/IncomingPhoneNumbers.json', {
        method: 'GET',
        params: { PhoneNumber: number },
      });
      if (!owned.ok) {
        if (owned.credentialsRequired) return Response.json(owned.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(owned.data) }, { status: owned.status });
      }

      const match = (owned.data?.incoming_phone_numbers || []).find(
        (n) => numberKey(n.phone_number) === numberKey(number)
      );
      if (!match) return Response.json({ status: 'not_found', error: 'number not owned by this account' }, { status: 404 });

      const res = await twilioRequest(`/IncomingPhoneNumbers/${encodeURIComponent(match.sid)}.json`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      try {
        const local = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: number });
        if (local.length) {
          await base44.asServiceRole.entities.PhoneNumber.update(local[0].id, { status: 'released' });
        }
      } catch (_) { /* non-fatal */ }

      return Response.json({ status: 'released', e164: number, routed_via: 'twilio' });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewayNumberSearch] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
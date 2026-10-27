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
// SIP Trunking Gateway — Twilio only
// Actions: create_trunk, list_trunks, create_connection, list_connections,
//          assign_number, list_numbers
//
// Twilio model: a SIP "Trunk" carries calls between your PBX and Twilio;
// a SIP "Domain" (origination) is the registration endpoint equivalent.
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

    const action = body.action || 'list_trunks';

    // ── CREATE TRUNK ──
    if (action === 'create_trunk') {
      const name = body.friendly_name || body.name || `${tenant.name} Trunk`;
      const params: Record<string, string | boolean> = { FriendlyName: name };
      if (body.domain_name) params.DomainName = body.domain_name;

      const res = await twilioRequest('/SIP/Trunks.json', { method: 'POST', params });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data), code: res.data?.code }, { status: res.status });
      }

      try {
        await base44.asServiceRole.entities.SipTrunk.create({
          name,
          provider_id: 'twilio',
          trunk_sid: res.data?.sid,
          domain: res.data?.domain_name || body.domain_name || null,
          status: 'active',
          tenant_id: tenant.id,
        });
      } catch (_) { /* non-fatal */ }

      return Response.json({
        status: 'created',
        trunk_sid: res.data?.sid,
        trunk_id: res.data?.sid,
        friendly_name: res.data?.friendly_name,
        domain_name: res.data?.domain_name,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── LIST TRUNKS ──
    if (action === 'list_trunks') {
      const res = await twilioRequest('/SIP/Trunks.json', {
        method: 'GET',
        params: { PageSize: Math.min(body.limit || 50, 100) },
      });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const trunks = (res.data?.trunks || []).map((t) => ({
        trunk_sid: t.sid,
        trunk_id: t.sid,
        friendly_name: t.friendly_name,
        domain_name: t.domain_name,
        date_created: t.date_created,
      }));

      return Response.json({ trunks, count: trunks.length, classification: 'LIVE', routed_via: 'twilio' });
    }

    // ── CREATE ORIGINATION DOMAIN (the "connection" equivalent) ──
    if (action === 'create_connection') {
      const domainName = body.domain_name || body.name;
      if (!domainName) return Response.json({ error: 'domain_name required' }, { status: 400 });

      const params: Record<string, string | boolean> = {
        DomainName: domainName,
        FriendlyName: body.friendly_name || domainName,
        SipRegistration: body.sip_registration !== false,
      };
      if (body.voice_url) params.VoiceUrl = body.voice_url;
      if (body.voice_method) params.VoiceMethod = body.voice_method;

      const res = await twilioRequest('/SIP/Domains.json', { method: 'POST', params });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data), code: res.data?.code }, { status: res.status });
      }

      return Response.json({
        status: 'created',
        connection_id: res.data?.sid,
        domain_sid: res.data?.sid,
        domain_name: res.data?.domain_name,
        sip_registration: params.SipRegistration,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── LIST ORIGINATION DOMAINS ──
    if (action === 'list_connections') {
      const res = await twilioRequest('/SIP/Domains.json', {
        method: 'GET',
        params: { PageSize: Math.min(body.limit || 50, 100) },
      });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const connections = (res.data?.domains || []).map((d) => ({
        connection_id: d.sid,
        domain_sid: d.sid,
        domain_name: d.domain_name,
        friendly_name: d.friendly_name,
        sip_registration: d.sip_registration,
        voice_url: d.voice_url,
      }));

      return Response.json({
        connections,
        count: connections.length,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── ASSIGN A NUMBER TO A TRUNK ──
    if (action === 'assign_number') {
      const target = body.e164 || body.number || body.phone_number;
      const trunkSid = body.trunk_sid || body.trunk_id;
      if (!target) return Response.json({ error: 'e164 required' }, { status: 400 });
      if (!trunkSid) return Response.json({ error: 'trunk_sid required' }, { status: 400 });

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
        method: 'POST',
        params: { TrunkSid: trunkSid },
      });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      return Response.json({
        status: 'assigned',
        e164: number,
        trunk_sid: trunkSid,
        classification: 'LIVE',
        routed_via: 'twilio',
      });
    }

    // ── LIST NUMBERS ELIGIBLE FOR TRUNK ASSIGNMENT ──
    if (action === 'list_numbers') {
      const res = await twilioRequest('/IncomingPhoneNumbers.json', {
        method: 'GET',
        params: { PageSize: Math.min(body.limit || 50, 100) },
      });
      if (!res.ok) {
        if (res.credentialsRequired) return Response.json(res.data, { status: 503 });
        return Response.json({ status: 'failed', error: twilioError(res.data) }, { status: res.status });
      }

      const numbers = (res.data?.incoming_phone_numbers || []).map((n) => ({
        e164: n.phone_number,
        twilio_sid: n.sid,
        trunk_sid: n.trunk_sid || null,
        voice_capable: Boolean(n.capabilities?.voice),
      }));

      return Response.json({ numbers, count: numbers.length, classification: 'LIVE', routed_via: 'twilio' });
    }

    return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[gatewaySipTrunking] unhandled:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
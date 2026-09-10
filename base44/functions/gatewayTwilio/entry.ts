import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Twilio gateway — number search/purchase, SMS/MMS sending, and inventory listing.
// Uses TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (Basic Auth).
// Actions: search, buy, send_sms, send_mms, list_inventory, check_account.
// Surfaces credentials_required when Twilio secrets are unset.
async function twilio(path, method, sid, token, body) {
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}
function errMsg(d) { return d?.message || d?.error_message || d?.more_info || "unknown"; }

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

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return Response.json({ status: "credentials_required", error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not configured" }, { status: 503 });

    const action = body.action || "check_account";

    // ── CHECK ACCOUNT status ──
    if (action === "check_account") {
      const res = await twilio(".json", "GET", sid, token);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      return Response.json({
        account_sid: res.data.sid,
        friendly_name: res.data.friendly_name,
        status: res.data.status,
        type: res.data.type,
        classification: "LIVE",
        provider: "twilio",
      });
    }

    // ── SEARCH available numbers ──
    if (action === "search") {
      const params = new URLSearchParams();
      if (body.area_code) params.set("AreaCode", body.area_code);
      if (body.contains) params.set("Contains", body.contains);
      params.set("SmsEnabled", "true");
      params.set("VoiceEnabled", "true");
      params.set("Limit", String(body.limit || 20));
      const res = await twilio(`/AvailablePhoneNumbers/US/Local.json?${params}`, "GET", sid, token);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.available_phone_numbers || []).map((n) => ({
        e164: n.phone_number,
        friendly_name: n.friendly_name,
        capabilities: ["sms", "voice"],
        region: n.region || null,
        locality: n.locality || null,
        monthly_cost: 1.15,
      }));
      return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "twilio" });
    }

    // ── BUY a number ──
    if (action === "buy") {
      const e164 = body.e164;
      if (!e164) return Response.json({ error: "e164 required" }, { status: 400 });
      const res = await twilio(`/IncomingPhoneNumbers.json`, "POST", sid, token, {
        PhoneNumber: e164,
        SmsEnabled: "true",
        VoiceEnabled: "true",
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data), code: res.data?.code }, { status: res.status });
      const providers = await base44.asServiceRole.entities.Provider.filter({ enabled: true, status: "connected" });
      const connected = providers[0];
      const number = await base44.asServiceRole.entities.PhoneNumber.create({
        e164, tenant_id: tenant.id, country_code: body.country_code || "US",
        type: body.type || "local", capabilities: body.capabilities || ["voice", "sms"],
        status: "assigned", classification: "LIVE",
        provider_id: connected ? connected.id : null,
        monthly_cost: 1.15, purchased_at: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.ProviderLog.create({
        provider: "twilio", channel: "number", event_type: "number.purchase",
        direction: "system", status: "accepted", message: `purchased ${e164} for ${tenant.name}`,
      });
      return Response.json({
        number_id: number.id, e164, status: "assigned", classification: "LIVE",
        provider: "twilio", twilio_sid: res.data.sid,
      });
    }

    // ── SEND SMS ──
    if (action === "send_sms") {
      if (!body.from || !body.to || !body.message) return Response.json({ error: "from, to, message required" }, { status: 400 });
      const res = await twilio(`/Messages.json`, "POST", sid, token, {
        From: body.from, To: body.to, Body: body.message,
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data), code: res.data?.code }, { status: res.status });
      return Response.json({
        message_sid: res.data.sid, status: res.data.status,
        from: res.data.from, to: res.data.to,
        classification: "LIVE", provider: "twilio",
      });
    }

    // ── SEND MMS (with media URL) ──
    if (action === "send_mms") {
      if (!body.from || !body.to) return Response.json({ error: "from, to required" }, { status: 400 });
      const payload = { From: body.from, To: body.to };
      if (body.message) payload.Body = body.message;
      if (body.media_url) payload.MediaUrl = body.media_url;
      const res = await twilio(`/Messages.json`, "POST", sid, token, payload);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data), code: res.data?.code }, { status: res.status });
      return Response.json({
        message_sid: res.data.sid, status: res.data.status,
        from: res.data.from, to: res.data.to,
        classification: "LIVE", provider: "twilio",
      });
    }

    // ── LIST inventory ──
    if (action === "list_inventory") {
      const res = await twilio(`/IncomingPhoneNumbers.json?PageSize=100`, "GET", sid, token);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.incoming_phone_numbers || []).map((n) => ({
        sid: n.sid, e164: n.phone_number, friendly_name: n.friendly_name,
        capabilities: n.capabilities || {},
      }));
      return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "twilio" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
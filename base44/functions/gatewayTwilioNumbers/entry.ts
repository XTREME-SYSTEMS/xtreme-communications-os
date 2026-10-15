import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Twilio Phone Number Search & Provisioning gateway.
// Actions: search (available numbers by area code), buy (purchase a found number),
//          list_inventory (list purchased numbers), release (release a number back to Twilio).
// Uses TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (already set as secrets).

async function twilioApi(path, method, body) {
  const sid = secrets.get("TWILIO_ACCOUNT_SID");
  const token = secrets.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) return { ok: false, status: 503, data: { error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured" } };
  const authHeader = "Basic " + btoa(`${sid}:${token}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}${path}`, {
    method,
    headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: body ? new URLSearchParams(body).toString() : undefined,
    signal: AbortSignal.timeout(15000),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

function errMsg(d) {
  return d?.message || d?.more_info || d?.error_code || "unknown error";
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}

    // Authenticate via API key (same pattern as other gateway functions)
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const key = keys[0];

    let tenant = null;
    try {
      tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    } catch (_) {}

    const action = body.action || "search";

    // ── SEARCH available Twilio numbers ──
    if (action === "search") {
      const params = {
        "IsoCountry": body.country_code || "US",
      };
      if (body.area_code) params["AreaCode"] = body.area_code;
      if (body.contains) params["Contains"] = body.contains;

      // Type filter
      const numberType = body.type === "toll_free" ? "TollFree" : "Local";
      const res = await twilioApi(`/AvailablePhoneNumbers/${body.country_code || "US"}/${numberType}.json`, "GET");
      // Twilio GET with params needs query string, not form body
      if (body.area_code || body.contains) {
        const qs = new URLSearchParams({ IsoCountry: body.country_code || "US" });
        if (body.area_code) qs.set("AreaCode", body.area_code);
        if (body.contains) qs.set("Contains", body.contains);
        const sid = secrets.get("TWILIO_ACCOUNT_SID");
        const token = secrets.get("TWILIO_AUTH_TOKEN");
        if (!sid || !token) return Response.json({ status: "credentials_required", error: "Twilio credentials not configured" }, { status: 503 });
        const authHeader = "Basic " + btoa(`${sid}:${token}`);
        const r2 = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/AvailablePhoneNumbers/${body.country_code || "US"}/${numberType}.json?${qs}`, {
          headers: { Authorization: authHeader },
          signal: AbortSignal.timeout(15000),
        });
        let d2 = {};
        try { d2 = await r2.json(); } catch (_) {}
        if (!r2.ok) return Response.json({ status: "failed", error: errMsg(d2) }, { status: r2.status });
        const numbers = (d2.available_phone_numbers || []).slice(0, body.limit || 20).map((n) => ({
          e164: n.phone_number,
          friendly_name: n.friendly_name,
          monthly_cost: numberType === "TollFree" ? 2.15 : 1.15,
          capabilities: ["sms", "voice", ...(n.capabilities?.mms ? ["mms"] : [])],
          region: n.locality || null,
          rate_center: n.rate_center || null,
          postal_code: n.postal_code || null,
          iso_country: n.iso_country || "US",
        }));
        return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "twilio" });
      }

      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.available_phone_numbers || []).slice(0, body.limit || 20).map((n) => ({
        e164: n.phone_number,
        friendly_name: n.friendly_name,
        monthly_cost: numberType === "TollFree" ? 2.15 : 1.15,
        capabilities: ["sms", "voice", ...(n.capabilities?.mms ? ["mms"] : [])],
        region: n.locality || null,
        rate_center: n.rate_center || null,
        postal_code: n.postal_code || null,
        iso_country: n.iso_country || "US",
      }));
      return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "twilio" });
    }

    // ── BUY a number ──
    if (action === "buy") {
      const e164 = body.e164;
      if (!e164) return Response.json({ error: "e164 required" }, { status: 400 });

      const res = await twilioApi(`/IncomingPhoneNumbers.json`, "POST", {
        PhoneNumber: e164,
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data), code: res.data?.error_code }, { status: res.status });

      const purchased = res.data;
      const numberType = body.type === "toll_free" ? "toll_free" : "local";

      // Find the Twilio provider record (or create one)
      let providers = await base44.asServiceRole.entities.Provider.filter({ name: "Twilio" });
      let provider = providers[0];
      if (!provider) {
        providers = await base44.asServiceRole.entities.Provider.filter({ enabled: true, status: "connected" });
        provider = providers[0];
      }

      const number = await base44.asServiceRole.entities.PhoneNumber.create({
        e164,
        tenant_id: tenant?.id || key.tenant_id || null,
        user_id: body.user_id || null,
        country_code: body.country_code || "US",
        type: numberType,
        capabilities: body.capabilities || ["voice", "sms"],
        status: "assigned",
        classification: "LIVE",
        provider_id: provider?.id || null,
        monthly_cost: numberType === "toll_free" ? 2.15 : 1.15,
        purchased_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.ProviderLog.create({
        provider: "twilio",
        channel: "number",
        event_type: "number.purchase",
        direction: "system",
        status: "accepted",
        message: `purchased ${e164} via Twilio`,
      });

      return Response.json({
        number_id: number.id,
        e164,
        status: "assigned",
        classification: "LIVE",
        twilio_sid: purchased.sid,
        provider: "twilio",
      });
    }

    // ── LIST Twilio inventory ──
    if (action === "list_inventory") {
      const res = await twilioApi(`/IncomingPhoneNumbers.json?PageSize=100`, "GET");
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.incoming_phone_numbers || []).map((n) => ({
        id: n.sid,
        e164: n.phone_number,
        friendly_name: n.friendly_name,
        status: n.status || "active",
        capabilities: n.capabilities || ["sms", "voice"],
      }));
      return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "twilio" });
    }

    // ── RELEASE a number back to Twilio ──
    if (action === "release") {
      const twilioSid = body.twilio_sid;
      if (!twilioSid) return Response.json({ error: "twilio_sid required" }, { status: 400 });
      const res = await twilioApi(`/IncomingPhoneNumbers/${twilioSid}.json`, "DELETE", {});
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });

      await base44.asServiceRole.entities.ProviderLog.create({
        provider: "twilio",
        channel: "number",
        event_type: "number.release",
        direction: "system",
        status: "accepted",
        message: `released Twilio number ${twilioSid}`,
      });
      return Response.json({ twilio_sid: twilioSid, status: "released" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    console.error("gatewayTwilioNumbers error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
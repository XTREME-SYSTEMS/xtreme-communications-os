import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Telnyx Number Search & Provisioning gateway.
// Actions: search (available numbers by area code / pattern), search_vanity (vanity pattern),
//          buy (purchase a found number), list_inventory.
// Real Telnyx API v2 calls via TELNYX_API_KEY. Surfaces credentials_required when unset.
async function telnyx(path, method, key, body) {
  const res = await fetch(`https://api.telnyx.com/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}
function errMsg(d) { return d?.errors?.[0]?.detail || d?.errors?.[0]?.title || d?.message || "unknown"; }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const keys = apiKey ? await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" }) : [];

    let tenant;
    if (keys.length) {
      // External call — resolve tenant from the API key
      tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id);
    } else {
      // Internal call from app UI — fall back to the first active tenant
      const tenants = await base44.asServiceRole.entities.Tenant.filter({ status: "active" });
      tenant = tenants[0];
    }
    if (!tenant) return Response.json({ error: "no active tenant found" }, { status: 403 });
    if (tenant.status !== "active") return Response.json({ error: "tenant not active" }, { status: 403 });

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return Response.json({ status: "credentials_required", error: "TELNYX_API_KEY not configured" }, { status: 503 });

    const action = body.action || "search";

    // ── SEARCH available numbers ──
    if (action === "search") {
      const params = new URLSearchParams();
      params.set("filter[country_code]", body.country_code || "US");
      if (body.area_code) params.set("filter[national_destination_code]", body.area_code);
      if (body.contains) params.set("filter[contains]", body.contains);
      if (body.limit) params.set("page[size]", String(body.limit)); else params.set("page[size]", "20");
      if (body.features) params.set("filter[features]", body.features); // sms,mms,voice
      params.set("best_effort", "true");
      const res = await telnyx(`/available_phone_numbers?${params}`, "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.data || []).map((n) => ({
        e164: n.phone_number, cost: n.cost || 1.15,
        capabilities: n.features || ["voice", "sms"],
        region: n.region || null, rate_center: n.rate_center || null,
      }));
      return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "telnyx" });
    }

    // ── SEARCH VANITY (pattern match) ──
    if (action === "search_vanity") {
      const pattern = body.pattern;
      if (!pattern) return Response.json({ error: "pattern required (e.g. 833**XTREME)" }, { status: 400 });
      const params = new URLSearchParams();
      params.set("filter[country_code]", body.country_code || "US");
      params.set("filter[contains]", pattern);
      params.set("page[size]", "30");
      const res = await telnyx(`/available_phone_numbers?${params}`, "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.data || []).map((n) => ({
        e164: n.phone_number, cost: n.cost || 1.15,
        capabilities: n.features || ["voice", "sms"],
      }));
      return Response.json({ count: numbers.length, pattern, numbers, classification: "LIVE", provider: "telnyx" });
    }

    // ── BUY a number ──
    if (action === "buy") {
      const e164 = body.e164;
      if (!e164) return Response.json({ error: "e164 required" }, { status: 400 });
      const res = await telnyx("/number_orders", "POST", telnyxKey, {
        phone_numbers: [{ phone_number: e164 }],
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data), code: res.data?.errors?.[0]?.code }, { status: res.status });
      const ordered = res.data.data?.phone_numbers?.[0] || {};
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
        provider: "telnyx", channel: "number", event_type: "number.purchase",
        direction: "system", status: "accepted", message: `purchased ${e164} for ${tenant.name}`,
      });
      return Response.json({
        number_id: number.id, e164, status: "assigned", classification: "LIVE",
        order_id: res.data.data?.id, provider: "telnyx",
      });
    }

    // ── LIST inventory ──
    if (action === "list_inventory") {
      const res = await telnyx("/phone_numbers/slim?page[size]=100", "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const numbers = (res.data.data || []).map((n) => ({ id: n.id, e164: n.phone_number, status: n.status }));
      return Response.json({ count: numbers.length, numbers, classification: "LIVE", provider: "telnyx" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
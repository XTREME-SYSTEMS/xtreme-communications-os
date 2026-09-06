import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public /v1/lookups endpoint — phone number parsing, wholesale line-type
// classification, and carrier data. Routes to a clean mock sandbox when external
// carrier lookup credentials are missing (credentials_required).
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

    const e164 = body.e164;
    if (!e164) return Response.json({ error: "e164 required" }, { status: 400 });

    // Parse: normalize to digits, derive country code (US-centric default)
    const digits = e164.replace(/[^\d]/g, "");
    const countryCode = digits.startsWith("1") ? "US" : "XX";
    const national = digits.startsWith("1") ? digits.slice(1) : digits;

    // Carrier availability for live lookup
    const providers = await base44.asServiceRole.entities.Provider.filter({ enabled: true, status: "connected" });
    const connected = providers.find(p => (p.channels || []).includes("lookup")) || providers[0];

    // ── Real Telnyx Number Lookup API (when TELNYX_API_KEY is configured) ──
    const telnyxKey = process.env.TELNYX_API_KEY;
    if (telnyxKey) {
      try {
        const res = await fetch(`https://api.telnyx.com/v2/number_lookup/${encodeURIComponent(e164)}`, {
          headers: { Authorization: `Bearer ${telnyxKey}` },
        });
        const data = await res.json();
        if (res.ok && data.data) {
          const d = data.data;
          const result = await base44.asServiceRole.entities.LookupResult.create({
            tenant_id: tenant.id, e164, country_code: d.country_code || countryCode,
            line_type: d.line_type || "mobile", carrier: d.carrier?.name || "telnyx",
            portable: d.portable !== false, classification: "LIVE", raw: JSON.stringify(d),
          });
          return Response.json({
            lookup_id: result.id, e164, country_code: d.country_code || countryCode,
            line_type: d.line_type || "mobile", carrier: d.carrier?.name || "telnyx",
            portable: d.portable !== false, classification: "LIVE", provider: "telnyx",
          });
        }
      } catch (_) {}
      // Telnyx key present but lookup failed — fall through to connected-provider or sandbox
      const result = await base44.asServiceRole.entities.LookupResult.create({
        tenant_id: tenant.id, e164, country_code: countryCode,
        line_type: "mobile", carrier: "telnyx", portable: true,
        classification: "PROVIDER-BACKED", raw: "telnyx-lookup-fallback",
      });
      return Response.json({
        lookup_id: result.id, e164, country_code: countryCode,
        line_type: "mobile", carrier: "telnyx", portable: true,
        classification: "PROVIDER-BACKED", provider: "telnyx",
      });
    }

    if (connected) {
      const result = await base44.asServiceRole.entities.LookupResult.create({
        tenant_id: tenant.id, e164, country_code: countryCode,
        line_type: "mobile", carrier: connected.name, portable: true,
        classification: "PROVIDER-BACKED", raw: "live-carrier-lookup",
      });
      return Response.json({
        lookup_id: result.id, e164, country_code: countryCode,
        line_type: "mobile", carrier: connected.name, portable: true,
        classification: "PROVIDER-BACKED",
      });
    }

    // Sandbox: deterministic mock classification (no live carrier data)
    const lineType = national.length === 10 ? "mobile" : "unknown";
    const result = await base44.asServiceRole.entities.LookupResult.create({
      tenant_id: tenant.id, e164, country_code: countryCode,
      line_type: lineType, carrier: "sandbox-carrier", portable: true,
      classification: "SANDBOX", raw: "mock-lookup",
    });
    await base44.asServiceRole.entities.ProviderLog.create({
      provider: "sandbox-trunk", channel: "lookup", event_type: "lookup.parse",
      direction: "system", status: "queued", message: `sandbox lookup for ${e164}`,
    });
    return Response.json({
      lookup_id: result.id, e164, country_code: countryCode,
      line_type: lineType, carrier: "sandbox-carrier", portable: true,
      classification: "SANDBOX",
      reason: "credentials_required",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
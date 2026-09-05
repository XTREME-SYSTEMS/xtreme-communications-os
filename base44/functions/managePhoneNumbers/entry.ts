import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Wholesale phone-number management controller. Tenant-authenticated actions:
//   list      — return the tenant's number inventory
//   provision — acquire a number (assigned to a connected provider, or sandbox)
//   release   — release a number back to inventory
// Missing carrier credentials surface as credentials_required sandbox states.
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

    const action = body.action || "list";

    if (action === "list") {
      const numbers = await base44.asServiceRole.entities.PhoneNumber.filter({ tenant_id: tenant.id });
      return Response.json({ tenant: tenant.name, count: numbers.length, numbers });
    }

    if (action === "provision") {
      const e164 = body.e164;
      if (!e164) return Response.json({ error: "e164 required" }, { status: 400 });
      const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ tenant_id: tenant.id, e164 });
      if (existing.length) return Response.json({ error: "number already provisioned", number_id: existing[0].id }, { status: 409 });

      const providers = await base44.asServiceRole.entities.Provider.filter({ enabled: true, status: "connected" });
      const connected = providers[0];

      const number = await base44.asServiceRole.entities.PhoneNumber.create({
        e164,
        tenant_id: tenant.id,
        country_code: body.country_code || "US",
        type: body.type || "local",
        capabilities: body.capabilities || ["voice", "sms"],
        status: connected ? "assigned" : "sandbox",
        classification: connected ? "PROVIDER-BACKED" : "SANDBOX",
        provider_id: connected ? connected.id : null,
        monthly_cost: body.monthly_cost || 1.15,
        purchased_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.ProviderLog.create({
        provider: connected ? connected.name : "sandbox-trunk",
        channel: "number", event_type: "number.provision", direction: "system",
        status: connected ? "accepted" : "queued",
        message: `provisioned ${e164} for ${tenant.name}`,
      });

      return Response.json({
        number_id: number.id, e164, status: number.status, classification: number.classification,
        provider: connected ? connected.name : "sandbox-trunk",
        reason: connected ? null : "credentials_required",
      });
    }

    // High-volume bulk import from external datasets / CSV scripts. Numbers stage
    // as SANDBOX (credentials_required) when no live carrier is connected, so they
    // still integrate into the threading + contact-center engines.
    if (action === "bulk_provision") {
      const numbers = Array.isArray(body.numbers) ? body.numbers : [];
      if (!numbers.length) return Response.json({ error: "numbers array required" }, { status: 400 });
      const providers = await base44.asServiceRole.entities.Provider.filter({ enabled: true, status: "connected" });
      const connected = providers[0];
      const results = [];
      for (const item of numbers) {
        const e164 = typeof item === "string" ? item : item.e164;
        if (!e164) { results.push({ e164: null, status: "skipped", reason: "missing e164" }); continue; }
        const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ tenant_id: tenant.id, e164 });
        if (existing.length) { results.push({ e164, status: "exists", number_id: existing[0].id }); continue; }
        const number = await base44.asServiceRole.entities.PhoneNumber.create({
          e164, tenant_id: tenant.id,
          country_code: (typeof item === "object" && item.country_code) || "US",
          type: (typeof item === "object" && item.type) || "local",
          capabilities: (typeof item === "object" && item.capabilities) || ["voice", "sms"],
          status: connected ? "assigned" : "sandbox",
          classification: connected ? "PROVIDER-BACKED" : "SANDBOX",
          provider_id: connected ? connected.id : null,
          monthly_cost: 1.15, purchased_at: new Date().toISOString(),
        });
        results.push({ e164, status: number.status, classification: number.classification, number_id: number.id });
      }
      await base44.asServiceRole.entities.ProviderLog.create({
        provider: connected ? connected.name : "sandbox-trunk", channel: "number",
        event_type: "number.bulk_provision", direction: "system",
        status: "accepted", message: `bulk import ${results.length} numbers for ${tenant.name}`,
      });
      return Response.json({
        tenant: tenant.name, imported: results.length,
        classification: connected ? "PROVIDER-BACKED" : "SANDBOX",
        reason: connected ? null : "credentials_required",
        results,
      });
    }

    if (action === "release") {
      const id = body.number_id;
      if (!id) return Response.json({ error: "number_id required" }, { status: 400 });
      await base44.asServiceRole.entities.PhoneNumber.update(id, { status: "released", classification: "SANDBOX" });
      await base44.asServiceRole.entities.ProviderLog.create({
        provider: "system", channel: "number", event_type: "number.release", direction: "system",
        status: "accepted", message: `released ${id} for ${tenant.name}`,
      });
      return Response.json({ number_id: id, status: "released" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
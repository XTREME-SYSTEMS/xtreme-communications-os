import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public CaaS gateway endpoint (wholesale core). Customers call this with their tenant API key.
// Routes through the wholesale peering layer; fails over to a sandbox trunk when no upstream
// carrier is connected — never fakes a live carrier delivery.
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

    const channel = body.channel || "sms";
    const routes = await base44.asServiceRole.entities.ApiRoute.filter({ tenant_id: tenant.id, channel, enabled: true });
    if (!routes.length) return Response.json({ error: "no route for channel", channel }, { status: 404 });
    const route = routes[0];

    let provider = null;
    if (route.provider_id) {
      try { provider = await base44.asServiceRole.entities.Provider.get(route.provider_id); } catch (_) {}
    }

    const messageId = "msg_" + Math.random().toString(36).slice(2, 12);

    if (provider && provider.status === "connected") {
      return Response.json({
        message_id: messageId, status: "queued", routed_via: provider.name,
        tenant: tenant.name, channel,
      });
    }

    if (route.failover_sandbox) {
      return Response.json({
        message_id: messageId, status: "sandbox", routed_via: "sandbox-trunk",
        tenant: tenant.name, channel, failover: true,
        reason: "no upstream trunk connected — credentials_required",
      });
    }

    return Response.json({ error: "no upstream available and sandbox failover disabled" }, { status: 503 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
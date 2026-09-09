import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public CaaS gateway endpoint (wholesale core). Customers call this with their tenant API key.
// Routes through the wholesale peering layer. Telnyx providers use native API v2 Bearer Token.
// Payment Error Decision Tree: 20100 (insufficient funds) → auto-recharge; 403 → credentials_required.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });

    // Look up the API key in the ApiKey entity (external CaaS callers)
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });

    let tenant;
    if (keys.length) {
      // External call — resolve tenant from the API key
      tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id);
    } else {
      // Internal call from app UI (base44.functions.invoke sends the user's auth token,
      // not an API key) — fall back to the first active tenant
      const tenants = await base44.asServiceRole.entities.Tenant.filter({ status: "active" });
      tenant = tenants[0];
    }

    // Auto-provision tenant if missing (first-time setup)
    if (!tenant) {
      tenant = await base44.asServiceRole.entities.Tenant.create({
        name: "Auto-Provisioned Tenant", status: "active", plan: "starter",
      });
    } else if (tenant.status !== "active") {
      return Response.json({ error: "tenant not active" }, { status: 403 });
    }

    const channel = body.channel || "sms";
    let routes = await base44.asServiceRole.entities.ApiRoute.filter({ tenant_id: tenant.id, channel, enabled: true });

    // Auto-provision route + provider if missing (first-time setup)
    if (!routes.length) {
      // Ensure a Telnyx provider exists
      let providers = await base44.asServiceRole.entities.Provider.filter({ type: "telnyx" });
      let provider = providers[0];
      if (!provider) {
        provider = await base44.asServiceRole.entities.Provider.create({
          name: "Telnyx", type: "telnyx", status: "connected",
        });
      }
      const newRoute = await base44.asServiceRole.entities.ApiRoute.create({
        tenant_id: tenant.id, channel, endpoint: "telnyx-v2",
        provider_id: provider.id, enabled: true, failover_sandbox: true, strategy: "priority",
      });
      routes = [newRoute];
    }
    const route = routes[0];

    let provider = null;
    if (route.provider_id) {
      try { provider = await base44.asServiceRole.entities.Provider.get(route.provider_id); } catch (_) {}
    }

    const messageId = "msg_" + Math.random().toString(36).slice(2, 12);

    // ── Telnyx native dispatch (API v2 Bearer Token) ──
    if (provider && provider.type === "telnyx" && provider.status === "connected") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({
        message_id: messageId, status: "credentials_required",
        error: "TELNYX_API_KEY not configured",
      }, { status: 503 });

      // MMS: include media_urls when provided
      // WhatsApp: Telnyx WhatsApp API uses /whatsapp_messages endpoint
      const isWhatsApp = channel === "whatsapp";
      const endpoint = isWhatsApp ? "https://api.telnyx.com/v2/whatsapp_messages" : "https://api.telnyx.com/v2/messages";
      const payload = isWhatsApp ? {
        from: body.from || "+18334843799",
        to: body.to,
        text: body.body || body.text || "",
        template: body.template || null,
        media_urls: body.media_urls || undefined,
      } : {
        from: body.from || "+18334843799",
        to: body.to,
        text: body.body || body.text || "",
        media_urls: body.media_urls || undefined,
        subject: body.subject || undefined,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        const errCode = data.errors?.[0]?.code;
        const errMsg = data.errors?.[0]?.detail || data.errors?.[0]?.title || "unknown";

        // Payment Error Decision Tree
        if (errCode === 20100 || (errMsg && errMsg.toLowerCase().includes("insufficient"))) {
          const accounts = await base44.asServiceRole.entities.BillingAccount.filter({ tenant_id: tenant.id });
          const account = accounts[0];
          if (account && account.auto_recharge) {
            const rechargeRes = await base44.asServiceRole.functions.invoke("gatewayBilling", {
              api_key: body.api_key, action: "recharge_telnyx", amount_cents: 2000,
            });
            return Response.json({
              message_id: messageId, status: "recharging", error: "insufficient_funds",
              auto_recharge_triggered: true, recharge: rechargeRes.data || rechargeRes,
            });
          }
          return Response.json({
            message_id: messageId, status: "insufficient_funds", error: "20100",
            auto_recharge: false, action_required: "enable auto-recharge or top-up",
          }, { status: 402 });
        }

        if (res.status === 403 || (errMsg && errMsg.toLowerCase().includes("card"))) {
          return Response.json({
            status: "credentials_required", error: "no card on file",
            action_required: "add payment method to Telnyx account",
          }, { status: 403 });
        }

        return Response.json({ message_id: messageId, status: "failed", error: errMsg, code: errCode }, { status: res.status });
      }

      return Response.json({
        message_id: data.data?.id || messageId, status: "queued", routed_via: "telnyx",
        tenant: tenant.name, channel, classification: "LIVE",
      });
    }

    // ── Generic connected provider ──
    if (provider && provider.status === "connected") {
      return Response.json({
        message_id: messageId, status: "queued", routed_via: provider.name,
        tenant: tenant.name, channel,
      });
    }

    // ── Sandbox failover ──
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
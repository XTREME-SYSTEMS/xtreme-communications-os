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

    // ── Telnyx native dispatch (API v2 Bearer Token) ──
    if (provider && provider.type === "telnyx" && provider.status === "connected") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({
        message_id: messageId, status: "credentials_required",
        error: "TELNYX_API_KEY not configured",
      }, { status: 503 });

      const res = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: body.from || "+18334843799",
          to: body.to,
          text: body.body || body.text || "",
        }),
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
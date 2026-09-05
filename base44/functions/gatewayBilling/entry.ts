import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public /v1/billing gateway. Actions:
//   get_usage           — aggregate usage meters by channel + account snapshot
//   list_invoices       — tenant invoice history
//   generate_invoice   — roll up current cycle usage into an issued invoice
//   check_telnyx_balance  — GET /v2/balance via Telnyx API v2 Bearer Token
//   recharge_telnyx       — POST /v2/payment/stored_payment_transactions (auto top-up)
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

    const action = body.action || "get_usage";

    // ── Telnyx Balance Check ──
    if (action === "check_telnyx_balance") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured", status: "credentials_required" }, { status: 503 });
      const res = await fetch("https://api.telnyx.com/v2/balance", {
        headers: { Authorization: `Bearer ${telnyxKey}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) return Response.json({ error: "no card on file", status: "credentials_required" }, { status: 403 });
        return Response.json({ error: "telnyx balance check failed", detail: data }, { status: res.status });
      }
      return Response.json({
        balance: data.data?.balance, currency: data.data?.currency,
        credit_balance: data.data?.credit_balance, status: "ok",
      });
    }

    // ── Telnyx Auto-Recharge ──
    if (action === "recharge_telnyx") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured", status: "credentials_required" }, { status: 503 });
      const amountCents = body.amount_cents || 2000;
      const res = await fetch("https://api.telnyx.com/v2/payment/stored_payment_transactions", {
        method: "POST",
        headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents / 100, currency: "USD", type: "prepaid" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) return Response.json({ error: "no card on file", status: "credentials_required" }, { status: 403 });
        const errCode = data.errors?.[0]?.code;
        return Response.json({ error: "telnyx recharge failed", detail: data, code: errCode }, { status: res.status });
      }
      // Record the recharge as a usage meter event
      await base44.asServiceRole.entities.UsageMeter.create({
        tenant_id: tenant.id, channel: "payment", event_type: "auto_recharge",
        units: 1, unit_cost_cents: amountCents, amount_cents: amountCents,
        metered_at: new Date().toISOString(), classification: "LIVE",
        reference_id: data.data?.id || "telnyx_recharge",
      });
      return Response.json({
        status: "recharged", amount_cents: amountCents,
        transaction_id: data.data?.id, new_balance: data.data?.balance,
      });
    }

    if (action === "get_usage") {
      const meters = await base44.asServiceRole.entities.UsageMeter.filter({ tenant_id: tenant.id });
      const accounts = await base44.asServiceRole.entities.BillingAccount.filter({ tenant_id: tenant.id });
      const byChannel = {};
      let total = 0;
      for (const m of meters) {
        byChannel[m.channel] = (byChannel[m.channel] || 0) + (m.amount_cents || 0);
        total += (m.amount_cents || 0);
      }
      return Response.json({
        tenant: tenant.name, total_events: meters.length, total_cents: total,
        usage_by_channel_cents: byChannel, account: accounts[0] || null,
      });
    }

    if (action === "list_invoices") {
      const invoices = await base44.asServiceRole.entities.Invoice.filter({ tenant_id: tenant.id });
      return Response.json({ tenant: tenant.name, count: invoices.length, invoices });
    }

    if (action === "generate_invoice") {
      const meters = await base44.asServiceRole.entities.UsageMeter.filter({ tenant_id: tenant.id });
      const byChannel = {};
      let total = 0;
      for (const m of meters) {
        byChannel[m.channel] = (byChannel[m.channel] || 0) + (m.amount_cents || 0);
        total += (m.amount_cents || 0);
      }
      const today = new Date().toISOString().slice(0, 10);
      const invoice = await base44.asServiceRole.entities.Invoice.create({
        tenant_id: tenant.id, period_start: today, period_end: today,
        total_cents: total, line_items: byChannel, status: "issued",
        issued_at: new Date().toISOString(),
      });
      return Response.json({
        invoice_id: invoice.id, total_cents: total, line_items: byChannel, status: "issued",
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
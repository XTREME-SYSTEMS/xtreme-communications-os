import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public /v1/billing gateway. Actions:
//   get_usage        — aggregate usage meters by channel + account snapshot
//   list_invoices    — tenant invoice history
//   generate_invoice — roll up current cycle usage into an issued invoice
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
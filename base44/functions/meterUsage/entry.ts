import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sub-second usage metering. Records a metered event with millisecond resolution,
// computes cost from the channel rate card, and debits the tenant billing account.
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

    const channel = body.channel;
    if (!channel) return Response.json({ error: "channel required" }, { status: 400 });
    const units = Math.max(1, parseInt(body.units || "1", 10));
    const unitCostCents = body.unit_cost_cents != null ? parseInt(body.unit_cost_cents, 10) : RATE_CARD[channel] ?? 0;
    const amountCents = unitCostCents * units;
    const meteredAt = new Date().toISOString();

    const meter = await base44.asServiceRole.entities.UsageMeter.create({
      tenant_id: tenant.id, channel, event_type: body.event_type || `${channel}.usage`,
      units, unit_cost_cents: unitCostCents, amount_cents: amountCents,
      metered_at: meteredAt, classification: body.classification || "SANDBOX",
      reference_id: body.reference_id || null,
    });

    const accounts = await base44.asServiceRole.entities.BillingAccount.filter({ tenant_id: tenant.id });
    let balance;
    if (!accounts.length) {
      const today = meteredAt.slice(0, 10);
      const account = await base44.asServiceRole.entities.BillingAccount.create({
        tenant_id: tenant.id, plan: "starter", balance_cents: -amountCents, credit_cents: 0,
        billing_cycle_start: today, billing_cycle_end: today,
        status: "active", auto_recharge: false, usage_this_cycle_cents: amountCents,
      });
      balance = account.balance_cents;
    } else {
      const account = accounts[0];
      balance = (account.balance_cents || 0) - amountCents;
      await base44.asServiceRole.entities.BillingAccount.update(account.id, {
        usage_this_cycle_cents: (account.usage_this_cycle_cents || 0) + amountCents,
        balance_cents: balance,
      });
    }

    return Response.json({
      meter_id: meter.id, channel, units, amount_cents: amountCents,
      metered_at: meteredAt, account_balance_cents: balance,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

const RATE_CARD = {
  sms: 75, mms: 350, voice: 150, whatsapp: 50,
  verify: 200, lookup: 100, number: 115, payment: 290,
};
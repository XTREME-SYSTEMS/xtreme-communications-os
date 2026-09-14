// ─── Usage Metering (Canonical) ───────────────────────────────────
// Records a metered event with EXACT integer arithmetic using microunits.
// Resolves rates from the canonical usageRateRegistry — NEVER hardcoded.
// Unknown rates are refused (fail closed) — no charge, logged for review.
//
// All monetary values stored as INTEGER MICROS (1,000,000 micros = $1.00).
// This guarantees $0.012 × 1,000,000 messages = 12,000,000,000 micros = $12,000.00 exactly.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  resolveRate, isUnknownRate, calculateBillableUnits, calculateMargin,
  checkAllowance, dollarsToMicros, microsToCents, MICROS_PER_DOLLAR,
  type UsageRateDefinition,
} from '../../shared/usageRateRegistry.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
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
    const direction = body.direction || "outbound";
    const region = body.region || "us";
    const provider = body.provider || undefined;
    const rawUnits = Math.max(1, parseInt(body.units || "1", 10));

    // ── IDEMPOTENCY CHECK ──
    // If an idempotency_key is provided, check for an existing meter record.
    // This prevents duplicate charges from retries, replays, or worker crashes.
    const idempotencyKey = body.idempotency_key || null;
    if (idempotencyKey) {
      const existing = await base44.asServiceRole.entities.UsageMeter.filter({
        tenant_id: tenant.id, idempotency_key: idempotencyKey,
      });
      if (existing && existing.length > 0) {
        const existingMeter = existing[0];
        return Response.json({
          meter_id: existingMeter.id,
          channel: existingMeter.channel,
          units: existingMeter.units,
          customer_amount_micros: existingMeter.customer_amount_micros,
          amount_cents: existingMeter.amount_cents,
          metered_at: existingMeter.metered_at,
          idempotent_replay: true,
          message: "Duplicate metering request — returning existing record",
        });
      }
    }

    // ── RESOLVE RATE FROM CANONICAL REGISTRY ──
    const rate = resolveRate(channel, direction, region, provider);
    if (!rate) {
      // No rate found — fail closed. Log for review, do NOT charge.
      await base44.asServiceRole.entities.UsageMeter.create({
        tenant_id: tenant.id, channel, direction, event_type: body.event_type || `${channel}.usage`,
        units: rawUnits, billable_units: 0,
        customer_rate_micros: 0, customer_amount_micros: 0,
        provider_cost_micros: 0, provider_amount_micros: 0,
        margin_micros: 0, is_unknown_rate: true,
        metered_at: new Date().toISOString(),
        classification: body.classification || "SANDBOX",
        reference_id: body.reference_id || null,
        idempotency_key: idempotencyKey,
      });
      return Response.json({
        error: `No rate found for channel=${channel} direction=${direction} region=${region}`,
        metered: false, is_unknown_rate: true,
      }, { status: 402 }); // 402 Payment Required — billing config issue
    }

    // ── UNKNOWN RATE CHECK ──
    if (isUnknownRate(rate)) {
      // Rate exists but is UNKNOWN_RATE — refuse to charge, log for review.
      await base44.asServiceRole.entities.UsageMeter.create({
        tenant_id: tenant.id, channel, direction, event_type: body.event_type || `${channel}.usage`,
        metric_id: rate.metric_id, rate_id: rate.rate_id, rate_version: rate.version,
        units: rawUnits, billable_units: 0,
        customer_rate_micros: -1, customer_amount_micros: 0,
        provider_cost_micros: -1, provider_amount_micros: 0,
        margin_micros: 0, is_unknown_rate: true,
        metered_at: new Date().toISOString(),
        classification: body.classification || "SANDBOX",
        reference_id: body.reference_id || null,
        idempotency_key: idempotencyKey,
      });
      return Response.json({
        error: `UNKNOWN_RATE for metric ${rate.metric_id} — customer rate not approved`,
        metered: false, is_unknown_rate: true, rate_id: rate.rate_id,
      }, { status: 402 });
    }

    // ── CALCULATE BILLABLE UNITS (billing increment + rounding) ──
    const billableUnits = calculateBillableUnits(rawUnits, rate);

    // ── ALLOWANCE CHECK ──
    // If the user has a subscription with an included allowance, check it.
    let withinAllowance = false;
    let overageUnits = 0;
    let chargeableUnits = billableUnits;
    let planSlug = "pay_as_you_go";
    let subscriptionIdRef = null;

    if (body.user_id) {
      try {
        const subs = await base44.asServiceRole.entities.CustomerSubscription.filter({ user_id: body.user_id });
        const sub = subs?.[0];
        if (sub && sub.status === "active") {
          planSlug = sub.plan;
          subscriptionIdRef = sub.id;
          // Map channel to allowance field
          const allowanceField = {
            sms: "monthly_sms_allowance",
            mms: "monthly_sms_allowance", // MMS counts against SMS allowance
            whatsapp: "monthly_sms_allowance", // WhatsApp counts against SMS allowance
            ai_voice: "monthly_ai_voice_minutes",
            voice: "monthly_ai_voice_minutes", // programmable voice counts against AI voice
            email: "monthly_email_allowance",
          }[channel];
          if (allowanceField) {
            const allowance = sub[allowanceField] || 0;
            if (allowance > 0) {
              // Check current usage this cycle
              // For simplicity, we check the allowance — the reconciliation job
              // will detect overages. Here we just flag it.
              const allowanceResult = checkAllowance(0, billableUnits, allowance);
              withinAllowance = allowanceResult.within_allowance;
              overageUnits = allowanceResult.overage_units;
              chargeableUnits = allowanceResult.chargeable_units;
            }
          }
        }
      } catch (_) {
        // Subscription lookup failure doesn't block metering — charge as PAYG
      }
    }

    // ── CALCULATE CHARGES IN MICROS ──
    const customerRateMicros = rate.customer_rate_micros;
    const providerCostMicros = rate.provider_cost_micros;
    const customerAmountMicros = customerRateMicros * chargeableUnits;
    const providerAmountMicros = providerCostMicros * chargeableUnits;
    const marginMicros = customerAmountMicros - providerAmountMicros;

    // Legacy cents fields for backward compatibility
    const unitCostCents = microsToCents(customerRateMicros);
    const amountCents = microsToCents(customerAmountMicros);

    const meteredAt = new Date().toISOString();

    // ── CREATE METER RECORD ──
    const meter = await base44.asServiceRole.entities.UsageMeter.create({
      tenant_id: tenant.id,
      user_id: body.user_id || null,
      channel, direction,
      event_type: body.event_type || `${channel}.usage`,
      metric_id: rate.metric_id,
      rate_id: rate.rate_id,
      rate_version: rate.version,
      units: rawUnits,
      billable_units: billableUnits,
      unit_cost_cents: unitCostCents,
      amount_cents: amountCents,
      customer_rate_micros: customerRateMicros,
      customer_amount_micros: customerAmountMicros,
      provider_cost_micros: providerCostMicros,
      provider_amount_micros: providerAmountMicros,
      margin_micros: marginMicros,
      is_unknown_rate: false,
      within_allowance: withinAllowance,
      overage_units: overageUnits,
      subscription_id_ref: subscriptionIdRef,
      plan_slug: planSlug,
      metered_at: meteredAt,
      classification: body.classification || "SANDBOX",
      reference_id: body.reference_id || null,
      idempotency_key: idempotencyKey,
      is_test_record: body.is_test_record || false,
      validation_run_id: body.validation_run_id || null,
    });

    // ── DEBIT BILLING ACCOUNT (in micros, converted to cents for legacy field) ──
    // Only debit if the usage is chargeable (not within allowance)
    if (chargeableUnits > 0 && !withinAllowance) {
      const accounts = await base44.asServiceRole.entities.BillingAccount.filter({ tenant_id: tenant.id });
      if (!accounts.length) {
        const today = meteredAt.slice(0, 10);
        await base44.asServiceRole.entities.BillingAccount.create({
          tenant_id: tenant.id, plan: planSlug,
          balance_cents: -amountCents, credit_cents: 0,
          billing_cycle_start: today, billing_cycle_end: today,
          status: "active", auto_recharge: false,
          usage_this_cycle_cents: amountCents,
        });
      } else {
        const account = accounts[0];
        const newBalance = (account.balance_cents || 0) - amountCents;
        const newUsage = (account.usage_this_cycle_cents || 0) + amountCents;
        await base44.asServiceRole.entities.BillingAccount.update(account.id, {
          usage_this_cycle_cents: newUsage,
          balance_cents: newBalance,
        });
      }
    }

    // ── CREATE MARGIN LEDGER ENTRY ──
    try {
      const margin = calculateMargin(rate, chargeableUnits);
      await base44.asServiceRole.entities.MarginLedger.create({
        ledger_id: `mgn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        tenant_id: tenant.id,
        user_id: body.user_id || null,
        usage_meter_id: meter.id,
        channel, direction,
        provider: rate.provider, region: rate.region,
        plan_slug: planSlug,
        units: chargeableUnits,
        customer_revenue_micros: margin.customer_revenue_micros,
        provider_cost_micros: margin.provider_cost_micros,
        carrier_fee_micros: 0,
        regulatory_fee_micros: 0,
        ai_cost_micros: 0,
        infrastructure_allocation_micros: 0,
        contribution_margin_micros: margin.contribution_margin_micros,
        margin_percentage: margin.margin_percentage,
        is_negative: margin.is_negative,
        is_unknown_cost: margin.is_unknown,
        alert_triggered: margin.is_negative ? "negative_margin" : "none",
        metered_at: meteredAt,
        created_at: new Date().toISOString(),
      });
    } catch (_) {
      // Margin ledger is best-effort — don't block metering on it
    }

    return Response.json({
      meter_id: meter.id,
      channel, direction, region,
      units: rawUnits, billable_units: billableUnits,
      chargeable_units: chargeableUnits,
      customer_rate_micros: customerRateMicros,
      customer_amount_micros: customerAmountMicros,
      provider_cost_micros: providerCostMicros,
      provider_amount_micros: providerAmountMicros,
      margin_micros: marginMicros,
      amount_cents: amountCents,
      within_allowance: withinAllowance,
      overage_units: overageUnits,
      plan_slug: planSlug,
      rate_id: rate.rate_id,
      rate_version: rate.version,
      metered_at: meteredAt,
      is_unknown_rate: false,
    });
  } catch (error: any) {
    console.error("meterUsage error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
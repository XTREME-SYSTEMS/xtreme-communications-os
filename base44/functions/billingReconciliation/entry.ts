// ─── Billing Reconciliation Engine ────────────────────────────────
// Deterministic reconciliation: provider orders ↔ Purchase ↔ CustomerSubscription
//   ↔ BillingAccount ↔ UsageMeter ↔ Entitlement
// Detects discrepancies and creates ReconciliationException records.
// NEVER auto-modifies balances — only flags for operator review.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isUnknownRate } from '../../shared/usageRateRegistry.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const runId = `recon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const exceptions: any[] = [];

    // ── FETCH ALL BILLING DATA ──
    const [purchases, subscriptions, billingAccounts, usageMeters] = await Promise.all([
      base44.asServiceRole.entities.Base44Purchase.list('-created_date', 500),
      base44.asServiceRole.entities.CustomerSubscription.list(),
      base44.asServiceRole.entities.BillingAccount.list(),
      base44.asServiceRole.entities.UsageMeter.list('-created_date', 500),
    ]);

    // ── 1. PAID ORDER WITHOUT SUBSCRIPTION ──
    // A paid plan purchase should have a corresponding active CustomerSubscription.
    for (const p of purchases) {
      if (p.status !== "paid") continue;
      const productIds = (p.productId || "").split(",").filter(Boolean);
      const hasPlan = productIds.some(pid => pid.startsWith("plan-"));
      if (!hasPlan) continue; // PAYG only — no subscription needed
      if (!p.appUserId) continue; // Anonymous buyer — subscription created on signup

      const subs = subscriptions.filter(s => s.user_id === p.appUserId);
      if (subs.length === 0) {
        exceptions.push({
          exception_type: "paid_order_without_subscription",
          severity: "p1",
          tenant_id: null, user_id: p.appUserId,
          entity_type: "Base44Purchase", entity_id: p.id,
          description: `Paid plan purchase ${p.id} has no CustomerSubscription for user ${p.appUserId}`,
          expected_state: "Active CustomerSubscription with plan entitlements",
          actual_state: "No CustomerSubscription found",
          financial_impact_micros: 0,
        });
      } else {
        const activeSub = subs.find(s => s.status === "active");
        if (!activeSub) {
          exceptions.push({
            exception_type: "paid_order_without_subscription",
            severity: "p1",
            tenant_id: null, user_id: p.appUserId,
            entity_type: "Base44Purchase", entity_id: p.id,
            description: `Paid plan purchase ${p.id} but subscription is not active (status: ${subs[0].status})`,
            expected_state: "Active subscription",
            actual_state: `Status: ${subs[0].status}`,
            financial_impact_micros: 0,
          });
        }
      }
    }

    // ── 2. SUBSCRIPTION WITHOUT PAID ORDER ──
    // An active subscription should have a corresponding paid Base44Purchase.
    for (const s of subscriptions) {
      if (s.plan === "pay_as_you_go") continue; // PAYG doesn't need a purchase
      if (s.status !== "active") continue;

      const paidPurchases = purchases.filter(p =>
        p.status === "paid" && p.appUserId === s.user_id &&
        (p.productId || "").includes("plan-")
      );
      if (paidPurchases.length === 0) {
        exceptions.push({
          exception_type: "subscription_without_paid_order",
          severity: "p1",
          tenant_id: s.tenant_id, user_id: s.user_id,
          entity_type: "CustomerSubscription", entity_id: s.id,
          description: `Active subscription for plan ${s.plan} but no paid purchase found`,
          expected_state: "Paid Base44Purchase with matching plan product",
          actual_state: "No paid purchase found",
          financial_impact_micros: 0,
        });
      }
    }

    // ── 3. CANCELLED SUBSCRIPTION WITH ACTIVE ENTITLEMENT ──
    for (const s of subscriptions) {
      if (s.status !== "cancelled") continue;
      // Check if entitlements are still active (max_agents > 0, has_* = true)
      const hasActiveEntitlements = (s.max_agents > 0 || s.has_crm || s.has_api_access);
      if (hasActiveEntitlements) {
        exceptions.push({
          exception_type: "cancelled_subscription_with_active_entitlement",
          severity: "p0",
          tenant_id: s.tenant_id, user_id: s.user_id,
          entity_type: "CustomerSubscription", entity_id: s.id,
          description: `Cancelled subscription ${s.id} still has active entitlements`,
          expected_state: "Entitlements revoked (max_agents=0, has_*=false)",
          actual_state: `max_agents=${s.max_agents}, has_crm=${s.has_crm}`,
          financial_impact_micros: 0,
        });
      }
    }

    // ── 4. USAGE WITHOUT RATE (UNKNOWN_RATE) ──
    for (const m of usageMeters) {
      if (m.is_unknown_rate) {
        exceptions.push({
          exception_type: "unknown_rate_usage",
          severity: "p1",
          tenant_id: m.tenant_id, user_id: m.user_id,
          entity_type: "UsageMeter", entity_id: m.id,
          description: `Usage meter ${m.id} has unknown rate for channel ${m.channel}`,
          expected_state: "Known rate from canonical registry",
          actual_state: "UNKNOWN_RATE — charge refused",
          financial_impact_micros: 0,
        });
      }
    }

    // ── 5. USAGE WITHOUT TENANT ──
    for (const m of usageMeters) {
      if (!m.tenant_id) {
        exceptions.push({
          exception_type: "usage_without_tenant",
          severity: "p2",
          tenant_id: null, user_id: m.user_id,
          entity_type: "UsageMeter", entity_id: m.id,
          description: `Usage meter ${m.id} has no tenant_id`,
          expected_state: "Valid tenant_id",
          actual_state: "null tenant_id",
          financial_impact_micros: 0,
        });
      }
    }

    // ── 6. NEGATIVE BALANCE ──
    for (const b of billingAccounts) {
      if ((b.balance_cents || 0) < 0) {
        exceptions.push({
          exception_type: "negative_balance",
          severity: "p1",
          tenant_id: b.tenant_id, user_id: null,
          entity_type: "BillingAccount", entity_id: b.id,
          description: `BillingAccount ${b.id} has negative balance: ${b.balance_cents} cents`,
          expected_state: "Balance >= 0 or auto-recharge triggered",
          actual_state: `${b.balance_cents} cents`,
          financial_impact_micros: Math.abs(b.balance_cents) * 10000, // cents to micros
        });
      }
    }

    // ── 7. ORPHAN PURCHASE (pending > 24h) ──
    const now = Date.now();
    for (const p of purchases) {
      if (p.status !== "pending") continue;
      const created = new Date(p.created_date).getTime();
      const ageHours = (now - created) / (1000 * 60 * 60);
      if (ageHours > 24) {
        exceptions.push({
          exception_type: "orphan_purchase",
          severity: "p2",
          tenant_id: null, user_id: p.appUserId,
          entity_type: "Base44Purchase", entity_id: p.id,
          description: `Purchase ${p.id} has been pending for ${Math.round(ageHours)}h`,
          expected_state: "Paid or canceled within 24h",
          actual_state: "Pending > 24h — likely abandoned checkout",
          financial_impact_micros: 0,
        });
      }
    }

    // ── 8. STALE PLAN ON BILLING ACCOUNT ──
    for (const b of billingAccounts) {
      if (b.plan === "starter") {
        exceptions.push({
          exception_type: "usage_without_rate",
          severity: "p1",
          tenant_id: b.tenant_id, user_id: null,
          entity_type: "BillingAccount", entity_id: b.id,
          description: `BillingAccount ${b.id} has stale plan "starter" — should be pay_as_you_go or a valid plan`,
          expected_state: "Valid plan slug (launch/essential/professional/growth/agency/enterprise/pay_as_you_go)",
          actual_state: "starter (retired)",
          financial_impact_micros: 0,
        });
      }
    }

    // ── PERSIST EXCEPTIONS ──
    let created = 0;
    for (const ex of exceptions) {
      try {
        await base44.asServiceRole.entities.ReconciliationException.create({
          exception_id: `exc_${runId}_${created}`,
          exception_type: ex.exception_type,
          severity: ex.severity,
          tenant_id: ex.tenant_id,
          user_id: ex.user_id,
          entity_type: ex.entity_type,
          entity_id: ex.entity_id,
          description: ex.description,
          expected_state: ex.expected_state,
          actual_state: ex.actual_state,
          financial_impact_micros: ex.financial_impact_micros || 0,
          status: "open",
          detected_at: new Date().toISOString(),
          reconciliation_run_id: runId,
        });
        created++;
      } catch (_) {}
    }

    // ── SUMMARY ──
    const summary = {
      run_id: runId,
      run_at: new Date().toISOString(),
      totals: {
        purchases_checked: purchases.length,
        subscriptions_checked: subscriptions.length,
        billing_accounts_checked: billingAccounts.length,
        usage_meters_checked: usageMeters.length,
      },
      exceptions_found: exceptions.length,
      exceptions_created: created,
      by_severity: {
        p0: exceptions.filter(e => e.severity === "p0").length,
        p1: exceptions.filter(e => e.severity === "p1").length,
        p2: exceptions.filter(e => e.severity === "p2").length,
        p3: exceptions.filter(e => e.severity === "p3").length,
      },
      by_type: exceptions.reduce((acc, e) => {
        acc[e.exception_type] = (acc[e.exception_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return Response.json(summary);
  } catch (error: any) {
    console.error("reconciliation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
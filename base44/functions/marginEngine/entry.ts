// ─── Margin Engine ───────────────────────────────────────────────
// Calculates and aggregates contribution margins across all dimensions.
// Detects negative margins, price drift, revenue leakage, and unmetered usage.
// Read-only analysis — does not modify any billing data.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { USAGE_RATE_REGISTRY, calculateMargin, isUnknownRate } from '../../shared/usageRateRegistry.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action || "summary";

    // ── SUMMARY: aggregate margins across all dimensions ──
    if (action === "summary") {
      const [meters, ledgerEntries] = await Promise.all([
        base44.asServiceRole.entities.UsageMeter.list('-created_date', 500),
        base44.asServiceRole.entities.MarginLedger.list('-created_date', 500),
      ]);

      // Filter out test records
      const realMeters = meters.filter((m: any) => !m.is_test_record);
      const realLedger = ledgerEntries.filter((l: any) => true); // MarginLedger doesn't have is_test_record

      // Aggregate by dimension
      const byTenant: Record<string, any> = {};
      const byPlan: Record<string, any> = {};
      const byChannel: Record<string, any> = {};
      const byProvider: Record<string, any> = {};
      const byRegion: Record<string, any> = {};

      let totalRevenueMicros = 0;
      let totalCostMicros = 0;
      let totalMarginMicros = 0;
      let negativeMargins = 0;
      let unknownCosts = 0;
      let alerts: string[] = [];

      for (const l of realLedger) {
        const rev = l.customer_revenue_micros || 0;
        const cost = l.provider_cost_micros || 0;
        const margin = l.contribution_margin_micros || 0;

        totalRevenueMicros += rev;
        totalCostMicros += cost;
        totalMarginMicros += margin;

        if (l.is_negative) negativeMargins++;
        if (l.is_unknown_cost) unknownCosts++;

        // By tenant
        if (!byTenant[l.tenant_id]) byTenant[l.tenant_id] = { revenue: 0, cost: 0, margin: 0, count: 0 };
        byTenant[l.tenant_id].revenue += rev;
        byTenant[l.tenant_id].cost += cost;
        byTenant[l.tenant_id].margin += margin;
        byTenant[l.tenant_id].count++;

        // By plan
        const plan = l.plan_slug || "unknown";
        if (!byPlan[plan]) byPlan[plan] = { revenue: 0, cost: 0, margin: 0, count: 0 };
        byPlan[plan].revenue += rev;
        byPlan[plan].cost += cost;
        byPlan[plan].margin += margin;
        byPlan[plan].count++;

        // By channel
        if (!byChannel[l.channel]) byChannel[l.channel] = { revenue: 0, cost: 0, margin: 0, count: 0 };
        byChannel[l.channel].revenue += rev;
        byChannel[l.channel].cost += cost;
        byChannel[l.channel].margin += margin;
        byChannel[l.channel].count++;

        // By provider
        const prov = l.provider || "unknown";
        if (!byProvider[prov]) byProvider[prov] = { revenue: 0, cost: 0, margin: 0, count: 0 };
        byProvider[prov].revenue += rev;
        byProvider[prov].cost += cost;
        byProvider[prov].margin += margin;
        byProvider[prov].count++;

        // By region
        const reg = l.region || "unknown";
        if (!byRegion[reg]) byRegion[reg] = { revenue: 0, cost: 0, margin: 0, count: 0 };
        byRegion[reg].revenue += rev;
        byRegion[reg].cost += cost;
        byRegion[reg].margin += margin;
        byRegion[reg].count++;

        // Alerts
        if (l.alert_triggered && l.alert_triggered !== "none") {
          alerts.push(`${l.alert_triggered}: tenant=${l.tenant_id} channel=${l.channel} margin=${l.margin_micros}micros`);
        }
      }

      // Check for revenue leakage: usage meters with no margin ledger entry
      const ledgerIds = new Set(realLedger.map((l: any) => l.usage_meter_id));
      const unmetered = realMeters.filter((m: any) => !ledgerIds.has(m.id) && !m.is_unknown_rate);
      if (unmetered.length > 0) {
        alerts.push(`REVENUE_LEAKAGE: ${unmetered.length} usage meters have no margin ledger entry`);
      }

      // Check for unmetered provider usage: meters with unknown rate
      const unknownRateMeters = realMeters.filter((m: any) => m.is_unknown_rate);
      if (unknownRateMeters.length > 0) {
        alerts.push(`UNMETERED_PROVIDER_USAGE: ${unknownRateMeters.length} usage meters have unknown rates`);
      }

      const marginPct = totalRevenueMicros > 0
        ? Math.round((totalMarginMicros / totalRevenueMicros) * 10000) / 100
        : 0;

      return Response.json({
        action: "summary",
        totals: {
          total_revenue_micros: totalRevenueMicros,
          total_revenue_dollars: totalRevenueMicros / 1_000_000,
          total_cost_micros: totalCostMicros,
          total_cost_dollars: totalCostMicros / 1_000_000,
          total_margin_micros: totalMarginMicros,
          total_margin_dollars: totalMarginMicros / 1_000_000,
          margin_percentage: marginPct,
          negative_margin_count: negativeMargins,
          unknown_cost_count: unknownCosts,
          total_ledger_entries: realLedger.length,
          total_usage_meters: realMeters.length,
          unmetered_count: unmetered.length,
        },
        by_tenant: byTenant,
        by_plan: byPlan,
        by_channel: byChannel,
        by_provider: byProvider,
        by_region: byRegion,
        alerts: alerts,
      });
    }

    // ── RATE_DRIFT: check if provider costs have changed from registry ──
    if (action === "rate_drift") {
      const drift: any[] = [];
      for (const rate of USAGE_RATE_REGISTRY) {
        if (isUnknownRate(rate)) continue;
        // In a real system, we'd query the provider API for current costs.
        // For now, we return the registry values as the baseline.
        drift.push({
          rate_id: rate.rate_id,
          metric_id: rate.metric_id,
          customer_rate_micros: rate.customer_rate_micros,
          provider_cost_micros: rate.provider_cost_micros,
          margin_micros: rate.customer_rate_micros - rate.provider_cost_micros,
          margin_pct: rate.customer_rate_micros > 0
            ? Math.round(((rate.customer_rate_micros - rate.provider_cost_micros) / rate.customer_rate_micros) * 10000) / 100
            : 0,
          status: rate.status,
        });
      }
      return Response.json({ action: "rate_drift", rates: drift });
    }

    // ── ALERTS: return all active margin alerts ──
    if (action === "alerts") {
      const ledgerEntries = await base44.asServiceRole.entities.MarginLedger.filter(
        { alert_triggered: "negative_margin" },
        '-created_date', 100,
      );
      return Response.json({
        action: "alerts",
        negative_margin_alerts: ledgerEntries.map((l: any) => ({
          ledger_id: l.ledger_id,
          tenant_id: l.tenant_id,
          channel: l.channel,
          margin_micros: l.contribution_margin_micros,
          margin_pct: l.margin_percentage,
          metered_at: l.metered_at,
        })),
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    console.error("marginEngine error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
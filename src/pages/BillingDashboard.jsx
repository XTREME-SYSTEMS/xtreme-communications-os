import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CreditCard, Receipt, Activity } from "lucide-react";
import UsageChart from "@/components/xtreme/UsageChart";

const fmt = (c) => `$${((c || 0) / 100).toFixed(2)}`;

export default function BillingDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [meters, setMeters] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [a, m, i] = await Promise.all([
        base44.entities.BillingAccount.list("-created_date", 50),
        base44.entities.UsageMeter.list("-metered_at", 200),
        base44.entities.Invoice.list("-created_date", 50),
      ]);
      setAccounts(a); setMeters(m); setInvoices(i);
    } catch (_) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const byChannel = {};
  let total = 0;
  for (const m of meters) {
    byChannel[m.channel] = (byChannel[m.channel] || 0) + (m.amount_cents || 0);
    total += (m.amount_cents || 0);
  }
  const chartData = Object.entries(byChannel).map(([channel, cents]) => ({ channel, cents }));

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Billing · Usage Metering</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">XTREME COMMUNICATIONS · sub-second metering + invoice rollup</span>
        </div>
      </div>
      <div className="p-4 lg:p-6 grid lg:grid-cols-3 gap-4">
        <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <CreditCard className="h-3.5 w-3.5 text-accent-orange" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Billing Accounts</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{accounts.length}</span>
          </div>
          <div className="divide-y divide-surface-border max-h-[260px] overflow-y-auto scrollbar-thin">
            {accounts.map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-primary font-display uppercase tracking-wider">{a.plan}</span>
                  <span className="text-[10px] text-text-muted uppercase">{a.status}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Balance</span>
                  <span className={a.balance_cents < 0 ? "text-destructive font-mono" : "text-status-green font-mono"}>{fmt(a.balance_cents)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">This cycle</span>
                  <span className="text-text-primary font-mono">{fmt(a.usage_this_cycle_cents)}</span>
                </div>
              </div>
            ))}
            {!accounts.length && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO ACCOUNTS</div>}
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <Activity className="h-3.5 w-3.5 text-status-green" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Usage by Channel</span>
            <span className="ml-auto text-[10px] font-mono text-text-muted">{fmt(total)}</span>
          </div>
          <div className="p-3">
            {chartData.length ? <UsageChart data={chartData} /> : <div className="h-[220px] flex items-center justify-center text-[11px] text-text-muted font-display tracking-wider">NO USAGE</div>}
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <Receipt className="h-3.5 w-3.5 text-chart-4" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Invoices</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{invoices.length}</span>
          </div>
          <div className="divide-y divide-surface-border max-h-[260px] overflow-y-auto scrollbar-thin">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-text-primary font-mono">{inv.period_start}</span>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">{inv.status}</span>
                </div>
                <span className="text-[12px] font-mono text-text-primary">{fmt(inv.total_cents)}</span>
              </div>
            ))}
            {!invoices.length && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO INVOICES</div>}
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface flex flex-col lg:col-span-3">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <Activity className="h-3.5 w-3.5 text-accent-orange" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Live Meter Feed</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{meters.length} EVENTS</span>
          </div>
          <div className="divide-y divide-surface-border max-h-[280px] overflow-y-auto scrollbar-thin">
            {meters.slice(0, 50).map((m) => (
              <div key={m.id} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                <span className="text-text-muted font-mono w-44 truncate">{m.metered_at}</span>
                <span className="text-accent-orange font-display uppercase tracking-wider w-20">{m.channel}</span>
                <span className="text-text-muted w-16">{m.units}u</span>
                <span className="text-text-primary font-mono ml-auto">{fmt(m.amount_cents)}</span>
                <span className="text-[9px] text-text-muted uppercase tracking-wider w-24 text-right">{m.classification}</span>
              </div>
            ))}
            {!meters.length && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO METERS</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
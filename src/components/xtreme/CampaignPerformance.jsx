import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, TrendingUp, CheckCircle2, Zap } from "lucide-react";

export default function CampaignPerformance({ logs, campaigns }) {
  const { timeSeries, totals } = useMemo(() => {
    const byHour = {};
    for (const log of logs) {
      const hour = (log.started_at || log.created_date || "").slice(0, 13);
      if (!hour) continue;
      if (!byHour[hour]) byHour[hour] = { hour, triggers: 0, steps_completed: 0, steps_failed: 0, successes: 0, total: 0 };
      byHour[hour].total++;
      if (log.status === "completed") { byHour[hour].successes++; byHour[hour].steps_completed++; }
      if (log.status === "failed") byHour[hour].steps_failed++;
      if (log.step_type === "trigger") byHour[hour].triggers++;
    }
    const ts = Object.values(byHour).sort((a, b) => a.hour.localeCompare(b.hour)).slice(-24);
    const t = {
      total: logs.length,
      completed: logs.filter((l) => l.status === "completed").length,
      failed: logs.filter((l) => l.status === "failed").length,
      running: logs.filter((l) => l.status === "running" || l.status === "pending").length,
    };
    t.successRate = t.total ? Math.round((t.completed / t.total) * 100) : 0;
    return { timeSeries: ts, totals: t };
  }, [logs]);

  const chartData = timeSeries.map((t) => ({
    ...t,
    label: t.hour.slice(11, 16) || t.hour,
  }));

  return (
    <div className="rounded-lg border border-surface-border bg-surface">
      <div className="px-4 h-11 flex items-center gap-2 border-b border-surface-border">
        <Activity className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase">Campaign Performance</span>
        <span className="ml-auto text-[10px] text-text-muted font-display">{campaigns.length} campaigns · {logs.length} events</span>
      </div>

      <div className="grid grid-cols-4 gap-px bg-surface-border border-b border-surface-border">
        <Metric icon={Zap} label="Total Events" value={totals.total} tone="text-accent-orange" />
        <Metric icon={CheckCircle2} label="Completed" value={totals.completed} tone="text-status-green" />
        <Metric icon={TrendingUp} label="Success Rate" value={`${totals.successRate}%`} tone={totals.successRate >= 80 ? "text-status-green" : "text-destructive"} />
        <Metric icon={Activity} label="Failed" value={totals.failed} tone={totals.failed ? "text-destructive" : "text-text-muted"} />
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="text-[10px] font-display uppercase tracking-wider text-text-muted mb-2">Trigger Rate & Execution Success Over Time</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--text-muted))" }} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--text-muted))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--surface-border))", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="triggers" stroke="hsl(var(--accent-orange))" strokeWidth={2} dot={false} name="Triggers" />
              <Line type="monotone" dataKey="successes" stroke="hsl(var(--status-green))" strokeWidth={2} dot={false} name="Successes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="text-[10px] font-display uppercase tracking-wider text-text-muted mb-2">Step Completion vs Failures</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--text-muted))" }} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--text-muted))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--surface-border))", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="steps_completed" stackId="a" fill="hsl(var(--status-green))" name="Completed" />
              <Bar dataKey="steps_failed" stackId="a" fill="hsl(var(--destructive))" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-surface px-3 py-2.5 flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${tone}`} />
      <div className="flex flex-col">
        <span className="text-[8px] text-text-muted uppercase tracking-wider">{label}</span>
        <span className={`text-[14px] font-mono ${tone}`}>{value}</span>
      </div>
    </div>
  );
}
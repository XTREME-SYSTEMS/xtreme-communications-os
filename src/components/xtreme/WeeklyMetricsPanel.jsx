import { Phone, Clock, CheckCircle } from "lucide-react";

export default function WeeklyMetricsPanel({ callsThisWeek, avgDurationMin, tasksCreated }) {
  const stats = [
    { label: "Calls This Week", value: callsThisWeek, icon: Phone, color: "text-accent-orange" },
    { label: "Avg Call Length", value: `${avgDurationMin}m`, icon: Clock, color: "text-chart-3" },
    { label: "Tasks Created", value: tasksCreated, icon: CheckCircle, color: "text-status-green" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${s.color}`} />
              <span className="font-display text-[10px] tracking-[0.1em] uppercase text-text-muted">{s.label}</span>
            </div>
            <span className="font-display text-2xl text-text-primary">{s.value}</span>
          </div>
        );
      })}
    </div>
  );
}
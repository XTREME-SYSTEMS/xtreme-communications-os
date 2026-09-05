import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const SEV = {
  critical: "text-destructive",
  high: "text-accent-orange",
  medium: "text-chart-4",
  low: "text-text-muted",
  info: "text-text-muted",
};

export default function AuditPanel({ findings }) {
  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Faultline Audit Log</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{findings.length} FINDINGS</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[300px] divide-y divide-surface-border">
        {findings.length === 0 && <div className="p-4 text-[12px] text-text-muted font-display tracking-wider">NO FINDINGS — RUN AUDIT</div>}
        {findings.map(f => (
          <div key={f.id} className="px-4 py-2.5 flex gap-3">
            <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", SEV[f.severity] || "text-text-muted")} />
            <div className="min-w-0">
              <div className="text-[12px] text-text-primary">{f.finding}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{f.area} · {f.severity}</div>
              {f.recommendation && <div className="text-[11px] text-text-muted mt-0.5">→ {f.recommendation}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
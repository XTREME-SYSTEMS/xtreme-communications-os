import { useState } from "react";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, SHORT_STATUS } from "@/lib/xtreme";

const FILTERS = ["ALL", "LIVE", "PROVIDER-BACKED", "SANDBOX", "MOCK/DEV-ONLY", "NOT-YET-IMPLEMENTED"];

export default function ParityMatrix({ capabilities, loading }) {
  const [filter, setFilter] = useState("ALL");
  const rows = capabilities.filter(c => filter === "ALL" || c.status === filter);

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Twilio Parity Matrix</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{capabilities.length} CAPABILITIES</span>
      </div>
      <div className="flex gap-1 px-3 py-2 border-b border-surface-border overflow-x-auto scrollbar-thin">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-2 h-6 rounded text-[10px] font-display tracking-wider uppercase whitespace-nowrap border",
              filter === f ? "border-accent-orange/50 text-accent-orange bg-accent-orange/10" : "border-surface-border text-text-muted hover:text-text-primary")}>
            {SHORT_STATUS(f)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[420px]">
        {loading && <div className="p-4 text-[12px] text-text-muted font-display tracking-wider">LOADING REGISTRY…</div>}
        <div className="grid sm:grid-cols-2 gap-px bg-surface-border">
          {rows.map(c => {
            const st = STATUS_STYLES[c.status] || STATUS_STYLES["NOT-YET-IMPLEMENTED"];
            return (
              <div key={c.id} className="bg-surface p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-text-primary font-medium truncate">{c.name}</span>
                  <span className={cn("text-[9px] font-display tracking-[0.1em] uppercase border rounded px-1.5 py-0.5", st.badge)}>{SHORT_STATUS(c.status)}</span>
                </div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">{c.category}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-base rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", st.dot)} style={{ width: `${c.coverage_pct || 0}%` }} />
                  </div>
                  <span className="text-[10px] font-display text-text-muted w-8 text-right">{c.coverage_pct || 0}%</span>
                  {c.benchmark_delta_pct ? (
                    <span className={cn("text-[10px] font-display", c.benchmark_delta_pct >= 0 ? "text-status-green" : "text-accent-orange")}>
                      {c.benchmark_delta_pct >= 0 ? "+" : ""}{c.benchmark_delta_pct}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
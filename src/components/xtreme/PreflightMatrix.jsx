import { useMemo } from "react";
import PreflightRow from "@/components/xtreme/PreflightRow";

export default function PreflightMatrix({ capabilities, onResult }) {
  const byCat = useMemo(() => {
    const m = {};
    for (const c of capabilities) (m[c.category || "uncategorized"] ||= []).push(c);
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [capabilities]);

  return (
    <div className="rounded-lg border border-surface-border bg-surface overflow-hidden">
      {/* Twilio benchmark — top */}
      <div className="flex items-center gap-3 px-3 py-3 bg-base border-b-2 border-status-green/40">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-status-green animate-pulse" />
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-status-green">Twilio · Benchmark</span>
        </div>
        <span className="ml-auto font-display text-[11px] text-text-muted">100% LIVE · all categories</span>
        <div className="hidden sm:flex items-center gap-2 w-28">
          <div className="flex-1 h-1.5 rounded-full bg-status-green" />
          <span className="font-display text-[10px] text-status-green w-8 text-right">100%</span>
        </div>
        <div className="w-[152px] shrink-0 hidden lg:block" />
      </div>

      {byCat.length === 0 && <div className="px-3 py-6 text-center text-[12px] text-text-muted">No capabilities discovered — run the Discover stage.</div>}
      {byCat.map(([cat, caps]) => {
        const avg = Math.round(caps.reduce((s, c) => s + (c.coverage_pct ?? 0), 0) / caps.length);
        return (
          <div key={cat} className="border-b border-surface-border last:border-b-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-base/50">
              <span className="font-display text-[10px] tracking-[0.15em] uppercase text-text-muted">{cat}</span>
              <span className="ml-auto font-display text-[10px] text-text-muted">{caps.length} caps · avg {avg}%</span>
            </div>
            {caps.map((c) => <PreflightRow key={c.id} cap={c} onResult={onResult} />)}
          </div>
        );
      })}
    </div>
  );
}
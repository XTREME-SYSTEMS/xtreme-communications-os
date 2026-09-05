import { cn } from "@/lib/utils";
import { ScanLine } from "lucide-react";

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[10px] tracking-[0.15em] uppercase text-text-muted">{label}</span>
      <span className={cn("font-display text-lg leading-none", accent)}>{value}</span>
    </div>
  );
}

export default function StatusStrip({ parityPct, healthPass, healthTotal, queueCount, activeCount, onAudit, auditing }) {
  return (
    <div className="h-14 flex items-center gap-4 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
        <span className="font-display text-[11px] tracking-[0.2em] uppercase text-text-primary">Command Center</span>
      </div>
      <div className="hidden sm:flex items-center gap-6 ml-auto">
        <Stat label="Twilio Parity" value={`${parityPct}%`} accent="text-accent-orange" />
        <Stat label="Release Gate" value={`${healthPass}/${healthTotal}`} accent={healthTotal && healthPass >= healthTotal ? "text-status-green" : "text-accent-orange"} />
        <Stat label="Build Queue" value={queueCount} accent="text-text-primary" />
        <Stat label="Active Streams" value={activeCount} accent="text-status-green" />
        <button onClick={onAudit} disabled={auditing}
          className="flex items-center gap-1.5 h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[11px] font-display tracking-[0.1em] uppercase hover:bg-accent-orange/10 disabled:opacity-60">
          <ScanLine className="h-3.5 w-3.5" /> {auditing ? "Auditing" : "Audit & Build"}
        </button>
      </div>
    </div>
  );
}
import { cn } from "@/lib/utils";
import { ENGINE_STYLES } from "@/lib/xtreme";
import { Brain, ShieldCheck, Globe, EyeOff } from "lucide-react";

const TILES = [
  { name: "Vision Cortex", role: "AI Brain", icon: Brain },
  { name: "Faultline", role: "Engineering Control", icon: ShieldCheck },
  { name: "Cloud Browser", role: "Eyes + Hands", icon: Globe },
  { name: "Shadow", role: "Privileged Subsystem", icon: EyeOff },
];

export default function EngineTelemetry({ engines }) {
  const byName = Object.fromEntries((engines || []).map(e => [e.engine_name, e]));
  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">System Engines</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">TELEMETRY</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-surface-border">
        {TILES.map(t => {
          const e = byName[t.name] || {};
          const Icon = t.icon;
          const led = ENGINE_STYLES[e.state] || "bg-text-muted";
          return (
            <div key={t.name} className="bg-surface p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-text-muted" />
                <span className={cn("h-2 w-2 rounded-full", led, e.state === "online" && "animate-pulse")} />
              </div>
              <div className="font-display text-[11px] tracking-[0.1em] uppercase text-text-primary leading-tight">{t.name}</div>
              <div className="text-[9px] text-text-muted uppercase tracking-wider">{t.role}</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-2xl text-text-primary leading-none">{e.health_pct ?? "--"}</span>
                <span className="text-[10px] text-text-muted">%</span>
              </div>
              <div className="text-[10px] text-text-muted truncate" title={e.last_action || ""}>{e.last_action || "standby"}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Search, ScanLine, FlaskConical, Gauge, Heart, Rocket } from "lucide-react";

const STAGES = [
  { key: "discover", label: "Discover", icon: Search, desc: "Enumerate every capability, system, and process end-to-end." },
  { key: "audit", label: "Audit", icon: ScanLine, desc: "Compare each capability against the Twilio benchmark; find every gap." },
  { key: "test", label: "Test", icon: FlaskConical, desc: "Define verifiable visual + auditory tests for every capability." },
  { key: "score", label: "Score", icon: Gauge, desc: "Rate 0-100 against Twilio; justify with evidence." },
  { key: "heal", label: "Heal", icon: Heart, desc: "Generate fix prompts that identify problems and harden at every level." },
  { key: "launch", label: "Launch", icon: Rocket, desc: "Final 100% gate and production cutover." },
];

export default function PreflightStages({ systemSummary }) {
  const [busy, setBusy] = useState(null);
  const [results, setResults] = useState({});

  const run = async (stage) => {
    setBusy(stage);
    try {
      const res = await base44.functions.invoke("preflightHeal", {
        action: stage, capability_name: "SYSTEM-WIDE", category: "all",
        current_status: systemSummary.status, coverage_pct: systemSummary.score,
        twilio_benchmark: "LIVE · 100%", evidence: systemSummary.evidence,
      });
      setResults((r) => ({ ...r, [stage]: res.data || res }));
    } catch (e) {
      setResults((r) => ({ ...r, [stage]: { error: String(e.message || e) } }));
    } finally { setBusy(null); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {STAGES.map((s) => {
        const Icon = s.icon;
        const r = results[s.key];
        return (
          <div key={s.key} className="rounded-lg border border-surface-border bg-surface p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-accent-orange" />
              <span className="font-display text-[11px] tracking-[0.15em] uppercase">{s.label}</span>
              <span className={cn("ml-auto h-2 w-2 rounded-full", r?.error ? "bg-destructive" : r ? "bg-status-green" : "bg-text-muted/40")} />
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed mb-3 flex-1">{s.desc}</p>
            <button onClick={() => run(s.key)} disabled={busy}
              className={cn("h-8 rounded font-display text-[10px] tracking-[0.1em] uppercase flex items-center justify-center gap-1.5",
                busy === s.key ? "bg-accent-orange text-base" : "border border-surface-border text-text-muted hover:text-text-primary hover:border-accent-orange")}>
              {busy === s.key ? "Generating…" : r ? "Regenerate Prompt" : "Generate Prompt"}
            </button>
            {r && !r.error && r.fix_prompt && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] font-display tracking-[0.1em] uppercase text-accent-orange">Prompt ▾</summary>
                <pre className="mt-1 p-2 rounded bg-base border border-surface-border text-[10px] text-text-muted whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin">{r.fix_prompt}</pre>
              </details>
            )}
            {r?.error && <div className="mt-2 text-[10px] text-destructive">{r.error}</div>}
          </div>
        );
      })}
    </div>
  );
}
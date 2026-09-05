import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, SHORT_STATUS } from "@/lib/xtreme";
import { Play, Wrench, Heart, ShieldCheck } from "lucide-react";

const ACTIONS = [
  { key: "validate", label: "Validate", icon: Play },
  { key: "fix", label: "Fix", icon: Wrench },
  { key: "heal", label: "Heal", icon: Heart },
  { key: "harden", label: "Harden", icon: ShieldCheck },
];

export default function PreflightRow({ cap, onResult }) {
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLES[cap.status] || STATUS_STYLES["NOT-YET-IMPLEMENTED"];

  const run = async (action) => {
    setBusy(action);
    try {
      const res = await base44.functions.invoke("preflightHeal", {
        action, capability_name: cap.name, category: cap.category || "",
        current_status: cap.status, coverage_pct: cap.coverage_pct ?? 0,
        twilio_benchmark: "LIVE · 100%",
      });
      setResult(res.data || res);
      setOpen(true);
      onResult?.(cap, res.data || res);
    } catch (e) {
      setResult({ error: String(e.message || e) });
      setOpen(true);
    } finally { setBusy(null); }
  };

  return (
    <div className="border-b border-surface-border last:border-b-0">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className={cn("h-2 w-2 rounded-full shrink-0", st.dot)} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-text-primary truncate">{cap.name}</div>
        </div>
        <span className={cn("text-[9px] font-display tracking-[0.1em] uppercase px-1.5 py-0.5 rounded border shrink-0", st.badge)}>
          {SHORT_STATUS(cap.status)}
        </span>
        <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
          <div className="flex-1 h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${cap.coverage_pct ?? 0}%`, background: "hsl(var(--accent-orange))" }} />
          </div>
          <span className="font-display text-[10px] text-text-muted w-8 text-right">{cap.coverage_pct ?? 0}%</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.key} onClick={() => run(a.key)} disabled={busy} title={a.label}
                className={cn("h-7 px-2 rounded font-display text-[9px] tracking-[0.1em] uppercase flex items-center gap-1 border transition-colors",
                  busy === a.key ? "bg-accent-orange text-base border-accent-orange" : "border-surface-border text-text-muted hover:text-text-primary hover:border-accent-orange")}>
                <Icon className="h-3 w-3" /> <span className="hidden lg:inline">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {open && result && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {result.error ? (
            <div className="text-[11px] text-destructive">{result.error}</div>
          ) : (
            <>
              <div className="text-[11px] text-text-muted"><span className="text-text-primary font-display tracking-[0.05em] uppercase text-[10px]">Diagnosis: </span>{result.diagnosis}</div>
              {result.fix_steps?.length > 0 && (
                <div className="text-[11px] text-text-muted"><span className="text-text-primary font-display tracking-[0.05em] uppercase text-[10px]">Fix Steps: </span>{result.fix_steps.join(" → ")}</div>
              )}
              {result.fix_prompt && (
                <details className="group">
                  <summary className="cursor-pointer text-[10px] font-display tracking-[0.1em] uppercase text-accent-orange">Generated Prompt ▾</summary>
                  <pre className="mt-1 p-2 rounded bg-base border border-surface-border text-[10px] text-text-muted whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">{result.fix_prompt}</pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
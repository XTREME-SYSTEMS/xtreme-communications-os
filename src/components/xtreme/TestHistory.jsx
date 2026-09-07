import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestHistory() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.TestRun.list('-created_date', 20);
      setRuns(list);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return (
    <div className="tl-panel rounded-xl p-5 flex items-center justify-center">
      <Loader2 className="h-4 w-4 text-text-muted animate-spin" />
    </div>
  );

  if (runs.length === 0) return (
    <div className="tl-panel rounded-xl p-5 text-center">
      <History className="h-5 w-5 text-text-muted mx-auto mb-2" />
      <p className="text-xs text-text-muted">No test runs yet. Run a test to see history.</p>
    </div>
  );

  return (
    <div className="tl-panel rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Test History</span>
        <span className="ml-auto text-[10px] text-text-muted">{runs.length} runs</span>
      </div>
      <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
        {runs.map((run) => (
          <div key={run.id}>
            <button onClick={() => setExpanded(expanded === run.id ? null : run.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-surface-border bg-base/40 hover:bg-surface/50 text-left">
              <div className={cn("w-2 h-2 rounded-full shrink-0",
                run.quality_gate_passed ? "bg-status-green" : "bg-destructive")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{run.scenario}</p>
                <p className="text-[9px] text-text-muted">
                  {run.channel?.toUpperCase()} · {run.persona_a_name} → {run.persona_b_name} · {run.turns_count} turns
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={cn("font-display", (run.quality_score || 0) >= 70 ? "text-status-green" : "text-chart-4")}>Q:{Math.round(run.quality_score || 0)}</span>
                <span className={cn("font-display", (run.naturalness_score || 0) >= 70 ? "text-status-green" : "text-chart-4")}>N:{Math.round(run.naturalness_score || 0)}</span>
              </div>
              <ChevronRight className={cn("h-3.5 w-3.5 text-text-muted transition-transform", expanded === run.id && "rotate-90")} />
            </button>
            {expanded === run.id && (
              <div className="p-3 rounded-lg bg-base/60 border border-surface-border mt-1 space-y-2">
                <p className="text-[11px] text-text-primary">{run.summary}</p>
                {run.outcome && <p className="text-[10px] text-text-muted">Outcome: {run.outcome}</p>}
                {run.quality_feedback && <p className="text-[10px] text-text-muted italic">{run.quality_feedback}</p>}
                {run.transcript && run.transcript.length > 0 && (
                  <div className="space-y-1 mt-2 max-h-40 overflow-y-auto scrollbar-thin">
                    {run.transcript.map((t, i) => (
                      <div key={i} className="text-[10px]">
                        <span className={cn("font-display uppercase", t.role === 'a' ? "text-accent-orange" : "text-chart-3")}>
                          {t.speaker_name}:
                        </span>
                        <span className="text-text-muted ml-1">{t.text}</span>
                        {t.sentiment && <span className={cn("ml-1 text-[8px]",
                          t.sentiment === 'positive' ? 'text-status-green' :
                          t.sentiment === 'negative' ? 'text-destructive' : 'text-text-muted')}>({t.sentiment})</span>}
                      </div>
                    ))}
                  </div>
                )}
                {run.scheduling_result && run.scheduling_result.slot && (
                  <p className="text-[10px] text-accent-orange">📅 Scheduled: {new Date(run.scheduling_result.slot.start).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
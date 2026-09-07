import { CheckCircle2, XCircle, TrendingUp, Brain, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QualityScores({ quality_score, naturalness_score, quality_gate_passed, quality_feedback, sentiment_trajectory, sentiment_summary }) {
  const qColor = quality_score >= 70 ? "text-status-green" : quality_score >= 50 ? "text-chart-4" : "text-destructive";
  const nColor = naturalness_score >= 70 ? "text-status-green" : naturalness_score >= 50 ? "text-chart-4" : "text-destructive";

  return (
    <div className="tl-panel rounded-xl p-5 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-orange to-transparent" />

      {/* Gate Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent-orange" />
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Quality Analysis</span>
        </div>
        {quality_gate_passed ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-green/15 text-status-green text-[10px] font-display uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5" /> Gate Passed
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/15 text-destructive text-[10px] font-display uppercase tracking-wider">
            <XCircle className="h-3.5 w-3.5" /> Gate Failed
          </span>
        )}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quality Score */}
        <div className="rounded-lg border border-surface-border bg-base/40 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Quality Score</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-2xl font-display", qColor)}>{Math.round(quality_score || 0)}</span>
            <span className="text-[10px] text-text-muted">/100</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden mt-1.5">
            <div className={cn("h-full rounded-full transition-all", quality_score >= 70 ? "bg-status-green" : quality_score >= 50 ? "bg-chart-4" : "bg-destructive")}
              style={{ width: `${quality_score || 0}%` }} />
          </div>
        </div>

        {/* Naturalness Score */}
        <div className="rounded-lg border border-surface-border bg-base/40 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Naturalness</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-2xl font-display", nColor)}>{Math.round(naturalness_score || 0)}</span>
            <span className="text-[10px] text-text-muted">/100</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden mt-1.5">
            <div className={cn("h-full rounded-full transition-all", naturalness_score >= 70 ? "bg-status-green" : naturalness_score >= 50 ? "bg-chart-4" : "bg-destructive")}
              style={{ width: `${naturalness_score || 0}%` }} />
          </div>
        </div>
      </div>

      {/* Sentiment Trajectory */}
      {sentiment_trajectory && sentiment_trajectory.length > 0 && (
        <div className="rounded-lg border border-surface-border bg-base/40 p-3">
          <span className="text-[9px] font-display uppercase tracking-wider text-text-muted mb-2 block">Sentiment Trajectory</span>
          <div className="flex items-end gap-1 h-16">
            {sentiment_trajectory.map((s, i) => {
              const colors = {
                positive: "bg-status-green", neutral: "bg-chart-3",
                negative: "bg-destructive", frustrated: "bg-chart-5", confused: "bg-chart-4",
              };
              const height = Math.max(10, (s.score || 0) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className={cn("w-full rounded-t transition-all", colors[s.label] || "bg-surface-border")}
                    style={{ height: `${height}%` }} title={`Turn ${i+1}: ${s.label} (${((s.score || 0) * 100).toFixed(0)}%)`} />
                  <span className="text-[7px] text-text-muted">{i+1}</span>
                </div>
              );
            })}
          </div>
          {sentiment_summary && (
            <div className="flex items-center gap-3 mt-2 text-[9px]">
              {sentiment_summary.positive > 0 && <span className="text-status-green">● {sentiment_summary.positive} positive</span>}
              {sentiment_summary.neutral > 0 && <span className="text-chart-3">● {sentiment_summary.neutral} neutral</span>}
              {sentiment_summary.negative > 0 && <span className="text-destructive">● {sentiment_summary.negative} negative</span>}
              {sentiment_summary.frustrated > 0 && <span className="text-chart-5">● {sentiment_summary.frustrated} frustrated</span>}
              {sentiment_summary.dominant && <span className="text-text-muted ml-auto">Dominant: {sentiment_summary.dominant}</span>}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {quality_feedback && (
        <div className="rounded-lg border border-surface-border bg-base/40 p-3">
          <span className="text-[9px] font-display uppercase tracking-wider text-text-muted mb-1 block">AI Judge Feedback</span>
          <p className="text-[11px] text-text-primary leading-relaxed">{quality_feedback}</p>
        </div>
      )}
    </div>
  );
}
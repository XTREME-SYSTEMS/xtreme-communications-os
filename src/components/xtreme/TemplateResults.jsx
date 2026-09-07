import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Phone, Mail, Hash, AtSign, Video, Send, Sparkles, TrendingUp, AlertCircle } from "lucide-react";

const CHANNEL_ICONS = {
  voice: Phone, sms: MessageSquare, mms: MessageSquare, whatsapp: Hash,
  email: Mail, facebook: AtSign, snapchat: AtSign, instagram: AtSign,
  linkedin: AtSign, twitter: AtSign, tiktok: Video, discord: AtSign, rcs: Send, universal: Sparkles
};

const SITUATION_LABELS = {
  sales: "Sales", marketing: "Marketing", follow_up: "Follow-Up", outreach: "Outreach",
  response: "Response", comment: "Comment", objection_handling: "Objection Handling",
  qualification: "Qualification", closing: "Closing", appointment: "Appointment",
  nurture: "Nurture", re_engagement: "Re-Engagement"
};

const TONE_COLORS = {
  professional: "text-chart-3", casual: "text-chart-4", urgent: "text-destructive",
  empathetic: "text-chart-2", authoritative: "text-accent-orange", friendly: "text-status-green",
  persuasive: "text-chart-5", consultative: "text-chart-3", energetic: "text-accent-orange", calm: "text-chart-2"
};

export default function TemplateResults({ templates, research, loading }) {
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterSituation, setFilterSituation] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => templates.filter(t =>
    (filterChannel === "all" || t.channel === filterChannel) &&
    (filterSituation === "all" || t.situation === filterSituation)
  ), [templates, filterChannel, filterSituation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-surface-border border-t-accent-orange rounded-full animate-spin" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-muted">Generating communication suite…</span>
        </div>
      </div>
    );
  }

  if (!templates.length && !research) return null;

  return (
    <div className="space-y-4">
      {/* Psychology Insights */}
      {research && (
        <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-orange" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Industry Intelligence</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="font-display text-[9px] tracking-wider uppercase text-status-green">High-Response Words</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(research.high_response_words || []).map((w, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-status-green/10 text-status-green border border-status-green/20">{w}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="font-display text-[9px] tracking-wider uppercase text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Words to Avoid
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(research.words_to_avoid || []).map((w, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 line-through">{w}</span>
                ))}
              </div>
            </div>
          </div>
          {research.customer_psychology && (
            <div className="pt-2 border-t border-surface-border">
              <span className="font-display text-[9px] tracking-wider uppercase text-text-muted">Customer Psychology</span>
              <p className="mt-1 text-[11px] text-text-primary leading-relaxed">{research.customer_psychology}</p>
            </div>
          )}
          {research.top_closing_methods?.length > 0 && (
            <div className="pt-2 border-t border-surface-border">
              <span className="font-display text-[9px] tracking-wider uppercase text-text-muted">Top Closing Methods</span>
              <ul className="mt-1 space-y-1">
                {research.top_closing_methods.map((m, i) => (
                  <li key={i} className="text-[11px] text-text-primary flex gap-2"><span className="text-accent-orange">→</span> {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
            className="h-8 px-2 rounded border border-surface-border bg-surface text-[11px] font-display uppercase tracking-wider">
            <option value="all">All Channels</option>
            {[...new Set(templates.map(t => t.channel))].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSituation} onChange={e => setFilterSituation(e.target.value)}
            className="h-8 px-2 rounded border border-surface-border bg-surface text-[11px] font-display uppercase tracking-wider">
            <option value="all">All Situations</option>
            {[...new Set(templates.map(t => t.situation))].map(s => <option key={s} value={s}>{SITUATION_LABELS[s] || s}</option>)}
          </select>
          <span className="text-[10px] text-text-muted font-display ml-auto">{filtered.length} templates</span>
        </div>
      )}

      {/* Template Grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((t, i) => {
          const Icon = CHANNEL_ICONS[t.channel] || MessageSquare;
          const isExpanded = expanded === i;
          return (
            <div key={t.id || i} className="rounded-lg border border-surface-border bg-surface overflow-hidden">
              <button onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/50">
                <Icon className="h-4 w-4 text-accent-orange shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[10px] uppercase tracking-wider text-text-primary">{SITUATION_LABELS[t.situation] || t.situation}</span>
                    <span className={cn("font-display text-[9px] uppercase tracking-wider", TONE_COLORS[t.tone] || "text-text-muted")}>{t.tone}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-text-muted">{t.channel} · {t.gender_preference}</span>
                </div>
                {t.effectiveness_score > 0 && (
                  <span className="text-[10px] font-display text-status-green shrink-0">{t.effectiveness_score}%</span>
                )}
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-surface-border pt-2">
                  <p className="text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap">{t.template_body}</p>
                  {t.psychology_notes && (
                    <div className="text-[10px] text-text-muted italic border-l-2 border-accent-orange/30 pl-2">{t.psychology_notes}</div>
                  )}
                  {t.target_audience && (
                    <div className="text-[9px] font-display uppercase tracking-wider text-text-muted">Target: {t.target_audience}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
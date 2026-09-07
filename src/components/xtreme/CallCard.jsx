import { cn } from "@/lib/utils";
import { Phone, Mail, Clock, ListTodo } from "lucide-react";

export default function CallCard({ call, tasks, onEmailSummary, emailing }) {
  const duration = call.duration_sec
    ? `${Math.round(call.duration_sec / 60)}m ${call.duration_sec % 60}s`
    : "—";
  const date = new Date(call.created_date || call.started_at).toLocaleString();
  return (
    <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-accent-orange" />
          <span className="font-mono text-[12px] text-text-primary">
            {call.from_addr} → {call.to_addr}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-muted font-display tracking-wider uppercase">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {duration}
          </span>
          <span>{date}</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded border",
              call.status === "completed"
                ? "border-status-green/30 text-status-green"
                : "border-surface-border text-text-muted"
            )}
          >
            {call.status}
          </span>
        </div>
      </div>
      {call.summary && (
        <p className="text-[12px] text-text-primary leading-relaxed">{call.summary}</p>
      )}
      {tasks && tasks.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-display tracking-wider uppercase text-text-muted">
            <ListTodo className="h-3 w-3" /> Tasks
          </div>
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-[12px]">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  t.status === "done" ? "bg-status-green" : "bg-accent-orange"
                )}
              />
              <span className="text-text-primary">{t.title || t.description}</span>
              <span className="text-[10px] text-text-muted uppercase">{t.status}</span>
            </div>
          ))}
        </div>
      )}
      {onEmailSummary && (
        <button
          onClick={() => onEmailSummary(call)}
          disabled={emailing === call.id}
          className="flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase text-accent-orange hover:underline disabled:opacity-50"
        >
          <Mail className="h-3 w-3" />
          {emailing === call.id ? "Sending…" : "Email Summary"}
        </button>
      )}
    </div>
  );
}
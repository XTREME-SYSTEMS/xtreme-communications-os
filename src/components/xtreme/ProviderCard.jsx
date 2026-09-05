import { cn } from "@/lib/utils";
import { Zap, Trash2, Pencil, Power } from "lucide-react";

const STATUS_LED = { connected: "bg-status-green", disconnected: "bg-text-muted", pending: "bg-chart-4", credentials_required: "bg-accent-orange" };
const TYPE_LABEL = { twilio: "Twilio", telnyx: "Telnyx", plivo: "Plivo", vonage: "Vonage", bandwidth: "Bandwidth", custom: "Custom" };

export default function ProviderCard({ provider, onTest, onEdit, onDelete, onToggle, testing }) {
  const p = provider;
  return (
    <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="font-display text-[13px] tracking-wider uppercase text-text-primary truncate">{p.name}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">{TYPE_LABEL[p.type] || p.type}</div>
        </div>
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_LED[p.status], p.status === "connected" && "animate-pulse")} title={p.status} />
      </div>
      <div className="flex flex-wrap gap-1">
        {(p.channels || []).map(ch => (
          <span key={ch} className="text-[9px] font-display uppercase tracking-wider border border-surface-border rounded px-1.5 py-0.5 text-text-muted">{ch}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] font-display uppercase tracking-wider text-text-muted">
        <span>P{p.priority}</span>
        <span className="truncate">{p.failover_group || "no group"}</span>
        <span className={p.enabled ? "text-status-green" : "text-text-muted"}>{p.enabled ? "ENABLED" : "DISABLED"}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button onClick={() => onTest(p)} disabled={testing === p.id}
          className="flex-1 h-8 rounded border border-accent-orange/40 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10 disabled:opacity-50 flex items-center justify-center gap-1">
          <Zap className="h-3 w-3" /> {testing === p.id ? "Testing" : "Test"}
        </button>
        <button onClick={() => onToggle(p)} className="h-8 w-8 rounded border border-surface-border text-text-muted hover:text-text-primary flex items-center justify-center"><Power className="h-3 w-3" /></button>
        <button onClick={() => onEdit(p)} className="h-8 w-8 rounded border border-surface-border text-text-muted hover:text-text-primary flex items-center justify-center"><Pencil className="h-3 w-3" /></button>
        <button onClick={() => onDelete(p)} className="h-8 w-8 rounded border border-surface-border text-text-muted hover:text-destructive flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
      </div>
      {p.last_test_result && <div className="text-[10px] text-text-muted font-display tracking-wider">last: {p.last_test_result}</div>}
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const EVENTS = ["message.sent", "message.delivered", "message.failed", "call.initiated", "call.ended", "webhook.failed"];
const STATUS_LED = { active: "bg-status-green", paused: "bg-text-muted", failing: "bg-accent-orange" };

export default function WebhookManager({ webhooks, tenants, onMutate }) {
  const { toast } = useToast();
  const [tenant_id, setTid] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState(["message.sent"]);
  const [busy, setBusy] = useState(false);

  const toggleEvent = (ev) => setEvents(es => es.includes(ev) ? es.filter(x => x !== ev) : [...es, ev]);
  const add = async () => {
    if (!tenant_id || !url.trim()) { toast({ title: "Tenant + URL required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const secret = "whsec_" + Math.random().toString(36).slice(2, 14);
      await base44.entities.WebhookDispatcher.create({ tenant_id, url: url.trim(), events, secret_hash: secret, status: "active", failure_count: 0 });
      setUrl(""); toast({ title: "Webhook registered", description: `secret: ${secret}` }); onMutate();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const del = async (w) => { try { await base44.entities.WebhookDispatcher.delete(w.id); onMutate(); } catch (e) {} };
  const input = "w-full h-8 bg-base border border-surface-border rounded px-2 text-[11px] text-text-primary focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Webhook Dispatchers</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{webhooks.length} ENDPOINTS</span>
      </div>
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={tenant_id} onChange={e => setTid(e.target.value)}>
            <option value="">— tenant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tenant.com/wh" />
        </div>
        <div className="flex flex-wrap gap-1">
          {EVENTS.map(ev => (
            <button key={ev} onClick={() => toggleEvent(ev)} className={cn("px-1.5 h-6 rounded text-[9px] font-display uppercase tracking-wider border", events.includes(ev) ? "border-accent-orange/50 text-accent-orange bg-accent-orange/10" : "border-surface-border text-text-muted")}>{ev}</button>
          ))}
        </div>
        <button onClick={add} disabled={busy} className="h-8 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10 disabled:opacity-50">Register Webhook</button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[260px] divide-y divide-surface-border">
        {webhooks.map(w => (
          <div key={w.id} className="px-4 py-2.5 flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", STATUS_LED[w.status])} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-text-primary truncate">{w.url}</div>
              <div className="text-[9px] text-text-muted uppercase tracking-wider">{(w.events || []).join(", ")} · {w.last_delivery_status || "pending"}</div>
            </div>
            <button onClick={() => del(w)} className="text-text-muted hover:text-destructive text-[10px] font-display uppercase">del</button>
          </div>
        ))}
        {webhooks.length === 0 && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO WEBHOOKS</div>}
      </div>
    </section>
  );
}
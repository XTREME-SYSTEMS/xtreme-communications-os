import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const CHANNELS = ["sms", "mms", "voice", "whatsapp", "sip", "verify", "lookup"];

export default function ApiRouteManager({ routes, tenants, providers, onMutate }) {
  const { toast } = useToast();
  const [tenant_id, setTid] = useState("");
  const [channel, setChannel] = useState("sms");
  const [endpoint, setEndpoint] = useState("/v1/messages");
  const [provider_id, setPid] = useState("");

  const add = async () => {
    if (!tenant_id) { toast({ title: "Select a tenant", variant: "destructive" }); return; }
    try {
      await base44.entities.ApiRoute.create({ tenant_id, channel, endpoint, provider_id, strategy: "priority", failover_sandbox: true, enabled: true });
      toast({ title: "Route added" }); onMutate();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const del = async (r) => { try { await base44.entities.ApiRoute.delete(r.id); onMutate(); } catch (e) {} };
  const input = "w-full h-8 bg-base border border-surface-border rounded px-2 text-[11px] text-text-primary focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Outbound API Routing</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{routes.length} ROUTES</span>
      </div>
      <div className="p-3 border-b border-surface-border grid grid-cols-2 gap-2">
        <select className={input} value={tenant_id} onChange={e => setTid(e.target.value)}>
          <option value="">— tenant —</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={input} value={channel} onChange={e => setChannel(e.target.value)}>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={input} value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="/v1/messages" />
        <select className={input} value={provider_id} onChange={e => setPid(e.target.value)}>
          <option value="">— provider (sandbox if none) —</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={add} className="col-span-2 h-8 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10">Add Route</button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[260px] divide-y divide-surface-border">
        {routes.map(r => {
          const t = tenants.find(x => x.id === r.tenant_id);
          const p = providers.find(x => x.id === r.provider_id);
          return (
            <div key={r.id} className="px-4 py-2.5 flex items-center gap-2">
              <span className="font-display text-[11px] uppercase tracking-wider text-accent-orange w-16">{r.channel}</span>
              <div className="flex-1 min-w-0 text-[11px] text-text-primary truncate">
                {t?.name || "—"} · {r.endpoint} → {p?.name || "sandbox"}
              </div>
              {r.failover_sandbox && <span className="text-[9px] font-display uppercase tracking-wider text-text-muted border border-surface-border rounded px-1">failover</span>}
              <button onClick={() => del(r)} className="text-text-muted hover:text-destructive text-[10px] font-display uppercase">del</button>
            </div>
          );
        })}
        {routes.length === 0 && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO ROUTES</div>}
      </div>
    </section>
  );
}
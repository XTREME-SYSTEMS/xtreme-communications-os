import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const CHANNELS = ["sms", "mms", "voice", "whatsapp", "sip", "verify", "lookup"];
const STRATEGIES = ["priority", "round-robin", "least-latency"];

export default function RoutingMatrix({ routes, providers, onMutate }) {
  const { toast } = useToast();
  const [channel, setChannel] = useState("sms");
  const [primary, setPrimary] = useState("");
  const [failover, setFailover] = useState("");
  const [strategy, setStrategy] = useState("priority");

  const add = async () => {
    try {
      await base44.entities.ProviderRoute.create({
        channel, primary_provider: primary || "",
        failover_providers: failover ? failover.split(",").map(s => s.trim()).filter(Boolean) : [],
        strategy, enabled: true,
      });
      setPrimary(""); setFailover("");
      toast({ title: "Route added" });
      onMutate();
    } catch (e) { toast({ title: "Add failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const remove = async (r) => {
    try { await base44.entities.ProviderRoute.delete(r.id); onMutate(); } catch (e) { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const inputCls = "w-full h-8 bg-base border border-surface-border rounded px-2 text-[11px] text-text-primary focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Routing & Failover</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{routes.length} ROUTES</span>
      </div>
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} value={channel} onChange={e => setChannel(e.target.value)}>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={inputCls} value={primary} onChange={e => setPrimary(e.target.value)}>
            <option value="">— primary —</option>
            {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <input className={inputCls} value={failover} onChange={e => setFailover(e.target.value)} placeholder="failover (comma separated)" />
        <div className="flex gap-2">
          <select className={inputCls} value={strategy} onChange={e => setStrategy(e.target.value)}>
            {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={add} className="h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10">Add</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[320px] divide-y divide-surface-border">
        {routes.map(r => (
          <div key={r.id} className="px-4 py-2.5 flex items-center gap-2">
            <span className="font-display text-[11px] uppercase tracking-wider text-accent-orange w-16">{r.channel}</span>
            <div className="flex-1 min-w-0 text-[11px] text-text-primary truncate">
              {r.primary_provider || "—"} <span className="text-text-muted">→ [{(r.failover_providers || []).join(", ")}]</span>
            </div>
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">{r.strategy}</span>
            <button onClick={() => remove(r)} className="text-text-muted hover:text-destructive text-[10px] font-display uppercase">del</button>
          </div>
        ))}
        {routes.length === 0 && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO ROUTES — ADD ONE</div>}
      </div>
    </section>
  );
}
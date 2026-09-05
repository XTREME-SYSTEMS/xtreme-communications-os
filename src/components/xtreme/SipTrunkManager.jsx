import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Network } from "lucide-react";

const STATUS_LED = { connected: "bg-status-green", disconnected: "bg-text-muted", pending: "bg-chart-4", credentials_required: "bg-destructive" };

export default function SipTrunkManager({ trunks, tenants, onMutate }) {
  const { toast } = useToast();
  const [tenant_id, setTid] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("bidirectional");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(5060);
  const [transport, setTransport] = useState("udp");

  const add = async () => {
    if (!tenant_id) { toast({ title: "Select a tenant", variant: "destructive" }); return; }
    if (!name.trim()) { toast({ title: "Trunk name required", variant: "destructive" }); return; }
    try {
      await base44.entities.SipTrunk.create({
        tenant_id, name: name.trim(), type, protocol: "sip", host: host.trim(),
        port: Number(port), transport, status: "credentials_required", channels: 1, codec: "PCMU", enabled: false,
      });
      setName(""); setHost("");
      toast({ title: "Trunk created", description: "status: credentials_required" });
      onMutate();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const toggle = async (t) => {
    try { await base44.entities.SipTrunk.update(t.id, { enabled: !t.enabled }); onMutate(); } catch (e) {}
  };
  const del = async (t) => { try { await base44.entities.SipTrunk.delete(t.id); onMutate(); } catch (e) {} };

  const input = "w-full h-8 bg-base border border-surface-border rounded px-2 text-[11px] text-text-primary focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">SIP / Trunking Engines</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{trunks.length} TRUNKS</span>
      </div>
      <div className="p-3 border-b border-surface-border space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={tenant_id} onChange={e => setTid(e.target.value)}>
            <option value="">— tenant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Trunk name" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select className={input} value={type} onChange={e => setType(e.target.value)}>
            <option value="inbound">inbound</option><option value="outbound">outbound</option><option value="bidirectional">bidirectional</option>
          </select>
          <input className={input} value={host} onChange={e => setHost(e.target.value)} placeholder="sip.host" />
          <input className={input} type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="5060" />
        </div>
        <div className="flex gap-2">
          <select className={input} value={transport} onChange={e => setTransport(e.target.value)}>
            <option value="udp">udp</option><option value="tcp">tcp</option><option value="tls">tls</option>
          </select>
          <button onClick={add} className="flex-1 h-8 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10 flex items-center justify-center gap-1">
            <Plus className="h-3 w-3" /> Add Trunk
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[300px] divide-y divide-surface-border">
        {trunks.map(t => {
          const ten = tenants.find(x => x.id === t.tenant_id);
          return (
            <div key={t.id} className="px-4 py-2.5 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", STATUS_LED[t.status] || "bg-text-muted", t.enabled && t.status === "connected" && "animate-pulse")} />
              <Network className="h-3 w-3 text-text-muted" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text-primary truncate">{t.name}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">{ten?.name || "—"} · {t.transport}/{t.host || "—"}:{t.port} · {t.type}</div>
              </div>
              <button onClick={() => toggle(t)} className={cn("text-[9px] font-display uppercase tracking-wider border rounded px-1",
                t.enabled ? "border-status-green/40 text-status-green" : "border-surface-border text-text-muted")}>{t.enabled ? "on" : "off"}</button>
              <button onClick={() => del(t)} className="text-text-muted hover:text-destructive text-[10px] font-display uppercase">del</button>
            </div>
          );
        })}
        {trunks.length === 0 && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO TRUNKS</div>}
      </div>
    </section>
  );
}
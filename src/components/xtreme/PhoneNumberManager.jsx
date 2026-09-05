import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Phone } from "lucide-react";

const STATUS_LED = { available: "bg-text-muted", assigned: "bg-status-green", porting: "bg-chart-4", released: "bg-destructive", reserved: "bg-chart-3", sandbox: "bg-chart-4" };
const CAPS = ["voice", "sms", "mms", "whatsapp"];

export default function PhoneNumberManager({ numbers, tenants, providers, onMutate }) {
  const { toast } = useToast();
  const [tenant_id, setTid] = useState("");
  const [e164, setE164] = useState("");
  const [type, setType] = useState("local");
  const [caps, setCaps] = useState(["voice", "sms"]);

  const toggleCap = (c) => setCaps(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const provision = async () => {
    if (!tenant_id) { toast({ title: "Select a tenant", variant: "destructive" }); return; }
    if (!e164.trim()) { toast({ title: "E.164 required", variant: "destructive" }); return; }
    try {
      const connected = providers.find(p => p.status === "connected" && p.enabled);
      await base44.entities.PhoneNumber.create({
        e164: e164.trim(), tenant_id, country_code: "US", type,
        capabilities: caps, status: connected ? "assigned" : "sandbox",
        classification: connected ? "PROVIDER-BACKED" : "SANDBOX",
        provider_id: connected ? connected.id : null, monthly_cost: 1.15,
        purchased_at: new Date().toISOString(),
      });
      setE164("");
      toast({ title: "Number provisioned", description: connected ? `via ${connected.name}` : "sandbox — credentials_required" });
      onMutate();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const release = async (n) => {
    try { await base44.entities.PhoneNumber.update(n.id, { status: "released", classification: "SANDBOX" }); onMutate(); }
    catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const input = "w-full h-8 bg-base border border-surface-border rounded px-2 text-[11px] text-text-primary focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Phone Number Inventory</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{numbers.length} DIDs</span>
      </div>
      <div className="p-3 border-b border-surface-border space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={tenant_id} onChange={e => setTid(e.target.value)}>
            <option value="">— tenant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={input} value={e164} onChange={e => setE164(e.target.value)} placeholder="+1XXXXXXXXXX" />
        </div>
        <div className="flex gap-2 items-center">
          <select className={input} value={type} onChange={e => setType(e.target.value)}>
            <option value="local">local</option><option value="toll_free">toll_free</option><option value="mobile">mobile</option><option value="shortcode">shortcode</option>
          </select>
          <div className="flex gap-1">
            {CAPS.map(c => (
              <button key={c} onClick={() => toggleCap(c)}
                className={cn("h-8 px-2 rounded border text-[10px] font-display uppercase tracking-wider",
                  caps.includes(c) ? "border-accent-orange/50 text-accent-orange bg-accent-orange/10" : "border-surface-border text-text-muted")}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <button onClick={provision} className="w-full h-8 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10 flex items-center justify-center gap-1">
          <Plus className="h-3 w-3" /> Provision Number
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[300px] divide-y divide-surface-border">
        {numbers.map(n => {
          const t = tenants.find(x => x.id === n.tenant_id);
          const p = providers.find(x => x.id === n.provider_id);
          return (
            <div key={n.id} className="px-4 py-2.5 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", STATUS_LED[n.status] || "bg-text-muted")} />
              <Phone className="h-3 w-3 text-text-muted" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text-primary truncate">{n.e164}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">{t?.name || "—"} · {n.type} · {p?.name || "sandbox"}</div>
              </div>
              <span className={cn("text-[9px] font-display uppercase tracking-wider border rounded px-1",
                n.classification === "PROVIDER-BACKED" ? "border-status-green/40 text-status-green" : "border-chart-4/40 text-chart-4")}>{n.classification}</span>
              {n.status !== "released" && <button onClick={() => release(n)} className="text-text-muted hover:text-destructive text-[10px] font-display uppercase">release</button>}
            </div>
          );
        })}
        {numbers.length === 0 && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO NUMBERS</div>}
      </div>
    </section>
  );
}
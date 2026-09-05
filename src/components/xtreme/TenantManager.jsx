import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Key } from "lucide-react";

const STATUS_LED = { active: "bg-status-green", suspended: "bg-destructive", provisioning: "bg-chart-4" };

export default function TenantManager({ tenants, onMutate }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("starter");

  const add = async () => {
    if (!name.trim()) return;
    try {
      const t = await base44.entities.Tenant.create({ name: name.trim(), status: "active", plan });
      const key = "xcom_live_" + Math.random().toString(36).slice(2, 14);
      await base44.entities.ApiKey.create({ tenant_id: t.id, label: "default", key_value: key, scopes: ["messages", "calls"], status: "active" });
      setName("");
      toast({ title: "Tenant provisioned", description: `API key: ${key}` });
      onMutate();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const input = "flex-1 h-8 bg-base border border-surface-border rounded px-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Multi-Tenant Accounts</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{tenants.length} TENANTS</span>
      </div>
      <div className="p-3 border-b border-surface-border flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Tenant name" className={input} />
        <select value={plan} onChange={e => setPlan(e.target.value)} className="h-8 bg-base border border-surface-border rounded px-2 text-[11px] text-text-primary">
          <option value="starter">starter</option><option value="growth">growth</option><option value="enterprise">enterprise</option>
        </select>
        <button onClick={add} className="h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10 flex items-center gap-1">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[260px] divide-y divide-surface-border">
        {tenants.map(t => (
          <div key={t.id} className="px-4 py-2.5 flex items-center gap-3">
            <span className={cn("h-2 w-2 rounded-full", STATUS_LED[t.status])} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-text-primary truncate">{t.name}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{t.plan} · {t.status}</div>
            </div>
            <Key className="h-3 w-3 text-text-muted" />
          </div>
        ))}
        {tenants.length === 0 && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO TENANTS</div>}
      </div>
    </section>
  );
}
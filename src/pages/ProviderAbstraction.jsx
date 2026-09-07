import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import ProviderCard from "@/components/xtreme/ProviderCard";
import ProviderForm from "@/components/xtreme/ProviderForm";
import RoutingMatrix from "@/components/xtreme/RoutingMatrix";

export default function ProviderAbstraction() {
  const { toast } = useToast();
  const [providers, setProviders] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testing, setTesting] = useState(null);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      base44.entities.Provider.list("-priority", 50),
      base44.entities.ProviderRoute.list("-created_date", 50),
    ]);
    setProviders(p); setRoutes(r); setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const save = async (form) => {
    try {
      if (editing) await base44.entities.Provider.update(editing.id, form);
      else await base44.entities.Provider.create({ ...form, status: "credentials_required" });
      setShowForm(false); setEditing(null);
      toast({ title: editing ? "Provider updated" : "Provider added" });
      await load();
    } catch (e) { toast({ title: "Save failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const remove = async (p) => {
    try { await base44.entities.Provider.delete(p.id); await load(); toast({ title: "Provider removed" }); }
    catch (e) { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const toggle = async (p) => {
    try { await base44.entities.Provider.update(p.id, { enabled: !p.enabled }); await load(); }
    catch (e) { toast({ title: "Toggle failed", variant: "destructive" }); }
  };

  const test = async (p) => {
    setTesting(p.id);
    try {
      const res = await base44.functions.invoke("testProviderConnection", { provider: { id: p.id, type: p.type, base_url: p.base_url } });
      const data = res.data || res;
      await base44.entities.Provider.update(p.id, {
        last_tested_at: new Date().toISOString(),
        last_test_result: data.status,
        status: data.verified ? "connected" : (data.status === "credentials_required" ? "credentials_required" : "disconnected"),
      });
      toast({ title: `Connection: ${data.status}`, description: data.detail || "", variant: data.verified ? "default" : "destructive" });
      await load();
    } catch (e) { toast({ title: "Test failed", description: String(e.message || e), variant: "destructive" }); }
    finally { setTesting(null); }
  };

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Provider Abstraction Layer</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">Strategic Minds AI · multi-carrier adapter</span>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[11px] font-display uppercase tracking-wider hover:bg-accent-orange/10">
          <Plus className="h-3.5 w-3.5" /> Add Provider
        </button>
      </div>

      <div className="p-4 lg:p-6 grid xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          {showForm && <ProviderForm value={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(null); }} />}
          {loading && <div className="text-[12px] text-text-muted font-display tracking-wider">LOADING PROVIDERS…</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            {providers.map(p => (
              <ProviderCard key={p.id} provider={p} testing={testing}
                onTest={test} onEdit={(prov) => { setEditing(prov); setShowForm(true); }} onDelete={remove} onToggle={toggle} />
            ))}
            {!loading && providers.length === 0 && !showForm && (
              <div className="text-[12px] text-text-muted font-display tracking-wider col-span-2">NO PROVIDERS — ADD ONE TO BEGIN</div>
            )}
          </div>
        </div>
        <div>
          <RoutingMatrix routes={routes} providers={providers} onMutate={load} />
        </div>
      </div>
    </div>
  );
}
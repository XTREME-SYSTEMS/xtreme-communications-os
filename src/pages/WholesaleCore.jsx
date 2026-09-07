import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Database } from "lucide-react";
import TenantManager from "@/components/xtreme/TenantManager";
import ApiRouteManager from "@/components/xtreme/ApiRouteManager";
import WebhookManager from "@/components/xtreme/WebhookManager";

export default function WholesaleCore() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);

  const load = useCallback(async () => {
    const [t, r, w, p] = await Promise.all([
      base44.entities.Tenant.list("-created_date", 50),
      base44.entities.ApiRoute.list("-created_date", 50),
      base44.entities.WebhookDispatcher.list("-created_date", 50),
      base44.entities.Provider.list("-priority", 50),
    ]);
    setTenants(t); setRoutes(r); setWebhooks(w); setProviders(p); setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const provision = async () => {
    setProvisioning(true);
    try {
      const res = await base44.functions.invoke("provisionSupabaseSchema", {});
      const d = res.data || res;
      toast({ title: `Supabase: ${d.status}`, description: d.detail || "", variant: d.status === "provisioned" ? "default" : "destructive" });
    } catch (e) { toast({ title: "Provision failed", description: String(e.message || e), variant: "destructive" }); }
    finally { setProvisioning(false); }
  };

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Wholesale Core</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">Strategic Minds AI · CaaS gateway · Supabase system of record</span>
        </div>
        <button onClick={provision} disabled={provisioning}
          className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded border border-status-green/40 text-status-green text-[11px] font-display uppercase tracking-wider hover:bg-status-green/10 disabled:opacity-50">
          <Database className="h-3.5 w-3.5" /> {provisioning ? "Provisioning" : "Provision Supabase"}
        </button>
      </div>
      <div className="p-4 lg:p-6 grid lg:grid-cols-2 gap-4">
        <TenantManager tenants={tenants} onMutate={load} />
        <ApiRouteManager routes={routes} tenants={tenants} providers={providers} onMutate={load} />
        <div className="lg:col-span-2"><WebhookManager webhooks={webhooks} tenants={tenants} onMutate={load} /></div>
      </div>
    </div>
  );
}
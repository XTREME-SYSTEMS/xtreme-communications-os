import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import PhoneNumberManager from "@/components/xtreme/PhoneNumberManager";
import SipTrunkManager from "@/components/xtreme/SipTrunkManager";

export default function NumberManagement() {
  const [numbers, setNumbers] = useState([]);
  const [trunks, setTrunks] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [n, t, ten, p] = await Promise.all([
      base44.entities.PhoneNumber.list("-created_date", 100),
      base44.entities.SipTrunk.list("-created_date", 100),
      base44.entities.Tenant.list("-created_date", 50),
      base44.entities.Provider.list("-priority", 50),
    ]);
    setNumbers(n); setTrunks(t); setTenants(ten); setProviders(p); setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Number Management</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">XTREME COMMUNICATIONS · DIDs + SIP/trunk routing</span>
        </div>
      </div>
      <div className="p-4 lg:p-6 grid lg:grid-cols-2 gap-4">
        <PhoneNumberManager numbers={numbers} tenants={tenants} providers={providers} onMutate={load} />
        <SipTrunkManager trunks={trunks} tenants={tenants} onMutate={load} />
      </div>
    </div>
  );
}
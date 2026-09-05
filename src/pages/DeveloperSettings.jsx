import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Terminal } from "lucide-react";
import ApiKeyManager from "@/components/xtreme/ApiKeyManager";

const ENDPOINTS = [
  { method: "POST", path: "/v1/messages", desc: "Send SMS / MMS / WhatsApp" },
  { method: "POST", path: "/v1/calls", desc: "Place a voice call via SIP trunk" },
  { method: "POST", path: "/v1/verify", desc: "Send / check verification OTP" },
  { method: "POST", path: "/v1/lookups", desc: "Number lookup + line-type classification" },
  { method: "POST", path: "/v1/numbers/provision", desc: "Provision or bulk-import numbers" },
];

export default function DeveloperSettings() {
  const [tenants, setTenants] = useState([]);
  const load = useCallback(async () => {
    try { setTenants(await base44.entities.Tenant.list("-created_date", 50)); } catch (_) {}
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Developer · API Keys</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">XTREME COMMUNICATIONS · public authentication surface</span>
        </div>
      </div>
      <div className="p-4 lg:p-6 grid lg:grid-cols-2 gap-4">
        <ApiKeyManager tenants={tenants} onMutate={load} />
        <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
          <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
            <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-status-green" /> Public Endpoints
            </span>
            <span className="text-[10px] font-display tracking-wider text-text-muted">v1</span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="flex items-center gap-3 px-3 py-2 rounded border border-surface-border bg-base/40">
                <span className="text-[10px] font-display uppercase tracking-wider text-accent-orange w-12">{e.method}</span>
                <span className="text-[12px] font-mono text-text-primary flex-1 truncate">{e.path}</span>
                <span className="text-[10px] text-text-muted uppercase tracking-wider hidden sm:block">{e.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto px-4 py-3 border-t border-surface-border text-[10px] font-display tracking-[0.15em] text-text-muted uppercase leading-relaxed">
            Authenticate with: Authorization: Bearer xcom_live_…
          </div>
        </section>
      </div>
    </div>
  );
}
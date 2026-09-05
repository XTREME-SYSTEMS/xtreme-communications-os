import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Copy, RefreshCw, Trash2, KeyRound, Check, Ban } from "lucide-react";

const SCOPES = ["messages", "calls", "verify", "lookup", "numbers", "webhooks"];

export default function ApiKeyManager({ tenants, onMutate }) {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState(["messages", "calls"]);
  const [pasteKey, setPasteKey] = useState("");

  const loadKeys = async (tid) => {
    if (!tid) { setKeys([]); return; }
    setLoading(true);
    try {
      setKeys(await base44.entities.ApiKey.filter({ tenant_id: tid }));
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const select = (tid) => { setTenantId(tid); loadKeys(tid); };

  const gen = async () => {
    if (!tenantId) { toast({ title: "Select a tenant", variant: "destructive" }); return; }
    const value = "xcom_live_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    try {
      await base44.entities.ApiKey.create({ tenant_id: tenantId, label: label || "default", key_value: value, scopes, status: "active" });
      setLabel("");
      toast({ title: "Key generated", description: value });
      loadKeys(tenantId); onMutate?.();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const copy = async (k) => {
    try { await navigator.clipboard.writeText(k.key_value); setCopied(k.id); setTimeout(() => setCopied(null), 1500); } catch (_) {}
  };

  const importKey = async () => {
    if (!tenantId) { toast({ title: "Select a tenant", variant: "destructive" }); return; }
    if (!pasteKey.trim()) { toast({ title: "Paste a key first", variant: "destructive" }); return; }
    try {
      await base44.entities.ApiKey.create({ tenant_id: tenantId, label: label || "imported", key_value: pasteKey.trim(), scopes, status: "active" });
      setPasteKey(""); setLabel("");
      toast({ title: "Key imported", description: "Your API key is now active." });
      loadKeys(tenantId); onMutate?.();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const roll = async (k) => {
    const value = "xcom_live_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    try {
      await base44.entities.ApiKey.create({ tenant_id: k.tenant_id, label: (k.label || "default") + " (rolled)", key_value: value, scopes: k.scopes || [], status: "active" });
      await base44.entities.ApiKey.update(k.id, { status: "revoked" });
      toast({ title: "Key rolled", description: value });
      loadKeys(tenantId); onMutate?.();
    } catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const revoke = async (k) => {
    try { await base44.entities.ApiKey.update(k.id, { status: "revoked" }); toast({ title: "Key revoked" }); loadKeys(tenantId); }
    catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const del = async (k) => {
    try { await base44.entities.ApiKey.delete(k.id); toast({ title: "Key deleted" }); loadKeys(tenantId); onMutate?.(); }
    catch (e) { toast({ title: "Failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const toggleScope = (s) => setScopes((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  const input = "flex-1 h-8 bg-base border border-surface-border rounded px-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/50";

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-accent-orange" /> Public API Keys
        </span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{keys.length} KEYS</span>
      </div>
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <select className={input} value={tenantId} onChange={(e) => select(e.target.value)}>
          <option value="">— select tenant —</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label (optional)" className={input} />
          <button onClick={gen} className="h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10 flex items-center gap-1 shrink-0">
            <Plus className="h-3 w-3" /> Generate
          </button>
        </div>
        <div className="flex gap-2">
          <input value={pasteKey} onChange={(e) => setPasteKey(e.target.value)} placeholder="Paste your own API key…" className={cn(input, "font-mono")} type="text" />
          <button onClick={importKey} className="h-8 px-3 rounded border border-status-green/50 text-status-green text-[10px] font-display uppercase tracking-wider hover:bg-status-green/10 flex items-center gap-1 shrink-0">
            <KeyRound className="h-3 w-3" /> Import
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {SCOPES.map((s) => (
            <button key={s} onClick={() => toggleScope(s)}
              className={cn("px-2 h-6 rounded text-[10px] font-display uppercase tracking-wider border",
                scopes.includes(s) ? "border-accent-orange/50 text-accent-orange bg-accent-orange/10" : "border-surface-border text-text-muted")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[340px] divide-y divide-surface-border">
        {loading && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">LOADING…</div>}
        {!loading && keys.map((k) => (
          <div key={k.id} className="px-4 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full shrink-0", k.status === "active" ? "bg-status-green" : "bg-text-muted")} />
              <span className="text-[12px] text-text-primary flex-1 truncate font-mono">{k.key_value}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">{k.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => copy(k)} className="h-6 px-2 rounded border border-surface-border text-text-muted hover:text-text-primary text-[10px] font-display uppercase flex items-center gap-1">
                {copied === k.id ? <Check className="h-3 w-3 text-status-green" /> : <Copy className="h-3 w-3" />} Copy
              </button>
              <button onClick={() => roll(k)} className="h-6 px-2 rounded border border-surface-border text-text-muted hover:text-accent-orange text-[10px] font-display uppercase flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Roll
              </button>
              <button onClick={() => revoke(k)} className="h-6 px-2 rounded border border-surface-border text-text-muted hover:text-chart-4 text-[10px] font-display uppercase flex items-center gap-1">
                <Ban className="h-3 w-3" /> Revoke
              </button>
              <button onClick={() => del(k)} className="h-6 px-2 rounded border border-surface-border text-text-muted hover:text-destructive text-[10px] font-display uppercase flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Del
              </button>
            </div>
          </div>
        ))}
        {!loading && keys.length === 0 && tenantId && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO KEYS</div>}
        {!tenantId && !loading && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">SELECT A TENANT</div>}
      </div>
    </section>
  );
}
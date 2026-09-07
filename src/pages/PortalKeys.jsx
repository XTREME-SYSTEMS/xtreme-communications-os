import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { KeyRound, Plus, Copy, Check, Trash2, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

const SCOPES = ["sms", "mms", "voice", "whatsapp", "email", "numbers", "agents", "lookup", "verify"];

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "xck_";
  for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

export default function PortalKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ label: "", scopes: ["sms", "voice"] });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.ApiKey.filter({ tenant_id: user?.id || "default" });
      setKeys(list);
    } catch (_) {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.label) { toast({ title: "Label required", variant: "destructive" }); return; }
    const key = generateApiKey();
    try {
      await base44.entities.ApiKey.create({
        tenant_id: user?.id || "default",
        label: form.label,
        key_value: key,
        scopes: form.scopes,
        status: "active",
      });
      setNewKey(key);
      setForm({ label: "", scopes: ["sms", "voice"] });
      setShowForm(false);
      await load();
      toast({ title: "API Key created!", description: "Copy it now — you won't see it again." });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id) => {
    try {
      await base44.entities.ApiKey.update(id, { status: "revoked" });
      toast({ title: "Key revoked" });
      await load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const toggleScope = (scope) => {
    const scopes = form.scopes.includes(scope) ? form.scopes.filter(s => s !== scope) : [...form.scopes, scope];
    setForm({ ...form, scopes });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage API keys for your integrations.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Key
          </button>
        </div>
      </div>

      {/* New Key Display */}
      {newKey && (
        <div className="rounded-xl border border-primary bg-primary/5 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-medium text-foreground">Your New API Key</h2>
          </div>
          <p className="text-xs text-destructive mb-3">⚠️ Copy this key now. For security, it won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-xs font-mono text-foreground overflow-x-auto">{newKey}</code>
            <button onClick={() => copyKey(newKey)} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Label *</label>
            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Production, Mobile App, Webhook" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scopes</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SCOPES.map(s => (
                <button key={s} onClick={() => toggleScope(s)}
                  className={cn("px-3 py-1.5 rounded-lg border text-sm capitalize",
                    form.scopes.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create Key</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-foreground mb-3">Your API Keys ({keys.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <KeyRound className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div className="flex items-center gap-3">
                  <KeyRound className={cn("h-4 w-4", k.status === "active" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{k.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{k.key_value?.slice(0, 8)}••••••••••••••••</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {(k.scopes || []).slice(0, 3).map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-accent text-[9px] text-muted-foreground uppercase">{s}</span>
                    ))}
                    {(k.scopes || []).length > 3 && <span className="text-[9px] text-muted-foreground">+{k.scopes.length - 3}</span>}
                  </div>
                  <span className={cn("text-xs", k.status === "active" ? "text-primary" : "text-destructive")}>{k.status}</span>
                  {k.status === "active" && (
                    <button onClick={() => handleRevoke(k.id)} className="text-muted-foreground hover:text-destructive" title="Revoke">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-foreground mb-2">API Endpoint</h2>
        <code className="block px-3 py-2 rounded-lg bg-accent text-xs font-mono text-muted-foreground">https://xtreme-communications.com/functions/{'<function_name>'}</code>
        <p className="text-xs text-muted-foreground mt-2">Use your API key in the Authorization header: <code className="text-foreground">Bearer YOUR_API_KEY</code></p>
        <p className="text-xs text-muted-foreground mt-1">Use your Account SID in the <code className="text-foreground">X-Account-SID</code> header.</p>
      </div>
    </div>
  );
}
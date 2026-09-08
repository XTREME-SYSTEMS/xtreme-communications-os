import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Shield, Users, Phone, PhoneCall, KeyRound, DollarSign, Activity, Brain, Eye, ArrowLeft, Loader2, CheckCircle2, AlertCircle, RefreshCw, Plus, Copy, Trash2, X, Check, BookOpen, ExternalLink } from "lucide-react";
import LiveCallViewer from "@/components/admin/LiveCallViewer";

const ADMIN_SCOPES = ["sms", "mms", "voice", "whatsapp", "email", "numbers", "agents", "lookup", "verify", "billing", "admin"];

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "xck_";
  for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

export default function AdminPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({ users: 0, subscriptions: 0, numbers: 0, keys: 0, revenue: 0, agents: 0 });
  const [subscriptions, setSubscriptions] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyForm, setKeyForm] = useState({ label: "", scopes: ["admin"] });
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setRefreshing(true);
    try {
      const [subs, nums, kList, agents, userList] = await Promise.all([
        base44.entities.CustomerSubscription.list('-created_date', 100).catch(() => []),
        base44.entities.PhoneNumber.list('-created_date', 100).catch(() => []),
        base44.entities.ApiKey.list('-created_date', 100).catch(() => []),
        base44.entities.AgentPersona.list('-created_date', 100).catch(() => []),
        base44.entities.User.list('-created_date', 200).catch(() => []),
      ]);
      setSubscriptions(subs || []);
      setNumbers(nums || []);
      setKeys(kList || []);
      setUsers(userList || []);
      const revenue = (subs || []).filter(s => s.status === "active").reduce((sum, s) => {
        const planPrices = { starter: 49, essential: 99, professional: 149, growth: 199, enterprise: 499, pay_as_you_go: 0 };
        return sum + (planPrices[s.plan] || 0);
      }, 0);
      setStats({ users: (subs || []).length, subscriptions: (subs || []).length, numbers: (nums || []).length, keys: (kList || []).length, revenue, agents: (agents || []).length });
    } catch (e) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
    setLoading(false);
    setRefreshing(false);
  };

  const toggleScope = (s) => {
    setKeyForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(s) ? prev.scopes.filter(x => x !== s) : [...prev.scopes, s],
    }));
  };

  const handleCreateKey = async () => {
    if (!keyForm.label.trim()) { toast({ title: "Label required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const keyValue = generateApiKey();
      const created = await base44.entities.ApiKey.create({
        label: keyForm.label.trim(),
        key_value: keyValue,
        scopes: keyForm.scopes,
        status: "active",
        tenant_id: "admin",
      });
      setKeys(prev => [created, ...prev]);
      setNewKey(keyValue);
      setKeyForm({ label: "", scopes: ["admin"] });
      setShowKeyForm(false);
      setStats(prev => ({ ...prev, keys: prev.keys + 1 }));
      toast({ title: "API key created", description: "Copy it now — it won't be shown again." });
    } catch (e) {
      toast({ title: "Failed to create key", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleRevokeKey = async (id) => {
    try {
      await base44.entities.ApiKey.update(id, { status: "revoked" });
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status: "revoked" } : k));
      toast({ title: "Key revoked" });
    } catch (e) {
      toast({ title: "Revoke failed", description: e.message, variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast({ title: "Email required", variant: "destructive" }); return; }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast({ title: "Invitation sent", description: `${inviteEmail} invited as ${inviteRole}` });
      setInviteEmail("");
      await load();
    } catch (e) { toast({ title: "Invite failed", description: e.message, variant: "destructive" }); }
    setInviting(false);
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await base44.entities.User.update(id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      toast({ title: "Role updated", description: `User is now ${newRole}` });
    } catch (e) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;

  const TABS = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Subscriptions", icon: Users },
    { id: "numbers", label: "Phone Numbers", icon: Phone },
    { id: "keys", label: "API Keys", icon: KeyRound },
    { id: "team", label: "Team & Emails", icon: Users },
    { id: "vision", label: "Vision Cortex", icon: Eye },
    { id: "calls", label: "Live Calls", icon: PhoneCall },
    { id: "docs", label: "Core Docs", icon: BookOpen },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Portal</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">System administration and monitoring</p>
          </div>
          <button onClick={load} disabled={refreshing} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-thin">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Live Calls */}
      {tab === "calls" && <LiveCallViewer />}

      {/* Core Docs */}
      {tab === "docs" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-foreground">Core Documentation</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Complete system reference for XTREME Communications OS — covering all entities, backend functions, integrations, API endpoints, and architecture.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {[
              { label: "Data Entities", count: "30+", desc: "All stored data models" },
              { label: "Backend Functions", count: "46+", desc: "Server-side operations" },
              { label: "Integrations", count: "14+", desc: "Connected services" },
              { label: "Communication Channels", count: "5", desc: "Voice, SMS, WhatsApp, Email, Social" },
              { label: "AI Features", count: "6+", desc: "Agents, templates, testing, replicas" },
              { label: "Creative Tools", count: "8+", desc: "Images, videos, social, brand" },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-accent/30 p-3">
                <p className="text-2xl font-display font-bold text-primary">{s.count}</p>
                <p className="text-xs font-medium text-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <a href="/core-docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <BookOpen className="h-4 w-4" /> Open Full Documentation <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Subscriptions", value: stats.subscriptions, icon: Users, color: "text-primary" },
              { label: "Phone Numbers", value: stats.numbers, icon: Phone, color: "text-chart-2" },
              { label: "AI Agents", value: stats.agents, icon: Brain, color: "text-chart-3" },
              { label: "API Keys", value: stats.keys, icon: KeyRound, color: "text-chart-4" },
              { label: "Monthly Revenue", value: `$${stats.revenue}`, icon: DollarSign, color: "text-status-green" },
              { label: "Active Users", value: stats.users, icon: Activity, color: "text-primary" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2"><s.icon className={cn("h-5 w-5", s.color)} /></div>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-foreground mb-3">System Health</h2>
            <div className="space-y-2">
              {[
                { label: "Payment Processing", status: "active", icon: CheckCircle2 },
                { label: "Telnyx Provider", status: "connected", icon: CheckCircle2 },
                { label: "Supabase Database", status: "connected", icon: CheckCircle2 },
                { label: "Google Calendar", status: "connected", icon: CheckCircle2 },
                { label: "Gmail Integration", status: "connected", icon: CheckCircle2 },
                { label: "Vision Cortex", status: "pending", icon: AlertCircle },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4", item.status === "active" || item.status === "connected" ? "text-status-green" : "text-primary")} />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <span className={cn("text-xs capitalize", item.status === "active" || item.status === "connected" ? "text-status-green" : "text-primary")}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions */}
      {tab === "users" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium text-foreground mb-3">Customer Subscriptions ({subscriptions.length})</h2>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet.</p>
          ) : (
            <div className="space-y-2">
              {subscriptions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.company_name || s.buyer_email || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">Plan: <span className="capitalize">{s.plan?.replace(/_/g, ' ')}</span> · Status: <span className="capitalize">{s.status}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", s.status === "active" ? "bg-status-green" : s.status === "trial" ? "bg-primary" : "bg-muted-foreground")} />
                    <span className="text-xs text-muted-foreground">{s.onboarding_completed ? "Onboarded" : "In Progress"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Numbers */}
      {tab === "numbers" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium text-foreground mb-3">All Phone Numbers ({numbers.length})</h2>
          {numbers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No phone numbers yet.</p>
          ) : (
            <div className="space-y-2">
              {numbers.map(n => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.e164}</p>
                    <p className="text-xs text-muted-foreground capitalize">{n.type} · {n.status} · {(n.capabilities || []).join(", ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{n.classification || "SANDBOX"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Keys */}
      {tab === "keys" && (
        <div className="space-y-4">
          {/* New key banner */}
          {newKey && (
            <div className="rounded-xl border border-primary bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">API Key Created — copy it now</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-foreground overflow-x-auto">{newKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 shrink-0">
                  {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>
              <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Dismiss</button>
            </div>
          )}

          {/* Generate button / form */}
          <div className="rounded-xl border border-border bg-card p-5">
            {!showKeyForm ? (
              <button onClick={() => setShowKeyForm(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg gold-gradient text-black font-medium hover:opacity-90">
                <Plus className="h-4 w-4" /> Generate Admin API Key
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-foreground">New API Key</h2>
                  <button onClick={() => setShowKeyForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Label *</label>
                  <input value={keyForm.label} onChange={e => setKeyForm({ ...keyForm, label: e.target.value })}
                    placeholder="e.g. Vision Cortex, Production, Internal Tool"
                    className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scopes</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ADMIN_SCOPES.map(s => (
                      <button key={s} onClick={() => toggleScope(s)}
                        className={cn("px-3 py-1.5 rounded-lg border text-sm capitalize",
                          keyForm.scopes.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateKey} disabled={creating}
                    className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Key
                  </button>
                  <button onClick={() => setShowKeyForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Keys list */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-foreground mb-3">All API Keys ({keys.length})</h2>
            {keys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No API keys yet. Generate one above.</p>
            ) : (
              <div className="space-y-2">
                {keys.map(k => (
                  <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{k.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{k.key_value?.slice(0, 12)}••••</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex gap-1">{(k.scopes || []).slice(0, 4).map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-accent text-[9px] text-muted-foreground uppercase">{s}</span>)}{(k.scopes || []).length > 4 && <span className="text-[9px] text-muted-foreground">+{k.scopes.length - 4}</span>}</div>
                      <span className={cn("text-xs", k.status === "active" ? "text-primary" : "text-destructive")}>{k.status}</span>
                      {k.status === "active" && (
                        <button onClick={() => handleRevokeKey(k.id)} className="text-muted-foreground hover:text-destructive" title="Revoke"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team & Emails */}
      {tab === "team" && (
        <div className="space-y-4">
          {/* Invite form */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-foreground mb-3">Invite Team Member</h2>
            <div className="flex gap-2">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com"
                className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleInvite} disabled={inviting}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Invite
              </button>
            </div>
          </div>

          {/* Users list */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-foreground mb-3">All Team Members ({users.length})</h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet. Invite team members above.</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {u.full_name?.[0] || u.email?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={u.role || "user"} onChange={e => handleRoleChange(u.id, e.target.value)}
                        className={cn("h-8 px-2 rounded-lg border text-xs font-medium",
                          u.role === "admin" ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {u.role === "admin" && <Shield className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vision Cortex */}
      {tab === "vision" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="font-medium text-foreground">Vision Cortex Connection</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Vision Cortex monitors the system, uses the platform, and auto-fixes/auto-heals issues autonomously.</p>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Connection Status: Pending</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Connect Vision Cortex by providing it with the API endpoint and an admin API key. Vision Cortex can then monitor system health, trigger autonomous audits, and auto-heal issues.</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">API Endpoint</p>
                  <code className="block px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-foreground">https://xtreme-communications.com/functions/</code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Admin API Key</p>
                  <p className="text-xs text-muted-foreground">Generate an admin API key from the <Link to="/portal/keys" className="text-primary hover:underline">API Keys page</Link> with full scopes.</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Autonomous Audit Endpoint</p>
                  <code className="block px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-foreground">POST /functions/runAutonomousAudit</code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Auto-Heal Endpoint</p>
                  <code className="block px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-foreground">POST /functions/preflightHeal</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
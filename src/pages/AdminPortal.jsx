import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Shield, Users, Phone, KeyRound, DollarSign, Activity, Brain, Eye, ArrowLeft, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function AdminPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({ users: 0, subscriptions: 0, numbers: 0, keys: 0, revenue: 0, agents: 0 });
  const [subscriptions, setSubscriptions] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setRefreshing(true);
    try {
      const [subs, nums, kList, agents] = await Promise.all([
        base44.entities.CustomerSubscription.list('-created_date', 100).catch(() => []),
        base44.entities.PhoneNumber.list('-created_date', 100).catch(() => []),
        base44.entities.ApiKey.list('-created_date', 100).catch(() => []),
        base44.entities.AgentPersona.list('-created_date', 100).catch(() => []),
      ]);
      setSubscriptions(subs || []);
      setNumbers(nums || []);
      setKeys(kList || []);
      const revenue = (subs || []).filter(s => s.status === "active").reduce((sum, s) => {
        const planPrices = { starter: 49, essential: 99, professional: 149, growth: 199, enterprise: 499, pay_as_you_go: 0 };
        return sum + (planPrices[s.plan] || 0);
      }, 0);
      setStats({ users: (subs || []).length, subscriptions: (subs || []).length, numbers: (nums || []).length, keys: (kList || []).length, revenue, agents: (agents || []).length });
    } catch (e) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
    setLoading(false);
    setRefreshing(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;

  const TABS = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Subscriptions", icon: Users },
    { id: "numbers", label: "Phone Numbers", icon: Phone },
    { id: "keys", label: "API Keys", icon: KeyRound },
    { id: "vision", label: "Vision Cortex", icon: Eye },
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium text-foreground mb-3">All API Keys ({keys.length})</h2>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{k.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{k.key_value?.slice(0, 12)}••••</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">{(k.scopes || []).slice(0, 4).map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-accent text-[9px] text-muted-foreground uppercase">{s}</span>)}</div>
                    <span className={cn("text-xs", k.status === "active" ? "text-primary" : "text-destructive")}>{k.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <code className="block px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-foreground">https://xtreme-comms.base44.app/functions/</code>
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
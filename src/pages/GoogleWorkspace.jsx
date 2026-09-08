import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { HardDrive, Mail, Calendar, CheckCircle2, Loader2, RefreshCw, Brain, FileText, Palette, MemoryStick, Link2, Unlink } from "lucide-react";

const CONNECTORS = [
  { id: "69db1e5e75a5f8c15c80cf34", type: "googledrive", name: "Google Drive", icon: HardDrive, color: "text-chart-2", desc: "Save intelligence, templates & creative assets" },
  { id: "69db200274332486fd28dd7e", type: "gmail", name: "Gmail", icon: Mail, color: "text-chart-3", desc: "Manage & link email templates with agent logs" },
  { id: "69ddcb305a599e0b4a1b3cff", type: "googlecalendar", name: "Google Calendar", icon: Calendar, color: "text-primary", desc: "Auto-log agent tasks & scheduling playbooks" },
];

const SYNC_TARGETS = [
  { id: "agent_memory", label: "Agent Memory", icon: MemoryStick, desc: "Sync conversation logs and action items" },
  { id: "ai_agents", label: "AI Agents", icon: Brain, desc: "Sync agent personas and prompts" },
  { id: "templates", label: "Templates", icon: FileText, desc: "Sync communication templates" },
  { id: "brand_kit", label: "Brand Kit", icon: Palette, desc: "Sync brand colors, fonts and assets" },
];

export default function GoogleWorkspace() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [connections, setConnections] = useState({});
  const [syncing, setSyncing] = useState(null);
  const [intelSyncing, setIntelSyncing] = useState(null);

  useEffect(() => {
    CONNECTORS.forEach(async (c) => {
      try {
        const res = await base44.functions.invoke("googleWorkspaceSync", { action: "status", connector_id: c.id });
        setConnections((prev) => ({ ...prev, [c.type]: { connected: true, data: res.data } }));
      } catch { setConnections((prev) => ({ ...prev, [c.type]: { connected: false } })); }
    });
  }, []);

  const connect = async (connector) => {
    try {
      const url = await base44.connectors.connectAppUser(connector.id);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkConnection(connector);
        }
      }, 500);
    } catch (e) { toast({ title: "Connect failed", description: e.message, variant: "destructive" }); }
  };

  const disconnect = async (connector) => {
    try {
      await base44.connectors.disconnectAppUser(connector.id);
      setConnections((prev) => ({ ...prev, [connector.type]: { connected: false } }));
      toast({ title: `${connector.name} disconnected` });
    } catch (e) { toast({ title: "Disconnect failed", description: e.message, variant: "destructive" }); }
  };

  const checkConnection = async (connector) => {
    try {
      const res = await base44.functions.invoke("googleWorkspaceSync", { action: "status", connector_id: connector.id });
      setConnections((prev) => ({ ...prev, [connector.type]: { connected: true, data: res.data } }));
    } catch { setConnections((prev) => ({ ...prev, [connector.type]: { connected: false } })); }
  };

  const syncService = async (connector) => {
    setSyncing(connector.type);
    try {
      const res = await base44.functions.invoke("googleWorkspaceSync", { action: `sync_${connector.type}`, connector_id: connector.id });
      toast({ title: `${connector.name} synced`, description: res.data?.summary || "Sync complete" });
      checkConnection(connector);
    } catch (e) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    setSyncing(null);
  };

  const syncIntelligence = async (target) => {
    setIntelSyncing(target.id);
    try {
      const res = await base44.functions.invoke("googleWorkspaceSync", { action: "sync_intelligence", target: target.id });
      toast({ title: `${target.label} synced`, description: res.data?.summary || "Intelligence synced to Google" });
    } catch (e) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    setIntelSyncing(null);
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">Google Workspace</h1>
          <p className="text-sm text-muted-foreground">Connect your Google account to sync intelligence, templates, and schedules across the platform.</p>
        </div>

        {/* Connection cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {CONNECTORS.map((c) => {
            const conn = connections[c.type];
            return (
              <div key={c.type} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><c.icon className={`h-5 w-5 ${c.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{c.name}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{c.desc}</p>
                  </div>
                </div>
                {conn?.connected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-status-green"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</div>
                    <button onClick={() => syncService(c)} disabled={syncing === c.type} className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50">
                      {syncing === c.type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync Now
                    </button>
                    <button onClick={() => disconnect(c)} className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-muted-foreground text-xs hover:bg-accent">
                      <Unlink className="h-3.5 w-3.5" /> Disconnect
                    </button>
                  </div>
                ) : conn?.connected === false ? (
                  <button onClick={() => connect(c)} className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                    <Link2 className="h-4 w-4" /> Connect
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Intelligence Sync */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-foreground">Xtreme Intelligence Sync</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Sync your intelligence data across all platform areas and back up to Google Drive.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SYNC_TARGETS.map((t) => (
              <button key={t.id} onClick={() => syncIntelligence(t)} disabled={intelSyncing === t.id}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-colors disabled:opacity-50">
                <t.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{t.desc}</span>
                {intelSyncing === t.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-sync settings */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-bold text-foreground mb-3">Auto-Sync Settings</h2>
          <div className="space-y-2">
            {[
              { label: "Auto-save company intelligence to Drive", desc: "New intelligence reports are backed up automatically" },
              { label: "Auto-link Gmail threads to agent memory", desc: "Email conversations are logged to agent memory" },
              { label: "Auto-log agent tasks to Calendar", desc: "Scheduled tasks appear on your Google Calendar" },
            ].map((s) => (
              <label key={s.label} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <div><p className="text-sm font-medium text-foreground">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { HardDrive, Mail, Calendar, CheckCircle2, Loader2, RefreshCw, Brain, FileText, Palette, MemoryStick, Link2, Unlink, Cloud, Clock, Zap, ListChecks, Sheet } from "lucide-react";

const SERVICES = [
  { type: "googledrive", name: "Google Drive", icon: HardDrive, color: "text-chart-2", desc: "Save intelligence, templates & creative assets to organized Drive folders" },
  { type: "gmail", name: "Gmail", icon: Mail, color: "text-chart-3", desc: "Link email threads to agent memory and send via Gmail integration" },
  { type: "googlecalendar", name: "Google Calendar", icon: Calendar, color: "text-primary", desc: "Auto-log agent tasks and scheduling playbooks to Calendar" },
  { type: "googletasks", name: "Google Tasks", icon: ListChecks, color: "text-chart-4", desc: "Sync agent action items to Google Tasks for follow-up tracking" },
  { type: "googledocs", name: "Google Docs", icon: FileText, color: "text-chart-5", desc: "Export intelligence reports and templates to Google Docs" },
  { type: "googlesheets", name: "Google Sheets", icon: Sheet, color: "text-status-green", desc: "Export campaign contacts and usage data to Google Sheets" },
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
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    SERVICES.forEach(async (s) => {
      try {
        const res = await base44.functions.invoke("googleWorkspaceSync", { action: "status", service: s.type });
        setConnections(prev => ({ ...prev, [s.type]: { connected: true, data: res.data } }));
      } catch {
        setConnections(prev => ({ ...prev, [s.type]: { connected: false } }));
      }
    });
  }, []);

  const syncService = async (service) => {
    setSyncing(service.type);
    try {
      const res = await base44.functions.invoke("googleWorkspaceSync", { action: `sync_${service.type}` });
      toast({ title: `${service.name} synced`, description: res.data?.summary || "Sync complete" });
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

  const syncAll = async () => {
    setSyncing("all");
    try {
      const results = await Promise.allSettled(
        SERVICES.map(s => base44.functions.invoke("googleWorkspaceSync", { action: `sync_${s.type}` }))
      );
      const success = results.filter(r => r.status === "fulfilled").length;
      toast({ title: "Full sync complete", description: `${success}/${SERVICES.length} services synced successfully` });
    } catch (e) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    setSyncing(null);
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-1">Google Workspace</h1>
            <p className="text-sm text-muted-foreground">Auto-sync intelligence, templates, and schedules across your Google Workspace.</p>
          </div>
          <button onClick={syncAll} disabled={syncing === "all"}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {syncing === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Sync All
          </button>
        </div>

        {/* Connection status banner */}
        <div className="rounded-xl border border-status-green/30 bg-status-green/5 p-4 mb-6 flex items-center gap-3">
          <Cloud className="h-5 w-5 text-status-green" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Shared Google Workspace Connected</p>
            <p className="text-xs text-muted-foreground">Your Google Drive, Gmail, Calendar, Tasks, Docs, and Sheets are connected and ready for auto-sync.</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-status-green" />
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {SERVICES.map(s => {
            const conn = connections[s.type];
            return (
              <div key={s.type} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{s.name}</h3>
                    {conn?.connected ? <span className="text-xs text-status-green flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Connected</span> :
                      conn?.connected === false ? <span className="text-xs text-muted-foreground">Not connected</span> :
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking...</span>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-tight">{s.desc}</p>
                <button onClick={() => syncService(s)} disabled={syncing === s.type || !conn?.connected}
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50">
                  {syncing === s.type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync Now
                </button>
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
          <p className="text-sm text-muted-foreground mb-4">Sync your intelligence data across all platform areas and back up to Google Workspace.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SYNC_TARGETS.map(t => (
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold text-foreground">Auto-Sync Settings</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} className="rounded" />
              <span className="text-xs text-muted-foreground">Enable auto-sync</span>
            </label>
          </div>
          <div className="space-y-2">
            {[
              { label: "Auto-save company intelligence to Drive", desc: "New intelligence reports are backed up to Google Drive automatically" },
              { label: "Auto-link Gmail threads to agent memory", desc: "Email conversations are logged to agent memory records" },
              { label: "Auto-log agent tasks to Calendar", desc: "Scheduled tasks appear on your Google Calendar" },
              { label: "Auto-sync action items to Google Tasks", desc: "Agent action items from conversations sync to Tasks" },
              { label: "Auto-export templates to Google Docs", desc: "New templates are exported to Google Docs for editing" },
              { label: "Auto-export campaign data to Google Sheets", desc: "Campaign contacts and metrics sync to Sheets" },
            ].map((s, i) => (
              <label key={s.label} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer">
                <input type="checkbox" defaultChecked={autoSync} className="rounded" />
                <div><p className="text-sm font-medium text-foreground">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
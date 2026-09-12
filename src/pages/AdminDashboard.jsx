import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Rocket, Calendar, Users, Activity, Settings, Phone,
  MessageSquare, PhoneCall, Mail, FileText, Loader2, Shield
} from "lucide-react";

export default function AdminDashboard() {
  const [agents, setAgents] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [ags, events, calRes, conts] = await Promise.all([
        base44.entities.AgentPersona.list('-created_date', 50).catch(() => []),
        base44.entities.CommsEvent.list('-created_date', 30).catch(() => []),
        base44.functions.invoke("googleCalendarAgent", { action: "view_schedule", days_ahead: 7 }).catch(() => ({ data: { events: [] } })),
        base44.entities.GoogleContact.list('-last_synced_at', 100).catch(() => []),
      ]);
      setAgents(ags || []);
      setRecentEvents(events || []);
      setCalendarEvents(calRes?.data?.events || []);
      setContacts(conts || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleAgent = async (agent) => {
    try {
      await base44.entities.AgentPersona.update(agent.id, { active: !agent.active });
      await load();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const allowedContacts = contacts.filter(c => c.agent_allowed).length;
  const activeAgents = agents.filter(a => a.active).length;

  const PRIORITY_CATEGORIES = [
    { title: "Agent Status", icon: Rocket, count: agents.length, active: activeAgents, color: "text-primary", bgColor: "bg-primary/10", path: "/portal/agent-factory" },
    { title: "Calendar Sync", icon: Calendar, count: calendarEvents.length, active: calendarEvents.length, color: "text-chart-3", bgColor: "bg-chart-3/10", path: "/portal/admin-dashboard" },
    { title: "Contact Permissions", icon: Users, count: contacts.length, active: allowedContacts, color: "text-chart-2", bgColor: "bg-chart-2/10", path: "/portal/contacts-manager" },
    { title: "Recent Activity", icon: Activity, count: recentEvents.length, active: recentEvents.filter(e => e.status === "completed").length, color: "text-chart-4", bgColor: "bg-chart-4/10", path: "/portal/admin-dashboard" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Simplified agent management — top priorities, timeline, and quick settings</p>
      </div>

      {/* Top-priority categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {PRIORITY_CATEGORIES.map((cat) => (
          <Link key={cat.title} to={cat.path} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors group">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", cat.bgColor)}>
              <cat.icon className={cn("h-5 w-5", cat.color)} />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{cat.active}</p>
            <p className="text-xs text-muted-foreground">{cat.title}</p>
            {cat.count !== cat.active && <p className="text-[10px] text-muted-foreground mt-1">{cat.active} active / {cat.count} total</p>}
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto scrollbar-thin">
        {["overview", "timeline", "agents", "settings"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {tab === "overview" ? "Overview" : tab === "timeline" ? "Activity Timeline" : tab === "agents" ? "Agent Settings" : "Quick Settings"}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-chart-3" /> Upcoming Calendar Events</h3>
            {calendarEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events. Agents can block time for tasks automatically.</p>
            ) : (
              <div className="space-y-2">
                {calendarEvents.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                    <div className="w-2 h-2 rounded-full bg-chart-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.summary}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.start).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-chart-2" /> Contact Permissions</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Allowed for agents</span>
                  <span className="text-xs font-medium text-foreground">{allowedContacts} / {contacts.length}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
                  <div className="h-full bg-chart-2 transition-all" style={{ width: `${contacts.length ? (allowedContacts / contacts.length) * 100 : 0}%` }} />
                </div>
              </div>
              <Link to="/portal/contacts-manager" className="text-xs text-primary font-medium hover:underline shrink-0">Manage →</Link>
            </div>
          </div>
        </div>
      )}

      {/* Timeline tab */}
      {activeTab === "timeline" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-chart-4" /> Agent Activity Timeline</h3>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity. Send a test from the Test Lab to see events here.</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event, i) => {
                const Icon = event.channel === "sms" ? MessageSquare : event.channel === "voice" ? PhoneCall : event.channel === "email" ? Mail : FileText;
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center",
                        event.status === "completed" ? "bg-status-green/10" : "bg-destructive/10")}>
                        <Icon className={cn("h-4 w-4", event.status === "completed" ? "text-status-green" : "text-destructive")} />
                      </div>
                      {i < recentEvents.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground capitalize">{event.channel}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
                          event.direction === "outbound" ? "bg-primary/10 text-primary" : "bg-chart-2/10 text-chart-2")}>
                          {event.direction}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
                          event.status === "completed" ? "bg-status-green/10 text-status-green" : "bg-destructive/10 text-destructive")}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.summary?.slice(0, 80)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {event.from_addr} → {event.to_addr} • {new Date(event.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Agent Settings tab */}
      {activeTab === "agents" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> Agent Quick Settings</h3>
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                  style={{ backgroundColor: (agent.avatar_color || '#ff6b00') + '20', color: agent.avatar_color || '#ff6b00' }}>
                  {agent.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{agent.agent_tier} • {agent.target_industry || 'general'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] px-2 py-1 rounded-full",
                    agent.active ? "bg-status-green/10 text-status-green" : "bg-muted text-muted-foreground")}>
                    {agent.active ? "Active" : "Paused"}
                  </span>
                  <button onClick={() => toggleAgent(agent)}
                    className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                      agent.active ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-status-green/10 text-status-green hover:bg-status-green/20")}>
                    {agent.active ? "Pause" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
            {agents.length === 0 && <p className="text-sm text-muted-foreground">No agents yet. Create some in the Agent Factory.</p>}
          </div>
        </div>
      )}

      {/* Quick Settings tab */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/portal/contacts-manager" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
            <Users className="h-6 w-6 text-chart-2 mb-2" />
            <h3 className="font-medium text-foreground mb-1">Manage Contact Permissions</h3>
            <p className="text-xs text-muted-foreground">Control which contacts agents can interact with</p>
          </Link>
          <Link to="/portal/numbers" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
            <Phone className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground mb-1">Phone Numbers</h3>
            <p className="text-xs text-muted-foreground">Manage numbers for SMS, voice & WhatsApp</p>
          </Link>
          <Link to="/portal/agent-factory" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
            <Rocket className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground mb-1">Agent Factory</h3>
            <p className="text-xs text-muted-foreground">Create, batch create & manage all agents</p>
          </Link>
          <Link to="/portal/settings" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
            <Settings className="h-6 w-6 text-muted-foreground mb-2" />
            <h3 className="font-medium text-foreground mb-1">Portal Settings</h3>
            <p className="text-xs text-muted-foreground">Account, billing & notification settings</p>
          </Link>
        </div>
      )}
    </div>
  );
}
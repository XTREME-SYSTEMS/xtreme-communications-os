import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import PortalVoiceTest from "@/components/portal/PortalVoiceTest";
import {
  Phone, Brain, MessageSquare, DollarSign, ArrowRight,
  KeyRound, Plus, X, Star,
  MessageCircle, PhoneCall, AlertCircle, Sparkles, Users,
  Palette, HardDrive, ChevronRight
} from "lucide-react";

const ONBOARDING_STEPS = [
  { step: "welcome", label: "Welcome", desc: "Account created" },
  { step: "company", label: "Company Profile", desc: "Tell us about your business" },
  { step: "number", label: "Get a Phone Number", desc: "Search and purchase a number" },
  { step: "agent", label: "Create AI Agent", desc: "Set up your AI assistant" },
  { step: "templates", label: "Set Up Templates", desc: "Email & SMS templates" },
  { step: "test", label: "Test Your Setup", desc: "Send a test message" },
  { step: "live", label: "Go Live", desc: "Activate and start using" },
];

const QUICK_ACTIONS = [
  { label: "SMS", icon: MessageSquare, path: "/portal/sms-inbox", color: "text-green-500", bg: "bg-green-500/10" },
  { label: "MMS", icon: MessageCircle, path: "/portal/mms-studio", color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Voice", icon: PhoneCall, path: "/portal/agents", color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "WhatsApp", icon: MessageCircle, path: "/portal/whatsapp-outreach", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Agent Chat", icon: Brain, path: "/portal/agent-factory", color: "text-primary", bg: "bg-primary/10" },
];

const MODULE_REMINDERS = [
  { check: (d) => d.numbers.length === 0, label: "Get a Phone Number", desc: "You need a number to send messages", path: "/portal/numbers", icon: Phone },
  { check: (d) => d.agents.length === 0, label: "Create an AI Agent", desc: "Set up your AI assistant", path: "/portal/agent-factory", icon: Brain },
  { check: (d) => !d.hasWhatsApp, label: "Set Up WhatsApp", desc: "Enable WhatsApp messaging", path: "/portal/whatsapp", icon: MessageCircle },
  { check: (d) => !d.hasBrandKit, label: "Configure Brand Kit", desc: "Personalize your messages", path: "/portal/brand-kit", icon: Palette },
  { check: (d) => !d.hasApiKey, label: "Generate API Key", desc: "For external integrations", path: "/portal/keys", icon: KeyRound },
  { check: (d) => !d.hasGoogle, label: "Connect Google Workspace", desc: "Sync contacts & calendar", path: "/portal/google-workspace", icon: HardDrive },
];

export default function Portal() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [recentInbound, setRecentInbound] = useState([]);
  const [missedCalls, setMissedCalls] = useState([]);
  const [crmCount, setCrmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customButtons, setCustomButtons] = useState([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newBtnLabel, setNewBtnLabel] = useState("");
  const [newBtnUrl, setNewBtnUrl] = useState("");

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    try {
      // Filter data by current user for isolation
      const [nums, ags, subs, keys, crm] = await Promise.all([
        base44.entities.PhoneNumber.filter({ user_id: user.id }, '-created_date', 50).catch(() => []),
        base44.entities.AgentPersona.filter({ created_by_id: user.id }, '-created_date', 50).catch(() => []),
        base44.entities.CustomerSubscription.filter({ user_id: user.id }).catch(() => []),
        base44.entities.ApiKey.filter({ created_by_id: user.id, status: "active" }).catch(() => []),
        base44.entities.XtremeCrmContact.filter({ created_by_id: user.id }, '-created_date', 200).catch(() => []),
      ]);

      setNumbers(nums || []);
      setAgents(ags || []);
      setCrmCount((crm || []).length);

      // Find or create subscription
      let sub = (subs || [])[0];
      if (!sub) {
        sub = await base44.entities.CustomerSubscription.create({
          user_id: user.id,
          plan: 'pay_as_you_go',
          status: 'trial',
          started_at: new Date().toISOString(),
          onboarding_steps: ONBOARDING_STEPS.map((s, i) => ({
            step: s.step, label: s.label, completed: i === 0, completed_at: i === 0 ? new Date().toISOString() : null,
          })),
        });
      }
      setSubscription(sub);

      // Load recent inbound messages for user's numbers
      const userNumbers = (nums || []).map(n => n.e164);
      if (userNumbers.length > 0) {
        const inbound = await base44.entities.CommsEvent.filter({
          direction: "inbound",
          status: "completed"
        }, '-created_date', 10).catch(() => []);
        // Filter to only events for this user's numbers
        const myInbound = (inbound || []).filter(e => userNumbers.includes(e.to_addr));
        setRecentInbound(myInbound.slice(0, 5));

        // Missed calls = inbound voice events that were ringing/active (not answered)
        const voiceEvents = await base44.entities.CommsEvent.filter({
          direction: "inbound",
          channel: "voice"
        }, '-created_date', 20).catch(() => []);
        const missed = (voiceEvents || []).filter(e =>
          userNumbers.includes(e.to_addr) &&
          (e.status === "ringing" || e.status === "active" || e.status === "expired")
        );
        setMissedCalls(missed.slice(0, 3));
      }

      // Load custom buttons from localStorage
      const stored = localStorage.getItem(`dashboard_buttons_${user.id}`);
      if (stored) setCustomButtons(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveCustomButton = () => {
    if (!newBtnLabel.trim()) return;
    const btn = { label: newBtnLabel.trim(), path: newBtnUrl.trim() || "/portal" };
    const updated = [...customButtons, btn];
    setCustomButtons(updated);
    localStorage.setItem(`dashboard_buttons_${user.id}`, JSON.stringify(updated));
    setNewBtnLabel("");
    setNewBtnUrl("");
    setShowAddCustom(false);
  };

  const removeCustomButton = (idx) => {
    const updated = customButtons.filter((_, i) => i !== idx);
    setCustomButtons(updated);
    localStorage.setItem(`dashboard_buttons_${user.id}`, JSON.stringify(updated));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const completedSteps = subscription?.onboarding_steps?.filter(s => s.completed).length || 1;
  const totalSteps = ONBOARDING_STEPS.length;
  const onboardingComplete = subscription?.onboarding_completed;
  const activeNumber = numbers.find(n => n.status === "assigned" || n.status === "available") || numbers[0];
  const activeAgent = agents[0];

  // Module reminders data
  const reminderData = {
    numbers, agents,
    hasWhatsApp: numbers.some(n => n.capabilities?.includes("whatsapp")),
    hasBrandKit: false, // would need to check BrandKit entity
    hasApiKey: true, // already loaded keys
    hasGoogle: false,
  };
  const activeReminders = MODULE_REMINDERS.filter(r => r.check(reminderData));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto portal-gold-scope">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">
          {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'Welcome'}! 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {onboardingComplete ? "Your system is live and ready." : "Let's get your system set up."}
        </p>
      </div>

      {/* Phone + Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Active Phone Number */}
        <div className="rounded-xl border border-border bg-card p-4 xtreme-gold-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Number</span>
            </div>
            <Link to="/portal/numbers" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          {activeNumber ? (
            <div>
              <p className="text-xl font-display font-bold text-foreground">{activeNumber.e164}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground uppercase">{activeNumber.type}</span>
                {(activeNumber.capabilities || []).map(c => (
                  <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{c}</span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">No phone number yet</p>
              <Link to="/portal/numbers" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Get a number <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Active Agent */}
        <div className="rounded-xl border border-border bg-card p-4 xtreme-gold-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-chart-3" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Agent</span>
            </div>
            <Link to="/portal/agent-factory" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          {activeAgent ? (
            <div>
              <p className="text-xl font-display font-bold text-foreground">{activeAgent.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground capitalize">{activeAgent.persona_type}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase", activeAgent.status === "active" ? "bg-status-green/10 text-status-green" : "bg-accent text-muted-foreground")}>
                  {activeAgent.status}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">No agent created yet</p>
              <Link to="/portal/agent-factory" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Create an agent <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Missed Calls / Messages Alert */}
      {(missedCalls.length > 0 || recentInbound.length > 0) && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4 xtreme-gold-hover">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Recent Activity</span>
          </div>
          <div className="space-y-1">
            {missedCalls.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">📞 Missed call from {c.from_addr || 'Unknown'}</span>
                <span className="text-muted-foreground">{new Date(c.created_date).toLocaleString()}</span>
              </div>
            ))}
            {recentInbound.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">💬 Message from {m.from_addr || 'Unknown'}: {(m.summary || '').slice(0, 40)}</span>
                <span className="text-muted-foreground">{new Date(m.created_date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding Reminders */}
      {!onboardingComplete && activeReminders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4 xtreme-gold-hover">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Complete Your Setup ({completedSteps}/{totalSteps})</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-accent overflow-hidden mb-3">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
          </div>
          <div className="space-y-1">
            {activeReminders.slice(0, 4).map((r) => (
              <Link key={r.label} to={r.path} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group">
                <r.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 xtreme-gold-hover">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Quick Actions</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((qa) => (
            <Link key={qa.label} to={qa.path}
              className={cn("flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/50 transition-all xtreme-gold-hover", qa.bg)}>
              <qa.icon className={cn("h-5 w-5", qa.color)} />
              <span className="text-[10px] font-medium text-foreground">{qa.label}</span>
            </Link>
          ))}
          {/* Custom buttons */}
          {customButtons.map((btn, idx) => (
            <Link key={idx} to={btn.path}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/50 transition-all xtreme-gold-hover bg-accent/30 relative group">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-full">{btn.label}</span>
              <button onClick={(e) => { e.preventDefault(); removeCustomButton(idx); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-2.5 w-2.5" />
              </button>
            </Link>
          ))}
          {/* Add custom button */}
          {showAddCustom ? (
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-primary/50 bg-primary/5">
              <input value={newBtnLabel} onChange={e => setNewBtnLabel(e.target.value)} placeholder="Label"
                className="w-full h-7 px-2 text-[10px] rounded border border-border bg-background focus:border-primary outline-none" />
              <input value={newBtnUrl} onChange={e => setNewBtnUrl(e.target.value)} placeholder="/portal/..."
                className="w-full h-7 px-2 text-[10px] rounded border border-border bg-background focus:border-primary outline-none" />
              <div className="flex gap-1">
                <button onClick={saveCustomButton} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[10px]">Add</button>
                <button onClick={() => setShowAddCustom(false)} className="px-2 py-1 rounded border border-border text-[10px]">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddCustom(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 transition-all xtreme-gold-hover">
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Inbox Preview */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 xtreme-gold-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Inbox</span>
          </div>
          <Link to="/portal/sms-inbox" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {recentInbound.length > 0 ? (
          <div className="space-y-1">
            {recentInbound.map((msg, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{msg.from_addr || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{msg.summary || '(no content)'}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Your inbox will show incoming SMS, MMS, and WhatsApp messages here.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Phone Numbers", value: numbers.length, icon: Phone, color: "text-primary", path: "/portal/numbers" },
          { label: "AI Agents", value: agents.length, icon: Brain, color: "text-chart-3", path: "/portal/agent-factory" },
          { label: "CRM Contacts", value: crmCount, icon: Users, color: "text-chart-4", path: "/portal/crm" },
          { label: "Monthly Spend", value: `$${(subscription?.monthly_spend || 0).toFixed(2)}`, icon: DollarSign, color: "text-status-green", path: "/portal/settings" },
        ].map((s) => (
          <Link key={s.label} to={s.path} className="rounded-xl border border-border bg-card p-4 xtreme-gold-hover">
            <div className="flex items-center justify-between mb-2"><s.icon className={cn("h-5 w-5", s.color)} /></div>
            <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Voice Test Panel */}
      <PortalVoiceTest />

      {/* Plan Info */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5 xtreme-gold-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Plan</p>
            <p className="text-lg font-display font-bold text-foreground capitalize">{subscription?.plan?.replace(/_/g, ' ') || 'Pay as you go'}</p>
            <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize text-primary">{subscription?.status}</span></p>
          </div>
          <Link to="/pricing" className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors xtreme-gold-hover">
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
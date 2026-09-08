import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Phone, Brain, MessageSquare, DollarSign, TrendingUp, ArrowRight, CheckCircle2, Circle, Clock, Play, KeyRound, BookOpen, GitBranch, HardDrive, Radio, Share2, Sparkles } from "lucide-react";

const ONBOARDING_STEPS = [
  { step: "welcome", label: "Welcome", desc: "Account created" },
  { step: "company", label: "Company Profile", desc: "Tell us about your business" },
  { step: "number", label: "Get a Phone Number", desc: "Search and purchase a number" },
  { step: "agent", label: "Create AI Agent", desc: "Set up your AI assistant" },
  { step: "templates", label: "Set Up Templates", desc: "Email & SMS templates" },
  { step: "test", label: "Test Your Setup", desc: "Send a test message" },
  { step: "live", label: "Go Live", desc: "Activate and start using" },
];

export default function Portal() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    try {
      // Find or create subscription
      let subs = await base44.entities.CustomerSubscription.filter({ user_id: user.id });
      let sub = subs[0];
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

      // Load related data
      const [nums, ags] = await Promise.all([
        base44.entities.PhoneNumber.filter({ assigned_persona_id: { $exists: true } }).catch(() => []),
        base44.entities.AgentPersona.list('-created_date', 20).catch(() => []),
      ]);
      setNumbers(nums || []);
      setAgents(ags || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const completedSteps = subscription?.onboarding_steps?.filter(s => s.completed).length || 1;
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);
  const currentStep = subscription?.onboarding_current_step || 0;
  const onboardingComplete = subscription?.onboarding_completed;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {onboardingComplete ? "Your account is fully set up and ready to go." : "Let's get your account set up. Follow the steps below."}
        </p>
      </div>

      {/* Onboarding Timeline */}
      {!onboardingComplete && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-foreground">Setup Progress</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{completedSteps} of {totalSteps} steps completed</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-display font-bold text-primary">{progress}%</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-accent overflow-hidden mb-6">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {/* Steps */}
          <div className="space-y-1">
            {ONBOARDING_STEPS.map((s, i) => {
              const stepData = subscription?.onboarding_steps?.find(os => os.step === s.step);
              const completed = stepData?.completed;
              const isCurrent = i === currentStep && !completed;
              return (
                <div key={s.step} className={cn("flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                  completed ? "bg-primary/5" : isCurrent ? "bg-accent" : "opacity-60")}>
                  <div className="shrink-0">
                    {completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> :
                      isCurrent ? <Play className="h-5 w-5 text-primary" /> :
                      <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-medium", completed ? "text-foreground" : isCurrent ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  {isCurrent && (
                    <Link to="/portal/onboarding" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                      Continue <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  {completed && stepData?.completed_at && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(stepData.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {!onboardingComplete && (
            <Link to="/portal/onboarding" className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              {completedSteps > 1 ? "Continue Setup" : "Start Setup"} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Phone Numbers", value: numbers.length, icon: Phone, color: "text-primary" },
          { label: "AI Agents", value: agents.length, icon: Brain, color: "text-chart-2" },
          { label: "Messages Sent", value: 0, icon: MessageSquare, color: "text-chart-3" },
          { label: "Monthly Spend", value: `$${(subscription?.monthly_spend || 0).toFixed(2)}`, icon: DollarSign, color: "text-chart-4" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Link to="/portal/numbers" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <Phone className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-medium text-foreground mb-1">Buy a Phone Number</h3>
          <p className="text-xs text-muted-foreground">Search local or toll-free numbers and provision instantly.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Get started <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/agents" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <Brain className="h-6 w-6 text-chart-2 mb-2" />
          <h3 className="font-medium text-foreground mb-1">Create AI Agent</h3>
          <p className="text-xs text-muted-foreground">Build a conversational AI with natural voice and test it live.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Create <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/live-monitoring" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <Radio className="h-6 w-6 text-chart-3 mb-2" />
          <h3 className="font-medium text-foreground mb-1">Live Monitoring</h3>
          <p className="text-xs text-muted-foreground">Watch active calls with live transcripts and audio in real-time.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Monitor <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/xtreme-social" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <Share2 className="h-6 w-6 text-chart-4 mb-2" />
          <h3 className="font-medium text-foreground mb-1">Xtreme Social</h3>
          <p className="text-xs text-muted-foreground">AI social media content for all platforms with scheduling.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Create <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/workflow-generator" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <GitBranch className="h-6 w-6 text-chart-5 mb-2" />
          <h3 className="font-medium text-foreground mb-1">Workflow Generator</h3>
          <p className="text-xs text-muted-foreground">Build multi-channel communication workflows with drag-and-drop.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Build <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/content-library" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <Sparkles className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-medium text-foreground mb-1">Content Library</h3>
          <p className="text-xs text-muted-foreground">AI-generated images, videos, social posts, and creative assets.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Generate <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/google-workspace" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <HardDrive className="h-6 w-6 text-chart-2 mb-2" />
          <h3 className="font-medium text-foreground mb-1">Google Workspace</h3>
          <p className="text-xs text-muted-foreground">Sync intelligence, templates, and schedules to Google.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Connect <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link to="/portal/core-docs" className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
          <BookOpen className="h-6 w-6 text-chart-3 mb-2" />
          <h3 className="font-medium text-foreground mb-1">Core Docs</h3>
          <p className="text-xs text-muted-foreground">Complete system documentation and API reference.</p>
          <span className="text-xs text-primary flex items-center gap-1 mt-2 group-hover:gap-2 transition-all">Read <ArrowRight className="h-3 w-3" /></span>
        </Link>
      </div>

      {/* Plan Info */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Plan</p>
            <p className="text-lg font-display font-bold text-foreground capitalize">{subscription?.plan?.replace(/_/g, ' ') || 'Pay as you go'}</p>
            <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize text-primary">{subscription?.status}</span></p>
          </div>
          <Link to="/pricing" className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
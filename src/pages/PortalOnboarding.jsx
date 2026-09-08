import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Building2, Phone, Brain, Mail, Play, Sparkles, Rocket, Globe, Search } from "lucide-react";
import OnboardingCallTest from "@/components/onboarding/OnboardingCallTest";

const STEPS = [
  { step: "welcome", label: "Welcome", icon: Sparkles },
  { step: "company", label: "Company", icon: Building2 },
  { step: "number", label: "Phone Number", icon: Phone },
  { step: "agent", label: "AI Agent", icon: Brain },
  { step: "templates", label: "Templates", icon: Mail },
  { step: "test", label: "Test", icon: Play },
  { step: "live", label: "Go Live", icon: Rocket },
];

const INDUSTRIES = ["Real Estate", "Healthcare", "E-Commerce", "Financial Services", "Legal", "Insurance", "Home Services", "Education", "Technology", "Hospitality", "Automotive", "Construction", "Other"];
const USE_CASES = ["Outbound Sales", "Customer Support", "Appointment Scheduling", "Lead Qualification", "Marketing Campaigns", "Order Updates", "Reminder Calls", "Internal Communications"];
const VOICES = [
  { id: "river", name: "River", desc: "Calm, neutral" },
  { id: "honey", name: "Honey", desc: "Warm, soft" },
  { id: "sunny", name: "Sunny", desc: "Bright, upbeat" },
  { id: "storm", name: "Storm", desc: "Formal, authoritative" },
  { id: "spark", name: "Spark", desc: "Energetic, quick" },
];

export default function PortalOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [intelScanning, setIntelScanning] = useState(false);
  const [intelData, setIntelData] = useState(null);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    try {
      let subs = await base44.entities.CustomerSubscription.filter({ user_id: user.id });
      let sub = subs[0];
      if (!sub) {
        sub = await base44.entities.CustomerSubscription.create({
          user_id: user.id, plan: 'pay_as_you_go', status: 'trial',
          started_at: new Date().toISOString(),
          onboarding_steps: STEPS.map((s, i) => ({ step: s.step, label: s.label, completed: i === 0, completed_at: i === 0 ? new Date().toISOString() : null })),
          onboarding_data: {},
        });
      }
      setSubscription(sub);
      setData(sub.onboarding_data || {});
      setStepIndex(sub.onboarding_current_step || 0);
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const saveStep = async (stepCompleted, newData, advance = true) => {
    setSaving(true);
    try {
      const updatedSteps = (subscription.onboarding_steps || []).map(s =>
        s.step === stepCompleted ? { ...s, completed: true, completed_at: new Date().toISOString() } : s
      );
      const nextIndex = advance ? stepIndex + 1 : stepIndex;
      const updated = await base44.entities.CustomerSubscription.update(subscription.id, {
        onboarding_steps: updatedSteps,
        onboarding_current_step: nextIndex,
        onboarding_data: { ...data, ...newData },
        onboarding_completed: stepCompleted === "live",
        company_name: newData.company_name || data.company_name || subscription.company_name,
      });
      setSubscription(updated);
      setData({ ...data, ...newData });
      if (advance) setStepIndex(nextIndex);
      if (stepCompleted === "live") {
        toast({ title: "🎉 You're Live!", description: "Your account is set up and ready to use." });
        navigate("/portal");
      }
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const scanIntelligence = async () => {
    setIntelScanning(true);
    try {
      const res = await base44.functions.invoke('scrapeCompanyIntelligence', {
        company_name: data.company_name,
        website: data.website,
        industry: data.industry,
      });
      const intel = res.data?.intelligence || res.intelligence;
      setIntelData(intel);
      setData({ ...data, intelligence: intel });
      toast({ title: "Intelligence scan complete!", description: "Company and industry data ingested for your AI agent." });
    } catch (e) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    }
    setIntelScanning(false);
  };

  const generateAgentPrompt = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateContent', {
        prompt: `Create a system prompt for an AI voice agent with these details:
Company: ${data.company_name || "the company"}
Industry: ${data.industry || "general business"}
Use case: ${data.use_case || "customer communication"}
Agent name: ${data.agent_name || "AI Assistant"}
Tone: ${data.agent_tone || "professional and friendly"}
Channels: ${(data.channels || []).join(", ")}

The prompt should instruct the AI to:
1. Greet callers professionally
2. Handle the primary use case effectively
3. Capture caller information (name, phone, email when appropriate)
4. Schedule appointments if requested
5. Transfer to human for complex issues
6. Stay on brand with the company's industry

Write the actual system prompt text (not meta-description). Keep it under 500 words.${data.intelligence ? `\n\nUse this company and industry intelligence to inform the prompt:\n${JSON.stringify(data.intelligence.agent_knowledge_base || data.intelligence.company_overview || "").slice(0, 2000)}` : ""}`,
      });
      const output = res.data?.output;
      setGeneratedPrompt(typeof output === "string" ? output : JSON.stringify(output));
    } catch (e) {
      setGeneratedPrompt(`You are ${data.agent_name || "AI Assistant"}, an AI voice agent for ${data.company_name || "the company"}, a ${data.industry || "business"} company. Your role is ${data.use_case || "customer communication"}. Be professional, friendly, and helpful. Greet callers, answer questions, capture contact information, and schedule appointments when requested. If you cannot help, offer to transfer to a human agent.`);
    }
    setGenerating(false);
  };

  const generateTemplates = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateContent', {
        prompt: `Generate communication templates for a ${data.industry || "business"} company named "${data.company_name || "Company"}".
Primary use case: ${data.use_case || "customer communication"}
Tone: ${data.agent_tone || "professional"}

Generate:
1. SMS_TEMPLATE: A 160-char SMS for outbound outreach
2. EMAIL_SUBJECT: A compelling email subject line
3. EMAIL_BODY: A 3-paragraph email body for outbound outreach

Format as:
SMS_TEMPLATE: [content]
EMAIL_SUBJECT: [content]
EMAIL_BODY: [content]`,
      });
      const output = res.data?.output;
      const text = typeof output === "string" ? output : JSON.stringify(output);
      const smsMatch = text.match(/SMS_TEMPLATE:\s*(.+?)(?=EMAIL_SUBJECT:|$)/s);
      const subjectMatch = text.match(/EMAIL_SUBJECT:\s*(.+?)(?=EMAIL_BODY:|$)/s);
      const bodyMatch = text.match(/EMAIL_BODY:\s*(.+)/s);
      setTemplates({
        sms: smsMatch?.[1]?.trim() || "Hi! This is from " + (data.company_name || "us") + ". We'd love to connect. Reply STOP to opt out.",
        email_subject: subjectMatch?.[1]?.trim() || "Quick question from " + (data.company_name || "us"),
        email_body: bodyMatch?.[1]?.trim() || "Hi there,\n\nWe'd love to connect with you about how we can help.\n\nBest regards,\n" + (data.company_name || "Our team"),
      });
    } catch (e) {
      setTemplates({
        sms: `Hi! This is ${data.company_name || "our company"}. We'd love to connect. Reply STOP to opt out.`,
        email_subject: `Quick question from ${data.company_name || "us"}`,
        email_body: `Hi there,\n\nWe'd love to connect with you.\n\nBest regards,\n${data.company_name || "Our team"}`,
      });
    }
    setGenerating(false);
  };

  if (!subscription) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;

  const currentStep = STEPS[stepIndex];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => {
          const completed = subscription.onboarding_steps?.find(os => os.step === s.step)?.completed;
          const isCurrent = i === stepIndex;
          return (
            <div key={s.step} className="flex items-center">
              <div className={cn("flex flex-col items-center gap-1", !isCurrent && !completed && "opacity-40")}>
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                  completed ? "bg-primary text-primary-foreground" :
                  isCurrent ? "bg-primary/20 border-2 border-primary text-primary" :
                  "bg-accent text-muted-foreground")}>
                  {completed ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className="text-[9px] font-medium uppercase tracking-wider hidden md:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("w-8 md:w-12 h-0.5 mx-1", completed ? "bg-primary" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {/* Step 0: Welcome */}
        {stepIndex === 0 && (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Welcome to XTREME Comms!</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Let's set up your account in a few quick steps. You'll get a phone number, create an AI agent, and be ready to communicate in minutes.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
              {[
                { icon: Phone, label: "Get a Number" },
                { icon: Brain, label: "Create AI Agent" },
                { icon: Rocket, label: "Go Live" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-accent/30 p-3 text-center">
                  <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-4">Plan: <span className="font-medium text-foreground capitalize">{subscription.plan?.replace(/_/g, ' ')}</span></p>
            <button onClick={() => saveStep("welcome", {}, true)} disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto">
              Let's Get Started <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 1: Company Profile */}
        {stepIndex === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Tell Us About Your Company</h2>
            <p className="text-sm text-muted-foreground">This helps us personalize your AI agent and templates.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name *</label>
              <input value={data.company_name || ""} onChange={e => setData({ ...data, company_name: e.target.value })}
                placeholder="Acme Corp" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry *</label>
                <select value={data.industry || ""} onChange={e => setData({ ...data, industry: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  <option value="">Select...</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
                <input value={data.website || ""} onChange={e => setData({ ...data, website: e.target.value })}
                  placeholder="acme.com" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Size</label>
                <select value={data.team_size || ""} onChange={e => setData({ ...data, team_size: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  <option value="">Select...</option>
                  <option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Use Case *</label>
                <select value={data.use_case || ""} onChange={e => setData({ ...data, use_case: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  <option value="">Select...</option>
                  {USE_CASES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channels You Need</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {["SMS", "MMS", "Voice", "WhatsApp", "Email"].map(ch => (
                  <button key={ch} onClick={() => {
                    const channels = data.channels || [];
                    setData({ ...data, channels: channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch] });
                  }} className={cn("px-3 py-1.5 rounded-lg border text-sm",
                    (data.channels || []).includes(ch) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            {/* Industry Intelligence Scan */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Industry Intelligence Scan</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Scan your company website and industry to build a knowledge base your AI agent uses during conversations. This ingests sales techniques, marketing strategies, service standards, tools, AI trends, customer service practices, and Q&A.</p>
              {intelData ? (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-status-green" />
                    <span className="text-xs text-foreground font-medium">Intelligence ingested</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {intelData.company_overview && <div className="rounded border border-border bg-background p-2"><span className="text-muted-foreground">Overview:</span> <span className="text-foreground">{intelData.company_overview.slice(0, 80)}...</span></div>}
                    {intelData.social_media?.length > 0 && <div className="rounded border border-border bg-background p-2"><span className="text-muted-foreground">Social:</span> <span className="text-foreground">{intelData.social_media.length} profiles found</span></div>}
                    {intelData.common_qa?.length > 0 && <div className="rounded border border-border bg-background p-2"><span className="text-muted-foreground">Q&A:</span> <span className="text-foreground">{intelData.common_qa.length} pairs</span></div>}
                    {intelData.industry_intelligence?.sales_techniques?.length > 0 && <div className="rounded border border-border bg-background p-2"><span className="text-muted-foreground">Sales:</span> <span className="text-foreground">{intelData.industry_intelligence.sales_techniques.length} techniques</span></div>}
                  </div>
                  <button onClick={scanIntelligence} disabled={intelScanning} className="text-xs text-primary hover:underline flex items-center gap-1">
                    {intelScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Re-scan
                  </button>
                </div>
              ) : (
                <button onClick={scanIntelligence} disabled={intelScanning || !data.company_name}
                  className="w-full px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2">
                  {intelScanning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning company & industry...</> : <><Globe className="h-4 w-4" /> Scan Industry Intelligence</>}
                </button>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(0)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={() => saveStep("company", data)} disabled={!data.company_name || !data.industry || !data.use_case || saving}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Phone Number */}
        {stepIndex === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Get a Phone Number</h2>
            <p className="text-sm text-muted-foreground">Search for a local or toll-free number. You can skip this and do it later.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Number Type</label>
                <select value={data.number_type || "local"} onChange={e => setData({ ...data, number_type: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  <option value="local">Local</option>
                  <option value="toll_free">Toll-Free</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Area Code</label>
                <input value={data.area_code || ""} onChange={e => setData({ ...data, area_code: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="e.g. 954" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-accent/30 p-4 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">{data.number_type === "toll_free" ? "Toll-Free Number" : `Local Number${data.area_code ? ` (${data.area_code})` : ""}`}</p>
              <p className="text-xs text-muted-foreground mt-1">We'll search for available numbers based on your preferences. You can also browse and buy numbers from the Phone Numbers page after setup.</p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(1)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
              <div className="flex gap-2">
                <button onClick={() => saveStep("number", { ...data, number_skipped: true })} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Skip for now</button>
                <button onClick={() => saveStep("number", data)} disabled={saving}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: AI Agent */}
        {stepIndex === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Create Your AI Agent</h2>
            <p className="text-sm text-muted-foreground">Your AI agent will handle calls and messages on your behalf.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Name *</label>
              <input value={data.agent_name || ""} onChange={e => setData({ ...data, agent_name: e.target.value })}
                placeholder="e.g. Alex, Sarah, Assistant" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice</label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {VOICES.map(v => (
                  <button key={v.id} onClick={() => setData({ ...data, agent_voice: v.id })}
                    className={cn("p-2 rounded-lg border text-center", data.agent_voice === v.id ? "border-primary bg-primary/10" : "border-border")}>
                    <p className="text-xs font-medium text-foreground">{v.name}</p>
                    <p className="text-[9px] text-muted-foreground">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</label>
              <select value={data.agent_tone || ""} onChange={e => setData({ ...data, agent_tone: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                <option value="">Select...</option>
                <option>Professional and friendly</option><option>Warm and conversational</option>
                <option>Energetic and upbeat</option><option>Calm and empathetic</option><option>Authoritative and direct</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Prompt</label>
              <textarea value={generatedPrompt} onChange={e => setGeneratedPrompt(e.target.value)} readOnly={!generatedPrompt}
                placeholder="Click 'Generate' to create an AI system prompt based on your company info, or write your own."
                className="w-full h-32 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-xs focus:border-primary outline-none resize-none" />
              <button onClick={generateAgentPrompt} disabled={generating || !data.company_name}
                className="mt-2 px-4 py-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/10 flex items-center gap-1.5">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generatedPrompt ? "Regenerate" : "Generate with AI"}
              </button>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(2)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={() => saveStep("agent", { ...data, agent_prompt: generatedPrompt })} disabled={!data.agent_name || saving}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Templates */}
        {stepIndex === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Set Up Templates</h2>
            <p className="text-sm text-muted-foreground">We'll generate email and SMS templates based on your industry.</p>
            {!templates ? (
              <div className="text-center py-8">
                <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Click below to generate personalized templates for {data.industry || "your business"}.</p>
                <button onClick={generateTemplates} disabled={generating}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Templates
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SMS Template</label>
                  <textarea value={templates.sms} onChange={e => setTemplates({ ...templates, sms: e.target.value })}
                    className="w-full h-20 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-xs focus:border-primary outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Subject</label>
                  <input value={templates.email_subject} onChange={e => setTemplates({ ...templates, email_subject: e.target.value })}
                    className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Body</label>
                  <textarea value={templates.email_body} onChange={e => setTemplates({ ...templates, email_body: e.target.value })}
                    className="w-full h-32 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-xs focus:border-primary outline-none resize-none" />
                </div>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(3)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={() => saveStep("templates", { ...data, templates })} disabled={!templates || saving}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Test */}
        {stepIndex === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Test Your Setup</h2>
            <p className="text-sm text-muted-foreground">Send a test message to verify everything works.</p>
            <div className="rounded-lg border border-border bg-accent/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Company: {data.company_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">AI Agent: {data.agent_name} ({data.agent_voice})</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Templates generated for {data.industry}</span>
              </div>
            </div>
            <OnboardingCallTest
              agentName={data.agent_name}
              agentVoice={data.agent_voice}
              companyName={data.company_name}
              industry={data.industry}
              useCase={data.use_case}
              agentTone={data.agent_tone}
            />
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(4)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={() => saveStep("test", data)} disabled={saving}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Go Live */}
        {stepIndex === 6 && (
          <div className="text-center py-6">
            <Rocket className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Ready to Go Live!</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">Review your setup below and click "Go Live" to activate your account.</p>
            <div className="text-left max-w-md mx-auto rounded-lg border border-border bg-accent/30 p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Company:</span><span className="text-foreground font-medium">{data.company_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Industry:</span><span className="text-foreground font-medium">{data.industry}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Use Case:</span><span className="text-foreground font-medium">{data.use_case}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">AI Agent:</span><span className="text-foreground font-medium">{data.agent_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Voice:</span><span className="text-foreground font-medium capitalize">{data.agent_voice}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Channels:</span><span className="text-foreground font-medium">{(data.channels || []).join(", ") || "None selected"}</span></div>
            </div>
            <div className="flex justify-between max-w-md mx-auto">
              <button onClick={() => setStepIndex(5)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={() => saveStep("live", data)} disabled={saving}
                className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Go Live!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
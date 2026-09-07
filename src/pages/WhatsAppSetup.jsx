import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MessageCircle, Phone, Sparkles, Rocket } from "lucide-react";

const STEPS = [
  { step: "business", label: "Business Info", icon: MessageCircle },
  { step: "number", label: "Phone Number", icon: Phone },
  { step: "templates", label: "Message Templates", icon: Sparkles },
  { step: "activate", label: "Activate", icon: Rocket },
];

const CATEGORIES = ["Retail", "Real Estate", "Healthcare", "Financial Services", "Education", "Restaurant", "Travel", "Technology", "Other"];

export default function WhatsAppSetup() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    business_name: "", category: "Retail", description: "", website: "",
    phone_number: "", email: "",
    templates: [],
  });
  const [generatedTemplates, setGeneratedTemplates] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateTemplates = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateContent', {
        prompt: `Generate 3 WhatsApp message templates for a ${data.category} business named "${data.business_name}".
Description: ${data.description || "general business"}

WhatsApp templates must follow this format:
Template 1: [name] - [template text with {{1}} for variables]
Template 2: [name] - [template text with {{1}} for variables]
Template 3: [name] - [template text with {{1}} for variables]

Common WhatsApp templates:
1. Appointment reminder
2. Order update notification
3. Welcome / opt-in confirmation

Keep each template under 300 characters. Use {{1}} for variable placeholders.`,
      });
      const output = res.data?.output;
      const text = typeof output === "string" ? output : JSON.stringify(output);
      const matches = text.match(/Template \d+:\s*(.+?)(?=Template \d+:|$)/gs) || [];
      setGeneratedTemplates(matches.map((m, i) => {
        const parts = m.replace(/Template \d+:\s*/, "").split(" - ");
        return { name: parts[0]?.trim() || `Template ${i + 1}`, body: parts.slice(1).join(" - ").trim() };
      }).filter(t => t.body));
    } catch (e) {
      setGeneratedTemplates([
        { name: "Appointment Reminder", body: `Hi {{1}}, this is ${data.business_name}. Your appointment is confirmed for {{1}}. Reply C to confirm or R to reschedule.` },
        { name: "Order Update", body: `Hi {{1}}, your order #{{1}} has been updated. Track it here: {{1}}. Thank you from ${data.business_name}!` },
        { name: "Welcome", body: `Welcome to ${data.business_name}! You're now subscribed. Reply STOP to opt out. We'll send you updates and offers.` },
      ]);
    }
    setGenerating(false);
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      // Save WhatsApp number config
      if (data.phone_number) {
        await base44.entities.PhoneNumber.create({
          e164: data.phone_number,
          type: "local",
          capabilities: ["whatsapp", "sms", "voice"],
          status: "assigned",
          classification: "PROVIDER-BACKED",
          route_label: `${data.business_name} WhatsApp`,
          route_type: "webhook",
        });
      }
      toast({ title: "🎉 WhatsApp Business Activated!", description: `${data.business_name} is now connected` });
      navigate("/portal");
    } catch (e) {
      toast({ title: "Activation failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const currentStep = STEPS[stepIndex];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
      <h1 className="text-2xl font-display font-bold text-foreground mb-1">WhatsApp Business Setup</h1>
      <p className="text-sm text-muted-foreground mb-6">Connect your business to WhatsApp and start messaging customers.</p>

      {/* Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={s.step} className="flex items-center">
            <div className={cn("flex flex-col items-center gap-1", i > stepIndex && "opacity-40")}>
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", i < stepIndex ? "bg-primary text-primary-foreground" : i === stepIndex ? "bg-primary/20 border-2 border-primary text-primary" : "bg-accent text-muted-foreground")}>
                {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className="text-[9px] font-medium uppercase tracking-wider hidden md:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("w-8 md:w-12 h-0.5 mx-1", i < stepIndex ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {/* Step 0: Business Info */}
        {stepIndex === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Business Information</h2>
            <p className="text-sm text-muted-foreground">Tell us about your business for WhatsApp Business API verification.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Name *</label>
              <input value={data.business_name} onChange={e => setData({ ...data, business_name: e.target.value })}
                placeholder="Acme Corp" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category *</label>
                <select value={data.category} onChange={e => setData({ ...data, category: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
                <input value={data.website} onChange={e => setData({ ...data, website: e.target.value })}
                  placeholder="acme.com" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
              <textarea value={data.description} onChange={e => setData({ ...data, description: e.target.value })}
                placeholder="What does your business do?" className="w-full h-20 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            </div>
            <div className="flex justify-between pt-2">
              <div />
              <button onClick={() => setStepIndex(1)} disabled={!data.business_name}
                className="px-6 py-2 rounded-lg gold-gradient text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Phone Number */}
        {stepIndex === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Phone Number</h2>
            <p className="text-sm text-muted-foreground">Enter the phone number you want to use for WhatsApp Business.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WhatsApp Phone Number *</label>
              <input value={data.phone_number} onChange={e => setData({ ...data, phone_number: e.target.value })}
                placeholder="+1 954-884-8885" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Email</label>
              <input value={data.email} onChange={e => setData({ ...data, email: e.target.value })}
                placeholder="business@acme.com" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-foreground font-medium mb-1">⚠️ Important</p>
              <p className="text-xs text-muted-foreground">This number must not be currently active on WhatsApp. If it is, you'll need to disable it first. The number will receive a verification code via SMS or call.</p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(0)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
              <button onClick={() => setStepIndex(2)} disabled={!data.phone_number}
                className="px-6 py-2 rounded-lg gold-gradient text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Templates */}
        {stepIndex === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Message Templates</h2>
            <p className="text-sm text-muted-foreground">Generate WhatsApp message templates for common business scenarios.</p>
            {!generatedTemplates ? (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Click below to generate templates for {data.business_name}.</p>
                <button onClick={generateTemplates} disabled={generating}
                  className="px-6 py-2.5 rounded-lg gold-gradient text-black font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate Templates
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedTemplates.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border bg-accent/30 p-3">
                    <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">{t.name}</p>
                    <p className="text-sm text-foreground">{t.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStepIndex(1)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
              <button onClick={() => setStepIndex(3)} disabled={!generatedTemplates}
                className="px-6 py-2 rounded-lg gold-gradient text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Activate */}
        {stepIndex === 3 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Rocket className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">Ready to Activate!</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">Review your setup and activate WhatsApp Business.</p>
              <div className="text-left max-w-md mx-auto rounded-lg border border-border bg-accent/30 p-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Business:</span><span className="text-foreground font-medium">{data.business_name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Category:</span><span className="text-foreground font-medium">{data.category}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Number:</span><span className="text-foreground font-medium">{data.phone_number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Templates:</span><span className="text-foreground font-medium">{generatedTemplates?.length || 0} generated</span></div>
              </div>
              <div className="flex justify-between max-w-md mx-auto">
                <button onClick={() => setStepIndex(2)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
                <button onClick={handleActivate} disabled={saving}
                  className="px-8 py-2.5 rounded-lg gold-gradient text-black font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Activate WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { User, Globe, Brain, CheckCircle2, Sparkles, Loader2, Mail, Phone, MessageSquare, Calendar, Bell, Share2, Search, FileText, Users } from "lucide-react";

const STEPS = ["Profile", "Scraping", "Replica", "Preferences", "Active"];

export default function DigitalTeam() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [replicas, setReplicas] = useState([]);
  const [activeReplica, setActiveReplica] = useState(null);
  const [scrapeResult, setScrapeResult] = useState(null);

  // Form state
  const [form, setForm] = useState({
    full_name: "", email: "", phone_number: "",
    business_emails: [], social_media_accounts: [],
    communication_methods: [], profile_image_url: "",
  });
  const [socialInput, setSocialInput] = useState({ platform: "", handle: "" });
  const [bizEmailInput, setBizEmailInput] = useState("");
  const [commMethodInput, setCommMethodInput] = useState("");

  // Preferences
  const [prefs, setPrefs] = useState({
    schedule_appointments: true, respond_emails: true,
    social_media_posting: false, social_media_responding: true,
    social_media_commenting: true, prospect_scanning: true,
    sms_campaigns: true, email_campaigns: true,
    crm_sync: false, google_sheets_logging: true,
  });

  useEffect(() => { loadReplicas(); }, []);

  const loadReplicas = async () => {
    try {
      const list = await base44.entities.UserReplica.list('-created_date', 20);
      setReplicas(list);
      const active = list.find(r => r.ai_replica_status === 'active') || list[0];
      if (active) { setActiveReplica(active); setStep(4); }
    } catch (_) {}
  };

  const handleCreateReplica = async () => {
    setLoading(true);
    setStep(1);
    try {
      const res = await base44.functions.invoke('createUserReplica', form);
      const data = res.data || res;
      setScrapeResult(data);
      setStep(2);
      toast({ title: "AI Replica Created", description: "Web scraping and personality analysis complete." });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setStep(0);
    }
    setLoading(false);
  };

  const handleActivate = async () => {
    if (!scrapeResult?.replica_id) return;
    setLoading(true);
    try {
      await base44.entities.UserReplica.update(scrapeResult.replica_id, {
        ai_replica_status: 'active', onboarded: true, onboarded_at: new Date().toISOString(),
        assistant_preferences: prefs,
      });
      toast({ title: "AI Replica Activated", description: "Your digital team member is now live." });
      await loadReplicas();
      setStep(4);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // ── Render ──
  if (step === 4 && activeReplica) {
    return <ReplicaDashboard replica={activeReplica} onEdit={() => setStep(3)} />;
  }

  return (
    <div className="min-h-screen bg-base tl-grid-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-accent-orange" />
            <h1 className="font-display text-2xl tracking-[0.15em] uppercase text-text-primary">Digital Team</h1>
          </div>
          <p className="text-sm text-text-muted">Create an AI replica that sells, communicates, and schedules like you</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-display uppercase tracking-wider transition-all",
                i === step ? "bg-accent-orange text-white" :
                i < step ? "bg-status-green/20 text-status-green" :
                "bg-surface text-text-muted")}>
                {i < step ? <CheckCircle2 className="h-3 w-3" /> : <span className="w-3 text-center">{i+1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <div className={cn("w-6 h-px", i < step ? "bg-status-green" : "bg-surface-border")} />}
            </div>
          ))}
        </div>

        {/* Step 0: Profile Form */}
        {step === 0 && (
          <div className="tl-panel rounded-xl p-6 space-y-5 tl-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-accent-orange" />
              <h2 className="font-display text-sm uppercase tracking-wider">Your Profile</h2>
            </div>
            <p className="text-xs text-text-muted">Enter your details. The system will scrape the web to build your AI replica.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-display uppercase text-text-muted">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                  placeholder="John Smith" className="w-full h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-display uppercase text-text-muted">Email *</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="john@company.com" className="w-full h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Phone Number</label>
              <input value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})}
                placeholder="+1 555-000-0000" className="w-full h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
            </div>

            {/* Business Emails */}
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Business Emails</label>
              <div className="flex gap-2 mb-2">
                <input value={bizEmailInput} onChange={e => setBizEmailInput(e.target.value)}
                  placeholder="Add business email" className="flex-1 h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none"
                  onKeyDown={e => { if (e.key === 'Enter' && bizEmailInput) { setForm({...form, business_emails: [...form.business_emails, bizEmailInput]}); setBizEmailInput(""); }}} />
                <button onClick={() => { if (bizEmailInput) { setForm({...form, business_emails: [...form.business_emails, bizEmailInput]}); setBizEmailInput(""); } }}
                  className="h-9 px-3 rounded bg-accent-orange text-white text-xs font-display uppercase">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.business_emails.map((e, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-surface text-[11px]">
                    {e} <button onClick={() => setForm({...form, business_emails: form.business_emails.filter((_, j) => j !== i)})} className="text-text-muted hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Social Media Accounts</label>
              <div className="flex gap-2 mb-2">
                <input value={socialInput.platform} onChange={e => setSocialInput({...socialInput, platform: e.target.value})}
                  placeholder="Platform (LinkedIn)" className="w-32 h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
                <input value={socialInput.handle} onChange={e => setSocialInput({...socialInput, handle: e.target.value})}
                  placeholder="@handle or URL" className="flex-1 h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
                <button onClick={() => { if (socialInput.platform && socialInput.handle) { setForm({...form, social_media_accounts: [...form.social_media_accounts, socialInput]}); setSocialInput({platform: "", handle: ""}); } }}
                  className="h-9 px-3 rounded bg-accent-orange text-white text-xs font-display uppercase">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.social_media_accounts.map((s, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-surface text-[11px]">
                    <Share2 className="h-3 w-3" /> {s.platform}: {s.handle}
                    <button onClick={() => setForm({...form, social_media_accounts: form.social_media_accounts.filter((_, j) => j !== i)})} className="text-text-muted hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Communication Methods */}
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Communication Methods / Devices</label>
              <div className="flex gap-2 mb-2">
                <input value={commMethodInput} onChange={e => setCommMethodInput(e.target.value)}
                  placeholder="e.g. iPhone, WhatsApp, Slack, Zoom" className="flex-1 h-9 px-3 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none"
                  onKeyDown={e => { if (e.key === 'Enter' && commMethodInput) { setForm({...form, communication_methods: [...form.communication_methods, commMethodInput]}); setCommMethodInput(""); }}} />
                <button onClick={() => { if (commMethodInput) { setForm({...form, communication_methods: [...form.communication_methods, commMethodInput]}); setCommMethodInput(""); } }}
                  className="h-9 px-3 rounded bg-accent-orange text-white text-xs font-display uppercase">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.communication_methods.map((m, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-surface text-[11px]">
                    {m} <button onClick={() => setForm({...form, communication_methods: form.communication_methods.filter((_, j) => j !== i)})} className="text-text-muted hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            </div>

            <button onClick={handleCreateReplica} disabled={!form.full_name || !form.email || loading}
              className="w-full h-11 rounded-lg bg-accent-orange text-white font-display text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              <Search className="h-4 w-4" /> Start Web Scraping & AI Replica Creation
            </button>
          </div>
        )}

        {/* Step 1: Scraping */}
        {step === 1 && (
          <div className="tl-panel rounded-xl p-12 text-center tl-fade-in">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 rounded-full bg-accent-orange/20 blur-xl animate-pulse" />
              <Loader2 className="h-16 w-16 text-accent-orange animate-spin relative" />
            </div>
            <h2 className="font-display text-lg uppercase tracking-wider mb-2">Scraping The Web</h2>
            <p className="text-sm text-text-muted mb-4">Searching LinkedIn, Facebook, Google, news, and social media...</p>
            <div className="flex items-center justify-center gap-3 text-[10px] font-display uppercase text-text-muted">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Google</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> LinkedIn</span>
              <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> Facebook</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> News</span>
            </div>
          </div>
        )}

        {/* Step 2: Replica Review */}
        {step === 2 && scrapeResult && (
          <div className="space-y-4 tl-fade-in">
            {/* Scraped Data */}
            {scrapeResult.scraped && (
              <div className="tl-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-accent-orange" />
                  <h3 className="font-display text-xs uppercase tracking-wider">Web Scrape Results</h3>
                </div>
                <p className="text-sm text-text-primary mb-3">{scrapeResult.scraped.summary}</p>
                {scrapeResult.scraped.professional_background && (
                  <p className="text-xs text-text-muted mb-2"><strong className="text-text-primary">Background:</strong> {scrapeResult.scraped.professional_background}</p>
                )}
                {scrapeResult.scraped.public_persona && (
                  <p className="text-xs text-text-muted mb-2"><strong className="text-text-primary">Persona:</strong> {scrapeResult.scraped.public_persona}</p>
                )}
                {scrapeResult.scraped.interests?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {scrapeResult.scraped.interests.map((i, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-surface text-[10px] text-text-muted">{i}</span>
                    ))}
                  </div>
                )}
                {scrapeResult.scraped.sources?.length > 0 && (
                  <div className="mt-3 text-[10px] text-text-muted">
                    <strong>Sources:</strong> {scrapeResult.scraped.sources.slice(0, 5).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* AI Replica */}
            {scrapeResult.replica && (
              <>
                <div className="tl-panel rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-accent-orange" />
                    <h3 className="font-display text-xs uppercase tracking-wider">AI Replica Profile</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-display uppercase text-text-muted mb-1">Personality Traits</p>
                      <div className="flex flex-wrap gap-1">
                        {scrapeResult.replica.personality_traits?.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-accent-orange/10 text-accent-orange text-[10px]">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-display uppercase text-text-muted mb-1">Sales Techniques</p>
                      <div className="flex flex-wrap gap-1">
                        {scrapeResult.replica.sales_techniques?.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-status-green/10 text-status-green text-[10px]">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] font-display uppercase text-text-muted mb-1">Communication Style</p>
                    <p className="text-xs text-text-primary">{scrapeResult.replica.communication_style}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] font-display uppercase text-text-muted mb-1">Recommended Tones</p>
                    <div className="flex flex-wrap gap-1">
                      {scrapeResult.replica.recommended_tones?.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface text-[10px]">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommended Messages */}
                {scrapeResult.replica.recommended_messages?.length > 0 && (
                  <div className="tl-panel rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-accent-orange" />
                      <h3 className="font-display text-xs uppercase tracking-wider">Recommended Messages</h3>
                    </div>
                    <div className="space-y-2">
                      {scrapeResult.replica.recommended_messages.map((m, i) => (
                        <div key={i} className="rounded-lg border border-surface-border bg-base/40 p-3">
                          <p className="text-[10px] font-display uppercase text-accent-orange mb-1">{m.type}</p>
                          <p className="text-xs text-text-primary">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <button onClick={() => setStep(3)} className="w-full h-11 rounded-lg bg-accent-orange text-white font-display text-sm uppercase tracking-wider hover:opacity-90 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Review & Set Preferences
            </button>
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 3 && (
          <div className="tl-panel rounded-xl p-6 space-y-4 tl-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-accent-orange" />
              <h2 className="font-display text-sm uppercase tracking-wider">What Should Your AI Do?</h2>
            </div>
            <p className="text-xs text-text-muted">Select what your AI replica should handle autonomously.</p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'schedule_appointments', label: 'Schedule Appointments', icon: Calendar },
                { key: 'respond_emails', label: 'Respond to Emails', icon: Mail },
                { key: 'social_media_posting', label: 'Post on Social Media', icon: Share2 },
                { key: 'social_media_responding', label: 'Respond on Social Media', icon: MessageSquare },
                { key: 'social_media_commenting', label: 'Comment on Posts', icon: MessageSquare },
                { key: 'prospect_scanning', label: 'Scan for Prospects', icon: Search },
                { key: 'sms_campaigns', label: 'SMS Campaigns', icon: Phone },
                { key: 'email_campaigns', label: 'Email Campaigns', icon: Mail },
                { key: 'crm_sync', label: 'CRM Sync', icon: Users },
                { key: 'google_sheets_logging', label: 'Google Sheets Logging', icon: FileText },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setPrefs({...prefs, [key]: !prefs[key]})}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border text-xs transition-all",
                    prefs[key] ? "border-accent-orange bg-accent-orange/10 text-accent-orange" : "border-surface-border text-text-muted hover:text-text-primary")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {prefs[key] && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                </button>
              ))}
            </div>

            <button onClick={handleActivate} disabled={loading}
              className="w-full h-11 rounded-lg bg-accent-orange text-white font-display text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Activate AI Replica
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Replica Dashboard ──
function ReplicaDashboard({ replica, onEdit }) {
  return (
    <div className="min-h-screen bg-base tl-grid-bg">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-accent-orange/20 flex items-center justify-center">
                <span className="text-lg font-display text-accent-orange">{replica.full_name?.[0] || 'A'}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-status-green border-2 border-base tl-led" />
            </div>
            <div>
              <h1 className="font-display text-lg tracking-wider text-text-primary">{replica.full_name}</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">AI Replica · Active</p>
            </div>
          </div>
          <button onClick={onEdit} className="px-3 py-1.5 rounded border border-surface-border text-[10px] font-display uppercase text-text-muted hover:text-text-primary">
            Edit Preferences
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Status', value: replica.ai_replica_status, icon: Sparkles, color: 'text-status-green' },
            { label: 'Traits', value: replica.personality_traits?.length || 0, icon: Brain, color: 'text-accent-orange' },
            { label: 'Techniques', value: replica.sales_techniques?.length || 0, icon: CheckCircle2, color: 'text-chart-3' },
            { label: 'Messages', value: replica.recommended_messages?.length || 0, icon: MessageSquare, color: 'text-chart-4' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="tl-panel rounded-lg p-3">
              <Icon className={cn("h-4 w-4 mb-1", color)} />
              <p className="text-[9px] font-display uppercase text-text-muted">{label}</p>
              <p className={cn("text-lg font-display capitalize", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Personality & Style */}
        <div className="tl-panel rounded-xl p-5">
          <h3 className="font-display text-xs uppercase tracking-wider mb-3">Personality & Communication Style</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {replica.personality_traits?.map((t, i) => (
              <span key={i} className="px-2 py-1 rounded bg-accent-orange/10 text-accent-orange text-[10px]">{t}</span>
            ))}
          </div>
          <p className="text-xs text-text-primary">{replica.communication_style}</p>
        </div>

        {/* Sales Techniques */}
        {replica.sales_techniques?.length > 0 && (
          <div className="tl-panel rounded-xl p-5">
            <h3 className="font-display text-xs uppercase tracking-wider mb-3">Sales Techniques</h3>
            <div className="space-y-1.5">
              {replica.sales_techniques.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0 mt-0.5" /> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assistant Preferences */}
        <div className="tl-panel rounded-xl p-5">
          <h3 className="font-display text-xs uppercase tracking-wider mb-3">Active Duties</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(replica.assistant_preferences || {}).filter(([,v]) => v).map(([k]) => (
              <div key={k} className="flex items-center gap-2 text-xs text-text-primary">
                <Bell className="h-3.5 w-3.5 text-accent-orange" /> {k.replace(/_/g, ' ')}
              </div>
            ))}
            {Object.entries(replica.assistant_preferences || {}).filter(([,v]) => !v).map(([k]) => (
              <div key={k} className="flex items-center gap-2 text-xs text-text-muted opacity-50">
                <span className="h-3.5 w-3.5" /> {k.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>

        {/* AI Replica Prompt */}
        {replica.ai_replica_prompt && (
          <div className="tl-panel rounded-xl p-5">
            <h3 className="font-display text-xs uppercase tracking-wider mb-3">AI Replica System Prompt</h3>
            <div className="rounded-lg bg-base/60 p-3 max-h-48 overflow-y-auto scrollbar-thin">
              <p className="text-xs text-text-muted whitespace-pre-wrap font-mono">{replica.ai_replica_prompt}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/campaign-console" className="tl-panel rounded-xl p-4 hover:border-accent-orange transition-colors flex items-center gap-3">
            <Mail className="h-5 w-5 text-accent-orange" />
            <div>
              <p className="text-xs font-display uppercase tracking-wider text-text-primary">Campaign Console</p>
              <p className="text-[10px] text-text-muted">Launch email/SMS campaigns</p>
            </div>
          </a>
          <a href="/test-lab" className="tl-panel rounded-xl p-4 hover:border-accent-orange transition-colors flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent-orange" />
            <div>
              <p className="text-xs font-display uppercase tracking-wider text-text-primary">Test Lab</p>
              <p className="text-[10px] text-text-muted">Test your AI replica</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
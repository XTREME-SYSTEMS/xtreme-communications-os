import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Sparkles, Phone, Video, Globe, Wand2, Search } from "lucide-react";
import ThemeToggle from "@/components/xtreme/ThemeToggle";
import TemplateResults from "@/components/xtreme/TemplateResults";
import AvatarPanel from "@/components/xtreme/AvatarPanel";
import NumberRoutePanel from "@/components/xtreme/NumberRoutePanel";

const INDUSTRIES = [
  "Real Estate", "Healthcare", "Legal Services", "Insurance", "Financial Services",
  "Automotive", "Home Services", "Dental", "Medical Spa", "Mortgage Lending",
  "Solar Energy", "Roofing", "HVAC", "Plumbing", "Landscaping",
  "E-commerce", "SaaS / Tech", "Education", "Fitness", "Restaurant",
  "Travel & Hospitality", "Construction", "Accounting", "Property Management",
  "Telecommunications", "Retail", "Non-Profit", "Government", "Universal"
];

const CHANNELS = [
  { id: "voice", label: "Voice / Phone" },
  { id: "sms", label: "SMS" },
  { id: "mms", label: "MMS" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "facebook", label: "Facebook Messenger" },
  { id: "snapchat", label: "Snapchat" },
  { id: "instagram", label: "Instagram DM" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter / X" },
  { id: "tiktok", label: "TikTok" },
  { id: "discord", label: "Discord" },
  { id: "rcs", label: "RCS" }
];

const SITUATIONS = [
  { id: "sales", label: "Sales" },
  { id: "marketing", label: "Marketing" },
  { id: "follow_up", label: "Follow-Up" },
  { id: "outreach", label: "Outreach" },
  { id: "response", label: "Response" },
  { id: "comment", label: "Comment" },
  { id: "objection_handling", label: "Objection Handling" },
  { id: "qualification", label: "Qualification" },
  { id: "closing", label: "Closing" },
  { id: "appointment", label: "Appointment" },
  { id: "nurture", label: "Nurture" },
  { id: "re_engagement", label: "Re-Engagement" }
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "urgent", label: "Urgent" },
  { id: "empathetic", label: "Empathetic" },
  { id: "authoritative", label: "Authoritative" },
  { id: "friendly", label: "Friendly" },
  { id: "persuasive", label: "Persuasive" },
  { id: "consultative", label: "Consultative" },
  { id: "energetic", label: "Energetic" },
  { id: "calm", label: "Calm" }
];

export default function CommunicationStudio() {
  const { toast } = useToast();
  const [tab, setTab] = useState("templates");
  const [industry, setIndustry] = useState("Real Estate");
  const [industrySearch, setIndustrySearch] = useState("");
  const [selectedChannels, setSelectedChannels] = useState(["voice", "sms", "email", "whatsapp"]);
  const [selectedSituations, setSelectedSituations] = useState(["sales", "follow_up", "outreach", "response"]);
  const [selectedTones, setSelectedTones] = useState(["professional", "friendly", "persuasive"]);
  const [gender, setGender] = useState("female");
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [research, setResearch] = useState(null);
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    base44.entities.AgentPersona.list("-created_date", 50).then(setPersonas).catch(() => {});
  }, []);

  const toggle = (list, setList, id) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredIndustries = INDUSTRIES.filter(i =>
    i.toLowerCase().includes(industrySearch.toLowerCase())
  );

  const generate = async () => {
    if (selectedChannels.length === 0) { toast({ title: "Select at least one channel", variant: "destructive" }); return; }
    if (selectedSituations.length === 0) { toast({ title: "Select at least one situation", variant: "destructive" }); return; }
    if (selectedTones.length === 0) { toast({ title: "Select at least one tone", variant: "destructive" }); return; }

    setGenerating(true);
    setTemplates([]);
    setResearch(null);
    try {
      const res = await base44.functions.invoke("generateCommunicationSuite", {
        industry,
        channels: selectedChannels,
        situations: selectedSituations,
        tones: selectedTones,
        gender_preference: gender
      });
      const data = res.data || res;
      setResearch(data.research);
      const created = await base44.entities.CommunicationTemplate.filter({ industry }, "-created_date", 500);
      setTemplates(created);
      toast({ title: "Communication suite generated", description: `${data.templates_generated} templates for ${data.industry}` });
    } catch (e) {
      toast({ title: "Generation failed", description: String(e.message || e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const TABS = [
    { id: "templates", label: "Templates", icon: Sparkles },
    { id: "avatars", label: "Avatars", icon: Video },
    { id: "routing", label: "Number Routing", icon: Phone }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-surface/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Communication Studio</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">Industry Intelligence · Template Engine · Avatar Integration</span>
        </div>
        <div className="ml-auto w-32"><ThemeToggle /></div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 lg:px-6 border-b border-surface-border bg-surface/30">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 h-11 text-[11px] font-display uppercase tracking-wider border-b-2 transition-colors ${
                active ? "border-accent-orange text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 lg:p-6">
        {tab === "templates" && (
          <div className="space-y-4">
            {/* Industry Selector */}
            <div className="rounded-lg border border-surface-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-accent-orange" />
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Select Industry</span>
              </div>
              <input value={industrySearch} onChange={e => setIndustrySearch(e.target.value)}
                className="w-full h-9 px-3 rounded border border-surface-border bg-base text-[12px] mb-3"
                placeholder="Search industries…" />
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                {filteredIndustries.map(ind => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    className={`px-2.5 py-1 rounded text-[10px] font-display uppercase tracking-wider border transition-colors ${
                      industry === ind
                        ? "bg-accent-orange text-base border-accent-orange"
                        : "border-surface-border text-text-muted hover:text-text-primary hover:border-accent-orange/40"
                    }`}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Matrix */}
            <div className="rounded-lg border border-surface-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-accent-orange" />
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Communication Channels</span>
                <button onClick={() => setSelectedChannels(CHANNELS.map(c => c.id))}
                  className="ml-auto text-[9px] font-display uppercase tracking-wider text-text-muted hover:text-accent-orange">All</button>
                <button onClick={() => setSelectedChannels([])}
                  className="text-[9px] font-display uppercase tracking-wider text-text-muted hover:text-destructive">None</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {CHANNELS.map(c => {
                  const active = selectedChannels.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggle(selectedChannels, setSelectedChannels, c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded border text-[10px] font-display uppercase tracking-wider transition-colors ${
                        active ? "border-accent-orange bg-accent-orange/10 text-accent-orange" : "border-surface-border text-text-muted hover:text-text-primary"
                      }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent-orange" : "bg-text-muted"}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Situations + Tones */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-surface-border bg-surface p-4">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Situations</span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SITUATIONS.map(s => {
                    const active = selectedSituations.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggle(selectedSituations, setSelectedSituations, s.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-display uppercase tracking-wider border transition-colors ${
                          active ? "border-status-green bg-status-green/10 text-status-green" : "border-surface-border text-text-muted hover:text-text-primary"
                        }`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface p-4">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Tones</span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {TONES.map(t => {
                    const active = selectedTones.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => toggle(selectedTones, setSelectedTones, t.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-display uppercase tracking-wider border transition-colors ${
                          active ? "border-chart-3 bg-chart-3/10 text-chart-3" : "border-surface-border text-text-muted hover:text-text-primary"
                        }`}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gender + Generate */}
            <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Voice Gender</span>
                {["female", "male", "neutral"].map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`px-3 h-8 rounded text-[10px] font-display uppercase tracking-wider border transition-colors ${
                      gender === g ? "border-accent-orange bg-accent-orange/10 text-accent-orange" : "border-surface-border text-text-muted"
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
              <button onClick={generate} disabled={generating}
                className="ml-auto flex items-center gap-2 h-10 px-5 rounded bg-accent-orange text-base font-display uppercase tracking-wider text-[12px] hover:opacity-90 disabled:opacity-60">
                <Wand2 className="h-4 w-4" /> {generating ? "Generating…" : "Generate Suite"}
              </button>
            </div>

            {/* Results */}
            <TemplateResults templates={templates} research={research} loading={generating} />
          </div>
        )}

        {tab === "avatars" && <AvatarPanel personas={personas} />}
        {tab === "routing" && <NumberRoutePanel personas={personas} />}
      </div>
    </div>
  );
}
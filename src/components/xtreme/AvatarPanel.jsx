import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Video, Plus, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";

const PROVIDERS = [
  {
    id: "heygen",
    name: "HeyGen",
    tagline: "Best overall — REST API, natural lip-sync, custom avatars",
    url: "https://www.heygen.com/api",
    capabilities: ["video", "voice_clone", "custom_avatar", "real_time"],
    recommended: true,
    description: "HeyGen offers the most developer-friendly REST API for programmatic video generation. Natural lip-sync, facial motion, walking/talking avatars, and custom avatar creation from a 2-min video. Trusted by 170K+ teams.",
    apiDocs: "https://docs.heygen.com/"
  },
  {
    id: "d_id",
    name: "D-ID",
    tagline: "Strong REST API — talking head avatars, lifelike facial animation",
    url: "https://www.d-id.com/api",
    capabilities: ["video", "real_time"],
    recommended: true,
    description: "D-ID specializes in talking head avatars with lifelike facial animation. Excellent REST API for developers, supports real-time streaming and creative reality generation.",
    apiDocs: "https://docs.d-id.com/"
  },
  {
    id: "synthesia",
    name: "Synthesia",
    tagline: "Ultra-realistic avatars — AI Playground with Veo 3 / Sora 2",
    url: "https://www.synthesia.io/api",
    capabilities: ["video", "custom_avatar"],
    description: "Synthesia creates ultra-realistic AI-generated videos with avatars. Offers custom avatar creation via image, webcam, or studio session. One-click translation.",
    apiDocs: "https://docs.synthesia.io/"
  },
  {
    id: "creatify",
    name: "Creatify Aurora",
    tagline: "Highly realistic AI avatar videos with minimal setup",
    url: "https://creatify.ai",
    capabilities: ["video"],
    description: "Creatify Aurora produces highly realistic AI avatar videos with minimal setup and fast rendering."
  },
  {
    id: "deepbrain",
    name: "Deepbrain AI",
    tagline: "Ultra-realistic avatar generation, fast turnaround",
    url: "https://www.deepbrain.ai",
    capabilities: ["video", "real_time"],
    description: "Deepbrain AI focuses on ultra-realistic avatar generation with fast turnaround times and real-time interaction capabilities."
  },
  {
    id: "kling",
    name: "Kling AI",
    tagline: "Photorealistic human movement — best-in-class realism",
    url: "https://klingai.com",
    capabilities: ["video"],
    description: "Kling AI produces photorealistic human movement with best-in-class realism according to independent tests."
  }
];

export default function AvatarPanel({ personas }) {
  const { toast } = useToast();
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "heygen", gender: "female", voice_id: "", persona_id: "", preview_url: "", api_key_secret_name: "" });

  const load = async () => {
    try {
      const data = await base44.entities.AvatarConfig.list("-created_date", 50);
      setAvatars(data);
    } catch (e) { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      await base44.entities.AvatarConfig.create({
        ...form,
        capabilities: ["video"],
        status: "draft"
      });
      toast({ title: "Avatar config created", description: `${form.name} (${form.provider})` });
      setForm({ name: "", provider: "heygen", gender: "female", voice_id: "", persona_id: "", preview_url: "", api_key_secret_name: "" });
      setShowForm(false);
      load();
    } catch (e) {
      toast({ title: "Failed", description: String(e.message || e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Provider Recommendations */}
      <div className="rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent-orange" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Top Avatar Technologies</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {PROVIDERS.map(p => (
            <div key={p.id} className={cn("rounded-lg border p-3 bg-surface", p.recommended ? "border-accent-orange/40" : "border-surface-border")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[12px] text-text-primary">{p.name}</span>
                    {p.recommended && <span className="text-[8px] font-display uppercase px-1.5 py-0.5 rounded bg-accent-orange/20 text-accent-orange">Recommended</span>}
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">{p.tagline}</p>
                  <p className="text-[10px] text-text-primary mt-1.5 leading-relaxed">{p.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-accent-orange hover:underline">
                        <ExternalLink className="h-3 w-3" /> Website
                      </a>
                    )}
                    {p.apiDocs && (
                      <a href={p.apiDocs} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-chart-3 hover:underline">
                        <ExternalLink className="h-3 w-3" /> API Docs
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avatar Configs */}
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Avatar Configurations</span>
        <button onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[10px] font-display uppercase tracking-wider hover:bg-accent-orange/10">
          <Plus className="h-3.5 w-3.5" /> New Avatar
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]" placeholder="SMAI Sky Avatar" />
            </div>
            <div>
              <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Provider</label>
              <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}
                className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Voice ID</label>
              <input value={form.voice_id} onChange={e => setForm({ ...form, voice_id: e.target.value })}
                className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]" placeholder="Provider voice ID" />
            </div>
            <div>
              <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Linked Persona</label>
              <select value={form.persona_id} onChange={e => setForm({ ...form, persona_id: e.target.value })}
                className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
                <option value="">None</option>
                {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">API Key Secret Name</label>
              <input value={form.api_key_secret_name} onChange={e => setForm({ ...form, api_key_secret_name: e.target.value })}
                className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]" placeholder="HEYGEN_API_KEY" />
            </div>
          </div>
          <div>
            <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Preview URL</label>
            <input value={form.preview_url} onChange={e => setForm({ ...form, preview_url: e.target.value })}
              className="w-full mt-1 h-9 px-2 rounded border border-surface-border bg-base text-[12px]" placeholder="https://..." />
          </div>
          <button onClick={create}
            className="h-9 px-4 rounded bg-accent-orange text-base font-display uppercase tracking-wider text-[11px] hover:opacity-90">
            Create Avatar Config
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && <div className="text-[11px] text-text-muted font-display">Loading…</div>}
        {avatars.map(a => {
          const provider = PROVIDERS.find(p => p.id === a.provider);
          return (
            <div key={a.id} className="rounded-lg border border-surface-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-[12px] text-text-primary">{a.name}</span>
                <span className={cn("text-[8px] font-display uppercase px-1.5 py-0.5 rounded",
                  a.status === "active" ? "bg-status-green/10 text-status-green" : "bg-text-muted/10 text-text-muted")}>
                  {a.status}
                </span>
              </div>
              <div className="text-[10px] text-text-muted mt-1">{provider?.name || a.provider} · {a.gender}</div>
              {a.preview_url && (
                <div className="mt-2 rounded overflow-hidden h-24 bg-base">
                  <img src={a.preview_url} alt={a.name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import SystemDock from "@/components/xtreme/SystemDock";
import StatusStrip from "@/components/xtreme/StatusStrip";
import MobileNav from "@/components/xtreme/MobileNav";
import PersonaCard from "@/components/xtreme/PersonaCard";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = ["voice", "email", "phone", "social_media"];

export default function PersonaStudio() {
  const { toast } = useToast();
  const [mobileView, setMobileView] = useState("dispatch");
  const [personas, setPersonas] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    persona_type: "voice",
    voice_id: "",
    system_prompt: "",
    tone: "",
    personality_traits: "",
    assigned_context: "",
    avatar_color: "#ff6b00",
  });

  const load = useCallback(async () => {
    const rows = await base44.entities.AgentPersona.list("-created_date", 100);
    setPersonas(rows);
    setLoading(false);
  }, []);
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const filtered = filter === "all" ? personas : personas.filter(p => p.persona_type === filter);

  const toggle = async p => {
    await base44.entities.AgentPersona.update(p.id, { active: !p.active });
    toast({ title: `${p.name} ${!p.active ? "activated" : "deactivated"}` });
    await load();
  };

  const setDefault = async p => {
    await base44.entities.AgentPersona.update(p.id, { is_default: true });
    toast({ title: `${p.name} set as default` });
    await load();
  };

  const create = async () => {
    if (!form.name) return toast({ title: "Name required", variant: "destructive" });
    await base44.entities.AgentPersona.create({
      name: form.name,
      persona_type: form.persona_type,
      voice_id: form.voice_id || undefined,
      system_prompt: form.system_prompt || undefined,
      tone: form.tone || undefined,
      personality_traits: form.personality_traits
        ? form.personality_traits
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
        : [],
      assigned_context: form.assigned_context || undefined,
      avatar_color: form.avatar_color,
      active: true,
    });
    toast({ title: `${form.name} persona created` });
    setShowForm(false);
    setForm({
      name: "",
      persona_type: "voice",
      voice_id: "",
      system_prompt: "",
      tone: "",
      personality_traits: "",
      assigned_context: "",
      avatar_color: "#ff6b00",
    });
    await load();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-text-primary">
      <SystemDock activeNode="Persona Studio" engineState={{}} />
      <div className="flex-1 flex flex-col min-w-0">
        <StatusStrip
          parityPct={0}
          healthPass={0}
          healthTotal={0}
          queueCount={0}
          activeCount={0}
          onAudit={load}
          auditing={loading}
        />
        <div className="flex-1 overflow-y-auto scrollbar-thin grid-hairline">
          <div className="p-4 space-y-4 pb-20 lg:pb-4">
            <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h1 className="font-display text-lg tracking-[0.1em] uppercase">
                  Persona Studio
                </h1>
                <p className="text-[12px] text-text-muted mt-1">
                  Create and manage AI personas for voice, email, phone, and social media.
                  Toggle active personas or assign them to specific situations.
                </p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="h-10 px-4 rounded bg-accent-orange text-base font-display tracking-[0.1em] uppercase text-[12px] flex items-center gap-2"
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Cancel" : "New Persona"}
              </button>
            </div>

            {showForm && (
              <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Persona name"
                    className="h-10 px-3 rounded border border-surface-border bg-base text-[13px]"
                  />
                  <select
                    value={form.persona_type}
                    onChange={e => setForm({ ...form, persona_type: e.target.value })}
                    className="h-10 px-3 rounded border border-surface-border bg-base text-[13px]"
                  >
                    {TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={form.voice_id}
                  onChange={e => setForm({ ...form, voice_id: e.target.value })}
                  placeholder="Voice ID (e.g. Telnyx.Ultra.xxx)"
                  className="w-full h-10 px-3 rounded border border-surface-border bg-base text-[13px]"
                />
                <input
                  value={form.tone}
                  onChange={e => setForm({ ...form, tone: e.target.value })}
                  placeholder="Tone (e.g. warm, professional, casual)"
                  className="w-full h-10 px-3 rounded border border-surface-border bg-base text-[13px]"
                />
                <input
                  value={form.personality_traits}
                  onChange={e => setForm({ ...form, personality_traits: e.target.value })}
                  placeholder="Personality traits (comma-separated)"
                  className="w-full h-10 px-3 rounded border border-surface-border bg-base text-[13px]"
                />
                <input
                  value={form.assigned_context}
                  onChange={e => setForm({ ...form, assigned_context: e.target.value })}
                  placeholder="Assigned context (e.g. sales calls, support emails)"
                  className="w-full h-10 px-3 rounded border border-surface-border bg-base text-[13px]"
                />
                <textarea
                  value={form.system_prompt}
                  onChange={e => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="System prompt"
                  rows={3}
                  className="w-full p-3 rounded border border-surface-border bg-base text-[13px]"
                />
                <button
                  onClick={create}
                  className="h-10 px-5 rounded bg-accent-orange text-base font-display tracking-[0.1em] uppercase text-[12px]"
                >
                  Create Persona
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-3 h-8 rounded text-[11px] font-display tracking-wider uppercase border",
                  filter === "all"
                    ? "border-accent-orange text-accent-orange"
                    : "border-surface-border text-text-muted"
                )}
              >
                All
              </button>
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "px-3 h-8 rounded text-[11px] font-display tracking-wider uppercase border",
                    filter === t
                      ? "border-accent-orange text-accent-orange"
                      : "border-surface-border text-text-muted"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading && (
                <div className="text-[12px] text-text-muted font-display tracking-wider">
                  LOADING…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="text-[12px] text-text-muted font-display tracking-wider">
                  NO PERSONAS YET — CREATE ONE ABOVE
                </div>
              )}
              {filtered.map(p => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  onToggle={toggle}
                  onSetDefault={setDefault}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <MobileNav view={mobileView} setView={setMobileView} />
    </div>
  );
}
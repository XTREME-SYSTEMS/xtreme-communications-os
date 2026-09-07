import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Brain, Plus, Trash2, Loader2, Play, Sparkles, Volume2, ArrowLeft, CheckCircle2 } from "lucide-react";

const VOICES = [
  { id: "river", name: "River", desc: "Calm, neutral" },
  { id: "honey", name: "Honey", desc: "Warm, soft" },
  { id: "sunny", name: "Sunny", desc: "Bright, upbeat" },
  { id: "storm", name: "Storm", desc: "Formal, authoritative" },
  { id: "spark", name: "Spark", desc: "Energetic, quick" },
];

export default function PortalAgents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [form, setForm] = useState({ name: "", persona_type: "voice", voice_id: "river", tone: "professional", system_prompt: "", personality_traits: [], assigned_context: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setAgents(await base44.entities.AgentPersona.list('-created_date', 50)); }
    catch (_) {}
    setLoading(false);
  };

  const testVoice = async (voiceId) => {
    setTesting(voiceId);
    try {
      const res = await base44.integrations.Core.GenerateSpeech({
        text: `Hi! I'm your AI assistant. I'm here to help you with whatever you need. How can I assist you today?`,
        voice: voiceId,
      });
      const url = res.url || res;
      if (url) {
        const audio = new Audio(url);
        setPlaying(voiceId);
        audio.play();
        audio.onended = () => setPlaying(null);
      }
    } catch (e) {
      toast({ title: "Voice test failed", description: e.message, variant: "destructive" });
    }
    setTesting(null);
  };

  const generatePrompt = async () => {
    if (!form.name) return;
    setForm({ ...form, system_prompt: "Generating..." });
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a system prompt for an AI voice agent named "${form.name}". Tone: ${form.tone}. Context: ${form.assigned_context || "general customer communication"}. The agent should greet callers, answer questions, capture contact info, and schedule appointments. Keep under 300 words. Write only the prompt text.`,
      });
      setForm({ ...form, system_prompt: typeof res === "string" ? res : JSON.stringify(res) });
    } catch (e) {
      setForm({ ...form, system_prompt: `You are ${form.name}, an AI voice agent. Be ${form.tone}. Greet callers professionally, answer questions, capture contact information, and schedule appointments when requested.` });
    }
  };

  const handleCreate = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      await base44.entities.AgentPersona.create({ ...form, active: true });
      toast({ title: "AI Agent created!", description: form.name });
      setForm({ name: "", persona_type: "voice", voice_id: "river", tone: "professional", system_prompt: "", personality_traits: [], assigned_context: "" });
      setShowForm(false);
      await load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id) => {
    try { await base44.entities.AgentPersona.delete(id); toast({ title: "Agent deleted" }); await load(); }
    catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">AI Agents</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage your AI voice assistants.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Agent
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Alex" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</label>
              <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                <option>professional</option><option>friendly</option><option>casual</option>
                <option>empathetic</option><option>energetic</option><option>authoritative</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Context</label>
            <input value={form.assigned_context} onChange={e => setForm({ ...form, assigned_context: e.target.value })}
              placeholder="e.g. Inbound sales calls, Customer support" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice (click to test)</label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {VOICES.map(v => (
                <button key={v.id} onClick={() => { setForm({ ...form, voice_id: v.id }); testVoice(v.id); }}
                  className={cn("p-2 rounded-lg border text-center relative", form.voice_id === v.id ? "border-primary bg-primary/10" : "border-border")}>
                  {form.voice_id === v.id && testing === v.id && <Loader2 className="h-3 w-3 animate-spin absolute top-1 right-1" />}
                  {form.voice_id === v.id && playing === v.id && <Volume2 className="h-3 w-3 absolute top-1 right-1 text-primary" />}
                  <p className="text-xs font-medium text-foreground">{v.name}</p>
                  <p className="text-[9px] text-muted-foreground">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Prompt</label>
            <textarea value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })}
              placeholder="Write or generate the AI system prompt..."
              className="w-full h-32 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-xs focus:border-primary outline-none resize-none" />
            <button onClick={generatePrompt} disabled={!form.name}
              className="mt-2 px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/10 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Generate with AI
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create Agent</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Agents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
      ) : agents.length === 0 && !showForm ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No AI agents yet. Create your first one!</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.tone} · {a.voice_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {a.active && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {a.assigned_context && <p className="text-xs text-muted-foreground mb-2">{a.assigned_context}</p>}
              {a.system_prompt && <p className="text-[10px] text-muted-foreground line-clamp-2">{a.system_prompt}</p>}
              <button onClick={() => testVoice(a.voice_id)} disabled={testing === a.voice_id}
                className="mt-3 w-full px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center gap-1.5">
                {testing === a.voice_id ? <Loader2 className="h-3 w-3 animate-spin" /> : playing === a.voice_id ? <Volume2 className="h-3 w-3 text-primary" /> : <Play className="h-3 w-3" />}
                Test Voice
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
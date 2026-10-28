import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, Volume2, Check, Loader2, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ENGINES = [
  {
    id: "cartesia",
    name: "Cartesia Sonic 3",
    tag: "Premium · live",
    blurb: "Sub-100ms streaming, the most natural human cadence available to a phone line.",
    ready: true,
    voices: [
      { id: "6c756032-11c3-4be8-a120-74f9673fb700", name: "Harlow — warm support" },
      { id: "cfce9402-0067-458b-95a7-95846f469406", name: "Sheryl — warm briefing" },
      { id: "fd91495f-b8da-4944-ab8f-674c13089d7f", name: "Blair — triage ally" },
      { id: "f4c33650-23a7-43bd-8199-1af16815e58a", name: "Bronwen — guidance narrator" },
      { id: "33d406dd-ff6f-4be7-a7f5-8b1ba183b3e4", name: "Nandi — poised concierge" },
      { id: "f4e419a9-fc75-4252-9d4e-93e4247f07c9", name: "Peyton — peer ally" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs Turbo",
    tag: "Premium · needs key",
    blurb: "Closest to a real recorded human. Requires an ElevenLabs API key.",
    ready: false,
    voices: [
      { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel — calm narrator" },
      { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi — strong, warm" },
      { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella — soft, friendly" },
      { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli — expressive" },
    ],
  },
  {
    id: "polly",
    name: "Amazon Polly",
    tag: "Standard · always on",
    blurb: "Twilio-native with zero added latency. Safe fallback if a premium call fails.",
    ready: true,
    voices: [
      { id: "Danielle-Generative", name: "Danielle — grounded" },
      { id: "Joanna-Generative", name: "Joanna — conversational" },
      { id: "Kendra-Generative", name: "Kendra — bright, clear" },
      { id: "Ruth-Generative", name: "Ruth — deep, authoritative" },
    ],
  },
];

const PREVIEW_TEXT = "Hi, this is Eden Skye with Strategic Minds AI. How can I help you today?";

export default function VoiceEnginePanel() {
  const [engine, setEngine] = useState("cartesia");
  const [voiceId, setVoiceId] = useState(ENGINES[0].voices[0].id);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [sample, setSample] = useState(PREVIEW_TEXT);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const profiles = await base44.entities.VoiceProfile.filter({ is_default: true }).catch(() => []);
    const active = profiles?.[0];
    if (!active) return;
    setSaved(active);
    const match = ENGINES.find(e => e.id === active.provider);
    if (match) {
      setEngine(match.id);
      setVoiceId(match.voices.some(v => v.id === active.voice_id) ? active.voice_id : match.voices[0].id);
    }
  };

  const current = ENGINES.find(e => e.id === engine);
  const voiceName = current.voices.find(v => v.id === voiceId)?.name || voiceId;

  const pickEngine = (id) => {
    const next = ENGINES.find(e => e.id === id);
    setEngine(id);
    setVoiceId(next.voices[0].id);
    setStatus(null);
    setError(null);
  };

  const preview = async () => {
    setBusy("preview");
    setStatus(null);
    setError(null);
    try {
      const res = await base44.functions.invoke("voiceSynthesize", {
        text: sample,
        provider: engine,
        voice_id: voiceId,
      });
      const data = res?.data || res;
      if (data?.error) setError(data.error);
      else {
        await new Audio(data.url).play().catch(() => {});
        setStatus(`Playing ${data.provider} · ${data.characters} characters`);
      }
    } catch (e) {
      setError(e.message || "Preview failed");
    }
    setBusy("");
  };

  const save = async () => {
    setBusy("save");
    setStatus(null);
    setError(null);
    try {
      const payload = {
        profile_name: `Eden Skye — ${voiceName}`,
        provider: engine,
        voice_id: voiceId,
        gender: "female",
        tone: "warm",
        persona_name: "Eden Skye",
        is_default: true,
        active: true,
      };
      if (saved?.id) await base44.entities.VoiceProfile.update(saved.id, payload);
      else await base44.entities.VoiceProfile.create(payload);
      await load();
      setStatus("Saved — Eden Skye now speaks with this voice on every call.");
    } catch (e) {
      setError(e.message || "Could not save");
    }
    setBusy("");
  };

  return (
    <Card className="border-accent-orange/40">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-orange" /> Eden Skye · voice engine
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pick the synthesis model that answers your calls.
            </p>
          </div>
          <Badge variant="outline" className="border-accent-orange/40 text-accent-orange">
            <Sparkles className="w-3 h-3 mr-1" />
            {saved ? `${saved.provider} · ${saved.voice_id?.slice(0, 12)}` : "Not set"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {ENGINES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => pickEngine(e.id)}
              className={cn(
                "text-left rounded-lg border p-3 transition-colors",
                engine === e.id ? "border-accent-orange bg-accent-orange/5" : "border-border hover:bg-accent"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{e.name}</span>
                {engine === e.id && <Check className="w-4 h-4 text-accent-orange shrink-0" />}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{e.tag}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{e.blurb}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Select value={voiceId} onValueChange={setVoiceId}>
            <SelectTrigger className="md:w-64"><SelectValue placeholder="Voice" /></SelectTrigger>
            <SelectContent>
              {current.voices.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            placeholder="Preview text"
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={preview} disabled={busy === "preview"}>
            {busy === "preview" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Volume2 className="w-4 h-4 mr-1" />}
            Preview
          </Button>
          <Button size="sm" onClick={save} disabled={busy === "save"}>
            {busy === "save" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            Use for calls
          </Button>
          {status && <span className="text-xs text-status-green">{status}</span>}
          {error && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
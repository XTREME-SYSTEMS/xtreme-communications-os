import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Phone, PhoneCall, Play, Pause, Volume2, Square, User } from "lucide-react";

const VOICES = [
  { id: "river", label: "River — calm, neutral", gender: "female" },
  { id: "honey", label: "Honey — warm, soft", gender: "female" },
  { id: "sunny", label: "Sunny — bright, upbeat", gender: "female" },
  { id: "storm", label: "Storm — formal, authoritative", gender: "male" },
  { id: "spark", label: "Spark — energetic, quick", gender: "male" },
];

const SCENARIOS = [
  "Sales inquiry call — prospect asked about pricing",
  "Customer support — billing dispute",
  "Appointment scheduling — dental cleaning",
  "Follow-up call — after property showing",
  "Cold outreach — introducing a new service",
  "Win-back call — former customer",
  "Qualification call — checking budget and timeline",
];

export default function VoiceTestPanel({ personas, numbers }) {
  const { toast } = useToast();
  const [personaAId, setPersonaAId] = useState("");
  const [personaBId, setPersonaBId] = useState("");
  const [voiceA, setVoiceA] = useState("river");
  const [voiceB, setVoiceB] = useState("storm");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [maxTurns, setMaxTurns] = useState(6);
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState([]);
  const [summary, setSummary] = useState("");
  const [currentTurn, setCurrentTurn] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const personaA = personas.find(p => p.id === personaAId);
  const personaB = personas.find(p => p.id === personaBId);

  const runTest = async () => {
    if (!personaAId || !personaBId) { toast({ title: "Select both agents", variant: "destructive" }); return; }
    setRunning(true);
    setTurns([]);
    setSummary("");
    setCurrentTurn(-1);
    try {
      const res = await base44.functions.invoke("runClosedLoopTest", {
        persona_a: { ...personaA, voice_id: voiceA },
        persona_b: { ...personaB, voice_id: voiceB },
        channel: "voice",
        scenario,
        max_turns: maxTurns,
        generate_audio: true,
        from_number: fromNumber,
        to_number: toNumber,
      });
      const data = res.data || res;
      setTurns(data.turns || []);
      setSummary(data.summary || "");
      toast({ title: "Voice test complete", description: `${(data.turns || []).length} turns generated with audio` });
    } catch (e) {
      toast({ title: "Test failed", description: String(e.message || e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const playTurn = (idx) => {
    const turn = turns[idx];
    if (!turn?.audio_url) return;
    if (audioRef.current) { audioRef.current.pause(); }
    const audio = new Audio(turn.audio_url);
    audio.onplay = () => { setPlaying(true); setCurrentTurn(idx); };
    audio.onended = () => {
      setPlaying(false);
      if (idx + 1 < turns.length && turns[idx + 1]?.audio_url) {
        setTimeout(() => playTurn(idx + 1), 400);
      } else {
        setCurrentTurn(-1);
      }
    };
    audio.onerror = () => { setPlaying(false); setCurrentTurn(-1); };
    audioRef.current = audio;
    audio.play();
  };

  const stopPlayback = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
    setCurrentTurn(-1);
  };

  useEffect(() => () => stopPlayback(), []);

  return (
    <div className="space-y-4">
      {/* Configuration */}
      <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-accent-orange" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">AI-to-AI Voice Test</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Agent A */}
          <div className="space-y-2">
            <span className="font-display text-[9px] uppercase tracking-wider text-accent-orange">Agent A (Caller)</span>
            <select value={personaAId} onChange={e => setPersonaAId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.persona_type})</option>)}
            </select>
            <select value={voiceA} onChange={e => setVoiceA(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">From number…</option>
              {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
          {/* Agent B */}
          <div className="space-y-2">
            <span className="font-display text-[9px] uppercase tracking-wider text-chart-3">Agent B (Receiver)</span>
            <select value={personaBId} onChange={e => setPersonaBId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.persona_type})</option>)}
            </select>
            <select value={voiceB} onChange={e => setVoiceB(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={toNumber} onChange={e => setToNumber(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">To number…</option>
              {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-[2fr_1fr] gap-3">
          <select value={scenario} onChange={e => setScenario(e.target.value)}
            className="h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
            {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-display uppercase text-text-muted">Turns:</span>
            <input type="range" min="2" max="12" value={maxTurns} onChange={e => setMaxTurns(Number(e.target.value))}
              className="flex-1 accent-accent-orange" />
            <span className="text-[12px] font-display w-6 text-center">{maxTurns}</span>
          </div>
        </div>
        <button onClick={runTest} disabled={running}
          className="w-full h-10 rounded bg-accent-orange text-base font-display uppercase tracking-wider text-[12px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
          {running ? <><div className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" /> Generating conversation…</> : <><PhoneCall className="h-4 w-4" /> Run Voice Test</>}
        </button>
      </div>

      {/* Results */}
      {turns.length > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-status-green" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Conversation Playback</span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => playTurn(0)} disabled={playing}
                className="flex items-center gap-1 h-7 px-2.5 rounded border border-status-green/40 text-status-green text-[10px] font-display uppercase tracking-wider hover:bg-status-green/10 disabled:opacity-50">
                <Play className="h-3 w-3" /> Play All
              </button>
              {playing && (
                <button onClick={stopPlayback}
                  className="flex items-center gap-1 h-7 px-2.5 rounded border border-destructive/40 text-destructive text-[10px] font-display uppercase tracking-wider hover:bg-destructive/10">
                  <Square className="h-3 w-3" /> Stop
                </button>
              )}
            </div>
          </div>
          {summary && <p className="text-[11px] text-text-muted italic">{summary}</p>}
          <div className="space-y-2">
            {turns.map((t, i) => {
              const isA = t.role === "a";
              const isActive = currentTurn === i;
              return (
                <div key={i} className={cn("flex gap-2", isA ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[75%] rounded-lg p-3 border", isA ? "bg-accent-orange/5 border-accent-orange/20" : "bg-chart-3/5 border-chart-3/20", isActive && "ring-2 ring-accent-orange")}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-display", isA ? "bg-accent-orange/20 text-accent-orange" : "bg-chart-3/20 text-chart-3")}>
                        {t.speaker_name?.[0] || "A"}
                      </div>
                      <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">{t.speaker_name}</span>
                    </div>
                    <p className="text-[12px] text-text-primary leading-relaxed">{t.text}</p>
                    {t.audio_url && (
                      <button onClick={() => playTurn(i)} disabled={playing && currentTurn === i}
                        className="mt-2 flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-text-muted hover:text-accent-orange disabled:opacity-50">
                        {isActive && playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {isActive && playing ? "Playing…" : "Play"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
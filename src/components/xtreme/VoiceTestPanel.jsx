import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { PhoneCall, Play, Pause, Volume2, Square, User, Radio, Signal } from "lucide-react";
import Oscilloscope from "./Oscilloscope";
import SchedulingResults from "./SchedulingResults";

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
  const [enableScheduling, setEnableScheduling] = useState(true);
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState([]);
  const [summary, setSummary] = useState("");
  const [scheduling, setScheduling] = useState(null);
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
    setScheduling(null);
    setCurrentTurn(-1);
    try {
      const res = await base44.functions.invoke("runClosedLoopTest", {
        persona_a: { ...personaA, voice_id: voiceA },
        persona_b: { ...personaB, voice_id: voiceB },
        channel: "voice",
        scenario,
        max_turns: maxTurns,
        generate_audio: true,
        enable_scheduling: enableScheduling,
        from_number: fromNumber,
        to_number: toNumber,
      });
      const data = res.data || res;
      setTurns(data.turns || []);
      setSummary(data.summary || "");
      setScheduling(data.scheduling || null);
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
      {/* Configuration Panel */}
      <div className="tl-panel tl-holographic rounded-xl p-5 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-orange to-transparent" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <PhoneCall className="h-5 w-5 text-accent-orange" />
            <div className="absolute -inset-1 rounded-full bg-accent-orange/20 blur-md -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">AI-to-AI Voice Test</span>
            <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">Closed-Loop Simulation with TTS Audio</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", running ? "bg-accent-orange tl-led" : "bg-status-green tl-led")} />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">{running ? "Generating" : "Ready"}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Agent A */}
          <div className="space-y-2 rounded-lg border border-accent-orange/20 bg-accent-orange/5 p-3">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-accent-orange/20 flex items-center justify-center">
                <User className="h-3 w-3 text-accent-orange" />
              </div>
              <span className="font-display text-[9px] uppercase tracking-[0.15em] text-accent-orange">Agent A — Caller</span>
            </div>
            <select value={personaAId} onChange={e => setPersonaAId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] focus:border-accent-orange outline-none">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.persona_type})</option>)}
            </select>
            <select value={voiceA} onChange={e => setVoiceA(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] focus:border-accent-orange outline-none">
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] font-mono focus:border-accent-orange outline-none">
              <option value="">From number…</option>
              {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>

          {/* Agent B */}
          <div className="space-y-2 rounded-lg border border-chart-3/20 bg-chart-3/5 p-3">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-chart-3/20 flex items-center justify-center">
                <User className="h-3 w-3 text-chart-3" />
              </div>
              <span className="font-display text-[9px] uppercase tracking-[0.15em] text-chart-3">Agent B — Receiver</span>
            </div>
            <select value={personaBId} onChange={e => setPersonaBId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] focus:border-chart-3 outline-none">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.persona_type})</option>)}
            </select>
            <select value={voiceB} onChange={e => setVoiceB(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] focus:border-chart-3 outline-none">
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={toNumber} onChange={e => setToNumber(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] font-mono focus:border-chart-3 outline-none">
              <option value="">To number…</option>
              {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr] gap-3">
          <select value={scenario} onChange={e => setScenario(e.target.value)}
            className="h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] focus:border-accent-orange outline-none">
            {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 rounded border border-surface-border bg-base/80">
            <span className="text-[10px] font-display uppercase text-text-muted">Turns</span>
            <input type="range" min="2" max="12" value={maxTurns} onChange={e => setMaxTurns(Number(e.target.value))}
              className="flex-1 accent-accent-orange" />
            <span className="text-[12px] font-display w-6 text-center text-accent-orange">{maxTurns}</span>
          </div>
        </div>

        {/* Scheduling toggle */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent-orange/20 bg-accent-orange/5">
          <button onClick={() => setEnableScheduling(!enableScheduling)}
            className={cn("relative h-5 w-9 rounded-full transition-colors", enableScheduling ? "bg-accent-orange" : "bg-surface-border")}>
            <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-base transition-all", enableScheduling ? "left-4.5" : "left-0.5")} style={{ left: enableScheduling ? '18px' : '2px' }} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-display uppercase tracking-wider text-accent-orange">Real Google Calendar Scheduling</span>
            <span className="text-[8px] text-text-muted">Checks calendar · creates event · sends invite · notifies human</span>
          </div>
        </div>

        <button onClick={runTest} disabled={running}
          className="w-full h-11 rounded-lg bg-accent-orange text-base font-display uppercase tracking-[0.15em] text-[12px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all tl-glow-orange">
          {running ? (
            <><div className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" /> Generating conversation…</>
          ) : (
            <><PhoneCall className="h-4 w-4" /> Initiate Voice Test</>
          )}
        </button>
      </div>

      {/* Results */}
      {turns.length > 0 && (
        <>
        <div className="tl-panel rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-status-green to-transparent" />

          {/* Playback Header */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Volume2 className="h-5 w-5 text-status-green" />
              <div className="absolute -inset-1 rounded-full bg-status-green/20 blur-md -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Conversation Playback</span>
              <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">{turns.length} turns · {playing ? "Playing" : "Stopped"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {playing && (
                <div className="flex items-center gap-1 px-2 h-7 rounded border border-destructive/40 bg-destructive/10">
                  <Radio className="h-3 w-3 text-destructive animate-pulse" />
                  <span className="text-[9px] font-display uppercase tracking-wider text-destructive">LIVE</span>
                </div>
              )}
              <button onClick={() => playTurn(0)} disabled={playing || !turns[0]?.audio_url}
                className="flex items-center gap-1.5 h-7 px-3 rounded border border-status-green/40 text-status-green text-[10px] font-display uppercase tracking-wider hover:bg-status-green/10 disabled:opacity-50 transition-colors">
                <Play className="h-3 w-3" /> Play All
              </button>
              {playing && (
                <button onClick={stopPlayback}
                  className="flex items-center gap-1.5 h-7 px-3 rounded border border-destructive/40 text-destructive text-[10px] font-display uppercase tracking-wider hover:bg-destructive/10 transition-colors">
                  <Square className="h-3 w-3" /> Stop
                </button>
              )}
            </div>
          </div>

          {/* Oscilloscope */}
          <div className="rounded-lg border border-surface-border bg-base/40 p-3">
            <Oscilloscope active={playing} bars={32} />
          </div>

          {summary && (
            <div className="rounded-lg border border-surface-border bg-base/30 p-3">
              <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Summary</span>
              <p className="text-[11px] text-text-primary mt-1 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Conversation Turns */}
          <div className="space-y-3">
            {turns.map((t, i) => {
              const isA = t.role === "a";
              const isActive = currentTurn === i;
              return (
                <div key={i} className={cn("flex gap-2 tl-fade-in", isA ? "justify-start" : "justify-end")}
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className={cn("max-w-[75%] rounded-xl p-3 border transition-all relative",
                    isA ? "bg-accent-orange/5 border-accent-orange/20" : "bg-chart-3/5 border-chart-3/20",
                    isActive && "ring-2 ring-accent-orange tl-glow-orange")}>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent-orange tl-pulse-ring" />
                    )}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-display",
                        isA ? "bg-accent-orange/20 text-accent-orange" : "bg-chart-3/20 text-chart-3")}>
                        {t.speaker_name?.[0] || "A"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-display uppercase tracking-wider text-text-primary">{t.speaker_name}</span>
                        <span className="text-[8px] text-text-muted uppercase">Turn {i + 1}</span>
                      </div>
                      {isActive && <Signal className="h-3 w-3 text-accent-orange animate-pulse ml-auto" />}
                    </div>
                    <p className="text-[12px] text-text-primary leading-relaxed">{t.text}</p>
                    {t.audio_url && (
                      <button onClick={() => isActive && playing ? stopPlayback() : playTurn(i)}
                        className="mt-2 flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-text-muted hover:text-accent-orange transition-colors">
                        {isActive && playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {isActive && playing ? "Playing…" : "Play turn"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {scheduling && <SchedulingResults scheduling={scheduling} />}
        </>
      )}
    </div>
  );
}
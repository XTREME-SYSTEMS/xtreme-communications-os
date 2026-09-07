import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, Smartphone, User } from "lucide-react";
import SchedulingResults from "./SchedulingResults";
import QualityScores from "./QualityScores";

const SCENARIOS = [
  "SMS sales follow-up — sent listing details",
  "WhatsApp support — order status inquiry",
  "SMS appointment reminder — tomorrow 2pm",
  "SMS outreach — new service announcement",
  "WhatsApp qualification — budget and timeline check",
  "SMS re-engagement — haven't heard back in 2 weeks",
];

export default function MessageTestPanel({ personas, numbers }) {
  const { toast } = useToast();
  const [personaAId, setPersonaAId] = useState("");
  const [personaBId, setPersonaBId] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [channel, setChannel] = useState("sms");
  const [maxTurns, setMaxTurns] = useState(6);
  const [enableScheduling, setEnableScheduling] = useState(true);
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState([]);
  const [summary, setSummary] = useState("");
  const [scheduling, setScheduling] = useState(null);
  const [qualityData, setQualityData] = useState(null);

  const personaA = personas.find(p => p.id === personaAId);
  const personaB = personas.find(p => p.id === personaBId);

  const runTest = async () => {
    if (!personaAId || !personaBId) { toast({ title: "Select both agents", variant: "destructive" }); return; }
    setRunning(true);
    setTurns([]);
    setSummary("");
    setScheduling(null);
    setQualityData(null);
    try {
      const res = await base44.functions.invoke("runClosedLoopTest", {
        persona_a: personaA,
        persona_b: personaB,
        channel,
        scenario,
        max_turns: maxTurns,
        generate_audio: false,
        enable_scheduling: enableScheduling,
        from_number: fromNumber,
        to_number: toNumber,
      });
      const data = res.data || res;
      setTurns(data.turns || []);
      setSummary(data.summary || "");
      setScheduling(data.scheduling || null);
      setQualityData({
        quality_score: data.quality_score,
        naturalness_score: data.naturalness_score,
        quality_gate_passed: data.quality_gate_passed,
        quality_feedback: data.quality_feedback,
        sentiment_trajectory: data.sentiment_trajectory,
        sentiment_summary: data.sentiment_summary,
      });
      toast({ title: "Message test complete", description: `${(data.turns || []).length} messages generated` });
    } catch (e) {
      toast({ title: "Test failed", description: String(e.message || e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Configuration */}
      <div className="tl-panel tl-holographic rounded-xl p-5 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-orange to-transparent" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-accent-orange" />
            <div className="absolute -inset-1 rounded-full bg-accent-orange/20 blur-md -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">AI-to-AI Message Test</span>
            <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">Closed-Loop SMS & WhatsApp Simulation</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", running ? "bg-accent-orange tl-led" : "bg-status-green tl-led")} />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">{running ? "Generating" : "Ready"}</span>
          </div>
        </div>

        {/* Channel selector */}
        <div className="flex gap-2">
          {["sms", "whatsapp"].map(ch => (
            <button key={ch} onClick={() => setChannel(ch)}
              className={cn("flex-1 h-10 rounded-lg border text-[11px] font-display uppercase tracking-wider transition-all",
                channel === ch
                  ? "border-accent-orange bg-accent-orange/10 text-accent-orange tl-glow-orange"
                  : "border-surface-border text-text-muted hover:text-text-primary")}>
              {ch === "sms" ? "SMS" : "WhatsApp"}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 rounded-lg border border-accent-orange/20 bg-accent-orange/5 p-3">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-accent-orange/20 flex items-center justify-center">
                <User className="h-3 w-3 text-accent-orange" />
              </div>
              <span className="font-display text-[9px] uppercase tracking-[0.15em] text-accent-orange">Agent A — Sender</span>
            </div>
            <select value={personaAId} onChange={e => setPersonaAId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] focus:border-accent-orange outline-none">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base/80 text-[12px] font-mono focus:border-accent-orange outline-none">
              <option value="">From number…</option>
              {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
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
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            <span className="absolute top-0.5 h-4 w-4 rounded-full bg-base transition-all" style={{ left: enableScheduling ? '18px' : '2px' }} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-display uppercase tracking-wider text-accent-orange">Real Google Calendar Scheduling</span>
            <span className="text-[8px] text-text-muted">Checks calendar · creates event · sends invite · notifies human</span>
          </div>
        </div>

        <button onClick={runTest} disabled={running}
          className="w-full h-11 rounded-lg bg-accent-orange text-base font-display uppercase tracking-[0.15em] text-[12px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all tl-glow-orange">
          {running ? (
            <><div className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" /> Generating…</>
          ) : (
            <><Send className="h-4 w-4" /> Initiate Message Test</>
          )}
        </button>
      </div>

      {/* Results */}
      {turns.length > 0 && (
        <>
        <div className="tl-panel rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-status-green to-transparent" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Smartphone className="h-5 w-5 text-status-green" />
              <div className="absolute -inset-1 rounded-full bg-status-green/20 blur-md -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Message Thread</span>
              <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">{channel.toUpperCase()} · {turns.length} messages</span>
            </div>
          </div>

          {summary && (
            <div className="rounded-lg border border-surface-border bg-base/30 p-3">
              <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Summary</span>
              <p className="text-[11px] text-text-primary mt-1 leading-relaxed">{summary}</p>
            </div>
          )}

          <div className="space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin">
            {turns.map((t, i) => {
              const isA = t.role === "a";
              return (
                <div key={i} className={cn("flex tl-fade-in", isA ? "justify-start" : "justify-end")}
                  style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className={cn("max-w-[70%] rounded-xl px-3 py-2 border",
                    isA ? "bg-accent-orange/10 border-accent-orange/20" : "bg-chart-3/10 border-chart-3/20")}>
                    <div className="text-[8px] font-display uppercase tracking-wider text-text-muted mb-0.5">{t.speaker_name}</div>
                    <p className="text-[12px] text-text-primary leading-relaxed">{t.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {qualityData && <QualityScores {...qualityData} />}
        {scheduling && <SchedulingResults scheduling={scheduling} />}
        </>
      )}
    </div>
  );
}
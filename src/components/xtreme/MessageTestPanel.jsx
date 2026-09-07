import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, Smartphone } from "lucide-react";

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
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState([]);
  const [summary, setSummary] = useState("");

  const personaA = personas.find(p => p.id === personaAId);
  const personaB = personas.find(p => p.id === personaBId);

  const runTest = async () => {
    if (!personaAId || !personaBId) { toast({ title: "Select both agents", variant: "destructive" }); return; }
    setRunning(true);
    setTurns([]);
    setSummary("");
    try {
      const res = await base44.functions.invoke("runClosedLoopTest", {
        persona_a: personaA,
        persona_b: personaB,
        channel,
        scenario,
        max_turns: maxTurns,
        generate_audio: false,
        from_number: fromNumber,
        to_number: toNumber,
      });
      const data = res.data || res;
      setTurns(data.turns || []);
      setSummary(data.summary || "");
      toast({ title: "Message test complete", description: `${(data.turns || []).length} messages generated` });
    } catch (e) {
      toast({ title: "Test failed", description: String(e.message || e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent-orange" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">AI-to-AI Message Test</span>
        </div>
        <div className="flex gap-2">
          {["sms", "whatsapp"].map(ch => (
            <button key={ch} onClick={() => setChannel(ch)}
              className={cn("flex-1 h-9 rounded border text-[11px] font-display uppercase tracking-wider transition-colors",
                channel === ch ? "border-accent-orange bg-accent-orange/10 text-accent-orange" : "border-surface-border text-text-muted")}>
              {ch === "sms" ? "SMS" : "WhatsApp"}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="font-display text-[9px] uppercase tracking-wider text-accent-orange">Agent A (Sender)</span>
            <select value={personaAId} onChange={e => setPersonaAId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">From number…</option>
              {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <span className="font-display text-[9px] uppercase tracking-wider text-chart-3">Agent B (Receiver)</span>
            <select value={personaBId} onChange={e => setPersonaBId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-[12px]">
              <option value="">Select persona…</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          {running ? <><div className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" /> Generating…</> : <><Send className="h-4 w-4" /> Run Message Test</>}
        </button>
      </div>

      {turns.length > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-status-green" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Message Thread</span>
            <span className="ml-auto text-[10px] text-text-muted font-display uppercase">{channel}</span>
          </div>
          {summary && <p className="text-[11px] text-text-muted italic">{summary}</p>}
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {turns.map((t, i) => {
              const isA = t.role === "a";
              return (
                <div key={i} className={cn("flex", isA ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[70%] rounded-lg px-3 py-2", isA ? "bg-accent-orange/10 border border-accent-orange/20" : "bg-chart-3/10 border border-chart-3/20")}>
                    <div className="text-[8px] font-display uppercase tracking-wider text-text-muted mb-0.5">{t.speaker_name}</div>
                    <p className="text-[12px] text-text-primary leading-relaxed">{t.text}</p>
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
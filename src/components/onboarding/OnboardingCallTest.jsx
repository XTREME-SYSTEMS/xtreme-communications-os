import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Phone, PhoneCall, PhoneOff, Loader2, Play, Pause, Volume2, CheckCircle2, AlertCircle, Signal } from "lucide-react";

/**
 * OnboardingCallTest — simulates a phone call inside onboarding.
 * Generates a multi-turn conversation via generateContent, then plays the
 * agent's lines as actual TTS audio (previewVoice) so the user can hear their
 * agent's configured voice. Also runs a phone-connectivity check.
 *
 * Props:
 *  - agentName, agentVoice, companyName, industry, useCase, agentTone
 */
export default function OnboardingCallTest({ agentName, agentVoice, companyName, industry, useCase, agentTone }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | live | ended | error
  const [turns, setTurns] = useState([]); // [{ role, text, audioUrl? }]
  const [activeTurn, setActiveTurn] = useState(-1);
  const [connectivity, setConnectivity] = useState(null); // null | 'ok' | 'simulated'
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);

  const startCall = async () => {
    setStatus("connecting");
    setError(null);
    setTurns([]);
    setConnectivity(null);
    try {
      // 1. Connectivity check — verify a phone number exists for this account
      let hasNumber = false;
      try {
        const numbers = await base44.entities.PhoneNumber.filter({ status: "assigned" }, '-created_date', 1);
        hasNumber = numbers && numbers.length > 0;
      } catch { /* ignore — treat as simulated */ }
      setConnectivity(hasNumber ? "ok" : "simulated");

      // 2. Generate the conversation script
      const res = await base44.functions.invoke("generateContent", {
        prompt: `Simulate a brief inbound phone call to ${agentName || "AI Assistant"}, a ${agentTone || "professional and friendly"} AI voice agent for ${companyName || "the company"}, a ${industry || "business"} company. The caller is a potential customer asking about ${useCase || "your services"}. Write a 4-turn conversation (caller and agent alternating, starting with the caller). Keep each line natural, brief, and realistic.\n\nFormat strictly as:\nCaller: ...\n${agentName || "Agent"}: ...\nCaller: ...\n${agentName || "Agent"}: ...`,
      });
      const output = res.data?.output || res.output || "";
      const text = typeof output === "string" ? output : JSON.stringify(output);

      // 3. Parse turns
      const parsed = [];
      const lines = text.split("\n").filter(l => l.trim());
      for (const line of lines) {
        const m = line.match(/^(Caller|Agent|[^:]+):\s*(.+)/);
        if (m) {
          const speaker = m[1].trim().toLowerCase().startsWith("caller") ? "caller" : "agent";
          parsed.push({ role: speaker, text: m[2].trim() });
        }
      }
      if (parsed.length === 0) {
        // fallback
        parsed.push({ role: "caller", text: "Hi, I saw your number online — do you handle this kind of service?" });
        parsed.push({ role: "agent", text: `Hi! Yes, this is ${agentName || "the assistant"} with ${companyName || "us"}. I'd be happy to help with that. Could I get your name?` });
        parsed.push({ role: "caller", text: "Sure, it's Jordan." });
        parsed.push({ role: "agent", text: "Great, Jordan. Let me capture your details and we'll get you scheduled right away." });
      }
      setTurns(parsed);
      setStatus("live");
      setActiveTurn(0);
    } catch (e) {
      setError(e.message || "Simulation failed");
      setStatus("error");
    }
  };

  // Play agent turns as TTS audio, advancing through the conversation
  useEffect(() => {
    if (status !== "live" || activeTurn < 0 || activeTurn >= turns.length) return;
    const turn = turns[activeTurn];
    if (turn.role !== "agent" || muted) {
      // caller turn — auto-advance after a short pause (simulated reading time)
      const t = setTimeout(() => {
        if (activeTurn + 1 < turns.length) setActiveTurn(activeTurn + 1);
        else setStatus("ended");
      }, 1800);
      return () => clearTimeout(t);
    }
    // agent turn — fetch audio then play
    let cancelled = false;
    (async () => {
      try {
        if (!turn.audioUrl) {
          const res = await base44.functions.invoke("previewVoice", {
            text: turn.text,
            voice: agentVoice || "river",
          });
          const url = res.data?.url || res.url;
          if (!cancelled && url) {
            const updated = [...turns];
            updated[activeTurn] = { ...turn, audioUrl: url };
            setTurns(updated);
            if (audioRef.current) {
              audioRef.current.src = url;
              audioRef.current.play().catch(() => {});
            }
          }
        } else if (audioRef.current) {
          audioRef.current.src = turn.audioUrl;
          audioRef.current.play().catch(() => {});
        }
      } catch { /* audio optional — fall through to auto-advance */ }
    })();
    return () => { cancelled = true; };
  }, [activeTurn, status, turns, muted, agentVoice]);

  const onAudioEnded = () => {
    if (activeTurn + 1 < turns.length) setActiveTurn(activeTurn + 1);
    else setStatus("ended");
  };

  const endCall = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setStatus("ended");
  };

  const replay = () => {
    setActiveTurn(0);
    setStatus("live");
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <audio ref={audioRef} onEnded={onAudioEnded} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <PhoneCall className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium text-foreground">Phone Call Simulation</p>
        {connectivity && (
          <span className={cn("ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
            connectivity === "ok" ? "bg-status-green/10 text-status-green" : "bg-primary/10 text-primary")}>
            <Signal className="h-3 w-3" /> {connectivity === "ok" ? "Number Connected" : "Simulated"}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Run a live simulation to hear your AI agent ({agentName || "your agent"}) respond for {companyName || "your business"} with the selected voice.
      </p>

      {/* Call UI */}
      {status === "idle" && (
        <button onClick={startCall} disabled={!agentName}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Phone className="h-4 w-4" /> Start Test Call
        </button>
      )}

      {status === "connecting" && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Connecting call…
        </div>
      )}

      {(status === "live" || status === "ended") && turns.length > 0 && (
        <div className="space-y-3">
          {/* Live indicator */}
          {status === "live" && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-status-green font-medium">
                <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" /> LIVE
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setMuted(m => !m)} className="text-muted-foreground hover:text-foreground" title={muted ? "Unmute" : "Mute"}>
                  <Volume2 className={cn("h-4 w-4", muted && "opacity-40")} />
                </button>
                <button onClick={endCall} className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-xs font-medium">
                  <PhoneOff className="h-3.5 w-3.5" /> End
                </button>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
            {turns.map((t, i) => {
              const isActive = i === activeTurn && status === "live";
              const isAgent = t.role === "agent";
              return (
                <div key={i} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-xs",
                    isAgent ? "bg-primary text-primary-foreground" : "bg-accent text-foreground",
                    isActive && "ring-2 ring-primary/50")}>
                    <p className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5 flex items-center gap-1">
                      {isAgent ? (agentName || "Agent") : "Caller"}
                      {isAgent && t.audioUrl && <Volume2 className="h-2.5 w-2.5" />}
                    </p>
                    <p>{t.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {status === "ended" && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="flex items-center gap-1.5 text-xs text-status-green">
                <CheckCircle2 className="h-3.5 w-3.5" /> Call complete
              </span>
              <button onClick={replay} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                <Play className="h-3 w-3" /> Replay
              </button>
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}. You can still continue — your agent is configured.</span>
        </div>
      )}
    </div>
  );
}
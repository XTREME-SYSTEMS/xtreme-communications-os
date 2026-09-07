import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2, Loader2, Brain, User, RefreshCw } from "lucide-react";

const VOICES = [
  { id: "river", name: "River", desc: "Calm, neutral" },
  { id: "honey", name: "Honey", desc: "Warm, soft" },
  { id: "sunny", name: "Sunny", desc: "Bright, upbeat" },
  { id: "storm", name: "Storm", desc: "Formal, authoritative" },
  { id: "spark", name: "Spark", desc: "Energetic, quick" },
];

export default function VoiceTest({ agents }) {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState("");
  const [voice, setVoice] = useState("river");
  const [previewing, setPreviewing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [running, setRunning] = useState(false);
  const [qualityScore, setQualityScore] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].id);
      setVoice(agents[0].voice_id || "river");
    }
  }, [agents]);

  const previewVoice = async () => {
    setPreviewing(true);
    setAudioUrl(null);
    try {
      const res = await base44.functions.invoke("previewVoice", {
        text: "Hi there! I'm your AI assistant. I'm here to help you with anything you need. How can I assist you today?",
        voice: voice,
      });
      const url = res.data?.url || res.url;
      if (url) {
        setAudioUrl(url);
        setTimeout(() => audioRef.current?.play(), 100);
      } else {
        toast({ title: "Preview unavailable", description: "Voice preview requires audio provider credentials.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    }
    setPreviewing(false);
  };

  const runMockConversation = async () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) { toast({ title: "Select an agent first", variant: "destructive" }); return; }
    setRunning(true);
    setConversation([]);
    setQualityScore(null);

    const scenario = "A prospect calls about your services. Greet them, understand their needs, and try to schedule a follow-up.";
    
    try {
      // Generate conversation turn by turn
      const turns = [
        { speaker: "prospect", prompt: "You're a prospect calling a business. Say your opening line — introduce yourself and mention you're looking for help. Keep it natural, 1-2 sentences." },
        { speaker: "agent", prompt: `You are ${agent.name}, an AI voice agent. A prospect just called and said: "{prev}". Greet them warmly and ask how you can help. Keep it to 1-2 sentences, natural and conversational.` },
        { speaker: "prospect", prompt: "You're the prospect. The agent just said: \"{prev}\". Respond naturally — explain what you need help with. 1-2 sentences." },
        { speaker: "agent", prompt: `You are ${agent.name}. The prospect said: "{prev}". Acknowledge their need and suggest scheduling a call or appointment. 1-2 sentences.` },
        { speaker: "prospect", prompt: "You're the prospect. The agent suggested scheduling. Respond positively and ask for details. 1-2 sentences." },
        { speaker: "agent", prompt: `You are ${agent.name}. The prospect agreed to schedule. Confirm a time and thank them. 1-2 sentences.` },
      ];

      let prevText = "";
      const localConv = [];
      for (const turn of turns) {
        const prompt = turn.prompt.replace("{prev}", prevText);
        const res = await base44.functions.invoke("generateContent", { prompt });
        const text = (res.data?.output || "").trim();
        prevText = text;
        const entry = {
          speaker: turn.speaker,
          text,
          name: turn.speaker === "agent" ? agent.name : "Prospect",
          timestamp: new Date().toISOString(),
        };
        localConv.push(entry);
        setConversation(prev => [...prev, entry]);
        await new Promise(r => setTimeout(r, 400));
      }

      // Generate quality score
      const scoreRes = await base44.functions.invoke("generateContent", {
        prompt: `Rate this AI voice agent conversation quality on a scale of 0-100. Consider naturalness, helpfulness, and flow. Return ONLY a number.\n\nConversation:\n${localConv.map(t => `${t.name}: ${t.text}`).join("\n")}`,
      });
      const score = parseInt((scoreRes.data?.output || "85").trim()) || 85;
      setQualityScore(score);

      await base44.entities.TestSession.create({
        test_type: "voice",
        agent_id: selectedAgent,
        agent_name: agent.name,
        transcript: localConv,
        result: "pass",
        notes: `Quality score: ${score}/100`,
      });

      toast({ title: "Mock conversation complete", description: `Quality score: ${score}/100` });
    } catch (e) {
      toast({ title: "Conversation failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const agent = agents.find(a => a.id === selectedAgent);

  return (
    <div className="space-y-6">
      {/* Agent & Voice Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select AI Agent</label>
          <select value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); const a = agents.find(a => a.id === e.target.value); if (a) setVoice(a.voice_id || "river"); }}
            className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
            {agents.length === 0 ? <option value="">No agents — create one first</option> : agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.persona_type})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice</label>
          <select value={voice} onChange={e => setVoice(e.target.value)}
            className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
            {VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
          </select>
        </div>
      </div>

      {/* Voice Preview */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Voice Preview</span>
          </div>
          <button onClick={previewVoice} disabled={previewing}
            className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 disabled:opacity-50 flex items-center gap-2">
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {previewing ? "Generating..." : "Preview Voice"}
          </button>
        </div>
        {audioUrl && (
          <audio ref={audioRef} controls src={audioUrl} className="w-full mt-3 h-10" />
        )}
      </div>

      {/* Mock Conversation */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Mock Conversation — Agent vs Prospect</span>
          </div>
          <div className="flex items-center gap-2">
            {qualityScore !== null && (
              <span className={cn("px-2 py-1 rounded-lg text-xs font-bold",
                qualityScore >= 80 ? "bg-status-green/10 text-status-green" :
                qualityScore >= 60 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                Quality: {qualityScore}/100
              </span>
            )}
            <button onClick={runMockConversation} disabled={running || !selectedAgent}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : conversation.length > 0 ? <RefreshCw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Running..." : conversation.length > 0 ? "Run Again" : "Start Mock Conversation"}
            </button>
          </div>
        </div>

        {/* Conversation display */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          {conversation.length === 0 && !running ? (
            <div className="text-center py-12">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click "Start Mock Conversation" to hear your AI agent talk with a simulated prospect</p>
            </div>
          ) : (
            conversation.map((turn, i) => (
              <div key={i} className={cn("flex gap-3", turn.speaker === "agent" ? "flex-row" : "flex-row-reverse")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  turn.speaker === "agent" ? "bg-primary/20" : "bg-accent")}>
                  {turn.speaker === "agent" ? <Brain className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2",
                  turn.speaker === "agent" ? "bg-primary/10 border border-primary/20 rounded-tl-sm" : "bg-accent border border-border rounded-tr-sm")}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{turn.name}</p>
                  <p className="text-sm text-foreground leading-snug">{turn.text}</p>
                </div>
              </div>
            ))
          )}
          {running && conversation.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
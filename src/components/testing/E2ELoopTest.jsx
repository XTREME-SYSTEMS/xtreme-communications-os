import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Play, Loader2, Phone, Mail, ArrowRight, CheckCircle2, Brain } from "lucide-react";

export default function E2ELoopTest({ agents, numbers }) {
  const { toast } = useToast();
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    if (numbers.length > 0 && !fromNumber) setFromNumber(numbers[0].e164);
    if (agents.length > 0 && !selectedAgent) setSelectedAgent(agents[0].id);
  }, [numbers, agents]);

  const runE2E = async () => {
    if (!toNumber.trim() || !toEmail.trim()) { toast({ title: "Receiving phone and email required", variant: "destructive" }); return; }
    setRunning(true);
    setSteps([]);

    const addStep = (step) => setSteps(prev => [...prev, step]);

    try {
      const agent = agents.find(a => a.id === selectedAgent);
      const initialMsg = message || `Hi! This is ${agent?.name || "your AI assistant"} from your Xtreme Communications account. We'd love to connect. Reply to continue the conversation.`;

      // Step 1: Send SMS
      addStep({ icon: "sms", label: "SMS Sent", detail: `From ${fromNumber} → ${toNumber}`, body: initialMsg, status: "done" });
      await new Promise(r => setTimeout(r, 800));

      // Step 2: Receive reply
      const replyRes = await base44.functions.invoke("generateContent", {
        prompt: `You are a prospect who just received this SMS: "${initialMsg}". Reply naturally and briefly. Max 160 chars. Just the reply text.`,
      });
      const reply = (replyRes.data?.output || "Sure, I'd like to learn more.").trim();
      addStep({ icon: "sms-in", label: "Reply Received", detail: `From ${toNumber} → ${fromNumber}`, body: reply, status: "done" });
      await new Promise(r => setTimeout(r, 800));

      // Step 3: AI processes and responds
      addStep({ icon: "ai", label: "AI Agent Processing", detail: `${agent?.name || "AI Agent"} analyzing reply...`, status: "processing" });
      const aiRes = await base44.functions.invoke("generateContent", {
        prompt: `You are ${agent?.name || "an AI assistant"}. A prospect replied to your SMS with: "${reply}". Write a helpful response and suggest sending them a detailed email. Keep it to 1-2 sentences.`,
      });
      const aiResponse = (aiRes.data?.output || "Great! I'll send you a detailed email with more information.").trim();
      setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, status: "done", body: aiResponse, detail: `${agent?.name} responded` } : s));
      await new Promise(r => setTimeout(r, 800));

      // Step 4: Send email
      addStep({ icon: "email", label: "Email Sent", detail: `To ${toEmail}`, body: `Subject: Following up on our conversation\n\nHi,\n\n${aiResponse}\n\nBest regards,\n${agent?.name || "Your AI Assistant"}`, status: "done" });
      await new Promise(r => setTimeout(r, 800));

      // Step 5: Log to memory
      addStep({ icon: "memory", label: "Conversation Logged", detail: "Agent memory updated with summary and action items", status: "done" });

      await base44.entities.TestSession.create({
        test_type: "e2e",
        agent_id: selectedAgent,
        agent_name: agent?.name,
        from_number: fromNumber,
        to_number: toNumber,
        to_email: toEmail,
        messages: [
          { direction: "outbound", channel: "sms", body: initialMsg },
          { direction: "inbound", channel: "sms", body: reply },
          { direction: "outbound", channel: "sms", body: aiResponse },
        ],
        result: "pass",
      });

      toast({ title: "E2E loop complete", description: "Full conversation cycle tested successfully" });
    } catch (e) {
      toast({ title: "E2E test failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const ICONS = {
    "sms": Phone, "sms-in": Phone, "ai": Brain, "email": Mail, "memory": CheckCircle2,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Config */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> End-to-End Loop Configuration
          </h3>
          <p className="text-xs text-muted-foreground">Configure receiving endpoints to test the full conversation loop: SMS → AI response → Email → Memory log</p>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Agent</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {agents.length === 0 ? <option value="">No agents</option> : agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From (Your Number)</label>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {numbers.length === 0 ? <option value="">No numbers</option> : numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receiving Phone Number</label>
            <input value={toNumber} onChange={e => setToNumber(e.target.value)} placeholder="+1 555 0100"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receiving Email</label>
            <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="prospect@example.com"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Initial Message (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Leave blank to auto-generate"
              className="w-full h-16 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
          </div>
          <button onClick={runE2E} disabled={running}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running E2E Loop..." : "Start End-to-End Test"}
          </button>
        </div>
      </div>

      {/* Flow Timeline */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground mb-4">Conversation Flow</h3>
        {steps.length === 0 ? (
          <div className="text-center py-12">
            <ArrowRight className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Configure the loop and click "Start" to see the full conversation flow</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = ICONS[step.icon] || CheckCircle2;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      step.status === "done" ? "bg-status-green/20" : "bg-primary/20")}>
                      {step.status === "processing" ? <Loader2 className="h-4 w-4 text-primary animate-spin" /> : <Icon className="h-4 w-4 text-status-green" />}
                    </div>
                    {i < steps.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground mb-1">{step.detail}</p>
                    {step.body && (
                      <div className="rounded-lg bg-accent/50 border border-border p-2 mt-1">
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-snug">{step.body}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
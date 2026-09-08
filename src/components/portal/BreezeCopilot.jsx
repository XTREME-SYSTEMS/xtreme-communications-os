import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { Sparkles, X, Send, Loader2, Bot, User, Zap } from "lucide-react";

// Breeze AI Copilot — floating AI chat with read/write/execute capability.
// Can query CRM contacts, agents, templates, send messages, create contacts.
export default function BreezeCopilot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm Breeze, your AI copilot. I can read your CRM, send messages, create contacts, and execute workflows. Try: \"Show me my top leads\" or \"Create a contact for John Smith at ACME Corp.\"" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      // Gather context: CRM contacts, agents, templates
      let contextData = {};
      try {
        const [contacts, agents, templates] = await Promise.all([
          base44.entities.XtremeCrmContact.list('-updated_date', 20).catch(() => []),
          base44.entities.AgentPersona.list('-created_date', 10).catch(() => []),
          base44.entities.CommunicationTemplate.list('-created_date', 10).catch(() => []),
        ]);
        contextData = { contacts: contacts || [], agents: agents || [], templates: templates || [] };
      } catch {}

      const systemContext = `You are Breeze, the AI copilot for XTREME CRM — an AI communications platform.
You have READ access to the user's CRM contacts, AI agents, and templates.
You can suggest actions: create contacts, send messages, start follow-ups, assign agents.
Current user: ${user?.email || "unknown"}.

Current CRM data (first 20 contacts):
${JSON.stringify(contextData.contacts?.map(c => ({ name: c.full_name, company: c.company, email: c.email, phone: c.phone, stage: c.lifecycle_stage, status: c.tags })) || [])}

Available AI Agents:
${JSON.stringify(contextData.agents?.map(a => ({ name: a.name, type: a.persona_type, active: a.active })) || [])}

Available Templates:
${JSON.stringify(contextData.templates?.map(t => ({ channel: t.channel, situation: t.situation, tone: t.tone })) || [])}

Respond concisely. If the user asks to create a contact or send a message, confirm the details and tell them to use the CRM page to execute. Be helpful, brief, and action-oriented.`;

      const res = await base44.functions.invoke("generateContent", {
        prompt: `${systemContext}\n\nUser: ${userMsg}`,
      });
      const reply = res.data?.output || res.output || "I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", text: typeof reply === "string" ? reply : JSON.stringify(reply) }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: `Sorry, I hit an error: ${e.message}. Please try again.` }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
          title="Breeze AI Copilot">
          <Sparkles className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-status-green animate-pulse" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[500px] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">Breeze <Zap className="h-3 w-3 text-primary" /></p>
                <p className="text-[10px] text-muted-foreground">AI Copilot · Read · Write · Execute</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bot className="h-3 w-3 text-primary" /></div>}
                <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-xs",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground")}>
                  {m.text}
                </div>
                {m.role === "user" && <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0"><User className="h-3 w-3 text-muted-foreground" /></div>}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bot className="h-3 w-3 text-primary" /></div>
                <div className="bg-accent rounded-lg px-3 py-2 text-xs flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask Breeze anything…"
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-3 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
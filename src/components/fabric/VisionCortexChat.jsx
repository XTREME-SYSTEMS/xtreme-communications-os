import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Brain, Send, Loader2, User, Sparkles } from "lucide-react";

export default function VisionCortexChat() {
  const [messages, setMessages] = useState([
    {
      role: "cortex",
      text: "Shadow Vision Cortex online. I am your conversational command interface. Ask me about fleet status, system health, failures, or give me a command like \"Finish the Communications system\" or \"Which system is closest to launch?\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await base44.functions.invoke("shadowVisionCortex", {
        action: "parse_intent",
        text: userMsg.text,
      });
      const data = res?.data || res;
      setMessages(prev => [...prev, {
        role: "cortex",
        text: data.response || data.vision_cortex_response || "Intent parsed.",
        intent: data.parsed_intent,
        system_id: data.system_id,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "cortex",
        text: `Error: ${e.message}`,
        error: true,
      }]);
    }
    setLoading(false);
  };

  const quickCommands = [
    "What is the fleet status?",
    "Which system is closest to launch?",
    "What needs my approval?",
    "What failed today?",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "cortex" && (
              <div className="w-8 h-8 rounded-full bg-accent-orange/10 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-accent-orange" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : msg.error
                  ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
            )}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.intent && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange font-mono">
                    {msg.intent}
                  </span>
                  {msg.system_id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground font-mono">
                      {msg.system_id}
                    </span>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-accent-orange/10 flex items-center justify-center shrink-0">
              <Brain className="h-4 w-4 text-accent-orange animate-pulse" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick commands */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickCommands.map(cmd => (
            <button key={cmd} onClick={() => { setInput(cmd); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {cmd}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask Vision Cortex or give a command..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-colors shrink-0",
              !input.trim() || loading ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-accent-orange text-white hover:opacity-90"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
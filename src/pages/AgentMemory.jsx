import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Brain, ArrowLeft, Loader2, CheckCircle2, Circle, Phone, Mail, MessageSquare, Clock } from "lucide-react";

const CHANNEL_ICON = { voice: Phone, sms: MessageSquare, mms: MessageSquare, email: Mail, whatsapp: MessageSquare };
const SENTIMENT_COLOR = { positive: "text-status-green", neutral: "text-muted-foreground", negative: "text-destructive", mixed: "text-primary" };

export default function AgentMemory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("new");

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const list = await base44.entities.ConversationMemory.filter({ created_by_id: user.id }, "-created_date", 100);
      setMemories(list || []);
    } catch (_) {}
    setLoading(false);
  };

  const toggleActionItem = async (memoryId, itemIndex) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return;
    const actionItems = (memory.action_items || []).map((item, i) => i === itemIndex ? { ...item, done: !item.done } : item);
    try {
      await base44.entities.ConversationMemory.update(memoryId, { action_items: actionItems });
      setMemories(prev => prev.map(m => m.id === memoryId ? { ...m, action_items: actionItems } : m));
    } catch (e) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  };

  const markReviewed = async (id) => {
    try {
      await base44.entities.ConversationMemory.update(id, { status: "reviewed" });
      setMemories(prev => prev.map(m => m.id === id ? { ...m, status: "reviewed" } : m));
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const filtered = memories.filter(m => filter === "all" || m.status === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> Agent Memory</h1>
        <p className="text-sm text-muted-foreground mt-1">Your AI agents report back after every conversation — summaries, action items, and notes for you to review.</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["new", "reviewed", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-sm capitalize",
              filter === f ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground")}>
            {f} {f === "new" && memories.filter(m => m.status === "new").length > 0 && `(${memories.filter(m => m.status === "new").length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No conversation memories yet. Your AI agents will log summaries here after calls and messages.</p>
          <Link to="/portal/agents" className="mt-3 inline-block text-xs text-primary hover:underline">Set up your AI agents →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const ChannelIcon = CHANNEL_ICON[m.channel] || MessageSquare;
            return (
              <div key={m.id} className={cn("rounded-xl border bg-card p-4", m.status === "new" ? "border-primary/30" : "border-border")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ChannelIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.agent_name || "AI Agent"}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {new Date(m.created_date).toLocaleString()} · {m.channel} · {m.contact_name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-medium uppercase", SENTIMENT_COLOR[m.sentiment])}>{m.sentiment}</span>
                    {m.status === "new" && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium uppercase">New</span>}
                  </div>
                </div>
                <p className="text-sm text-foreground leading-snug mb-2">{m.summary}</p>
                {m.action_items && m.action_items.length > 0 && (
                  <div className="rounded-lg bg-accent/30 border border-border p-2 mb-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Action Items</p>
                    <div className="space-y-1">
                      {m.action_items.map((item, i) => (
                        <button key={i} onClick={() => toggleActionItem(m.id, i)} className="flex items-start gap-2 text-left w-full">
                          {item.done ? <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0 mt-0.5" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                          <span className={cn("text-xs", item.done ? "text-muted-foreground line-through" : "text-foreground")}>{item.item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {m.notes && <p className="text-xs text-muted-foreground italic">📝 {m.notes}</p>}
                {m.status === "new" && (
                  <button onClick={() => markReviewed(m.id)} className="mt-2 text-xs text-primary hover:underline">Mark as reviewed</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { ChevronRight, Plus } from "lucide-react";

const NEXT = { queued: "in_progress", in_progress: "testing", testing: "done", done: "done" };
const STATUS_COLOR = { queued: "text-text-muted", in_progress: "text-chart-3", testing: "text-chart-4", blocked: "text-destructive", done: "text-status-green" };

export default function BuildQueue({ tasks, loading, onMutate }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await base44.entities.BuildQueueTask.create({ title: title.trim(), status: "queued", priority: "high", assigned_engine: "AutoBuilder" });
      setTitle("");
      onMutate();
      toast({ title: "Build task queued" });
    } catch (e) {
      toast({ title: "Failed to queue", description: String(e.message || e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const advance = async (t) => {
    const ns = NEXT[t.status] || "done";
    try {
      await base44.entities.BuildQueueTask.update(t.id, { status: ns });
      onMutate();
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Autonomous Build Queue</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">{tasks.length} TASKS</span>
      </div>
      <div className="flex gap-2 p-3 border-b border-surface-border">
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Queue a build task…"
          className="flex-1 h-8 bg-base border border-surface-border rounded px-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/50" />
        <button onClick={add} disabled={busy}
          className="h-8 px-3 rounded border border-accent-orange/50 text-accent-orange text-[11px] font-display tracking-wider uppercase hover:bg-accent-orange/10 disabled:opacity-50 flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Queue
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[360px] divide-y divide-surface-border">
        {loading && <div className="p-4 text-[12px] text-text-muted font-display tracking-wider">LOADING QUEUE…</div>}
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className={cn("text-[10px] font-display uppercase tracking-wider w-20", STATUS_COLOR[t.status])}>{t.status}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-text-primary truncate">{t.title}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{t.assigned_engine} · {t.priority}</div>
            </div>
            <button onClick={() => advance(t)} disabled={t.status === "done"}
              className="h-7 w-7 rounded border border-surface-border text-text-muted hover:text-text-primary hover:border-accent-orange/40 flex items-center justify-center disabled:opacity-40">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Users, Plus, Trash2, Loader2, Brain, Bot, UserCircle } from "lucide-react";

export default function ProjectAgents({ project }) {
  const { toast } = useToast();
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [project?.id]);

  async function load() {
    try {
      // Load assigned agents
      if (project?.assigned_agent_ids?.length) {
        const { items } = await base44.entities.Agent.filter(
          { id: { $in: project.assigned_agent_ids } },
          { limit: 50 }
        );
        setAssigned(items);
      }
      // Load available agents (not assigned)
      const { items: all } = await base44.entities.Agent.filter({}, { limit: 100 });
      const assignedSet = new Set(project?.assigned_agent_ids || []);
      setAvailable(all.filter(a => !assignedSet.has(a.id)));
    } catch (_) {}
    setLoading(false);
  }

  async function assign(agentId) {
    const newIds = [...(project.assigned_agent_ids || []), agentId];
    await base44.entities.Project.update(project.id, { assigned_agent_ids: newIds });
    load();
    toast({ title: "Agent assigned" });
  }

  async function unassign(agentId) {
    const newIds = (project.assigned_agent_ids || []).filter(id => id !== agentId);
    await base44.entities.Project.update(project.id, { assigned_agent_ids: newIds });
    load();
    toast({ title: "Agent unassigned" });
  }

  const statusColors = {
    online: "bg-status-green/15 text-status-green border-status-green/20",
    offline: "bg-muted text-muted-foreground border-border",
    busy: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
    break: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Assigned Agents ({assigned.length})</h3>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Assigned */}
          <div className="space-y-2">
            {assigned.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No agents assigned yet. Assign from the list below.</p>
            )}
            {assigned.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">Load: {a.current_load || 0}/{a.max_concurrent || 5} {a.supervisor ? "· Supervisor" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border", statusColors[a.status])}>
                    {a.status}
                  </span>
                  <button onClick={() => unassign(a.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Available */}
          {available.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Available Agents</p>
              <div className="space-y-2">
                {available.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.status} · {a.max_concurrent || 5} max concurrent</p>
                      </div>
                    </div>
                    <button onClick={() => assign(a.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
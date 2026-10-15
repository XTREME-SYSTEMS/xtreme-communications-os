import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { GitBranch, Plus, Play, Pause, Trash2, Loader2, Zap, Clock, Radio } from "lucide-react";

export default function ProjectWorkflows({ project }) {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWf, setNewWf] = useState({ name: "", description: "", trigger_type: "manual" });

  useEffect(() => { load(); }, [project?.id]);

  async function load() {
    if (!project?.workflow_ids?.length) { setLoading(false); return; }
    try {
      const { items } = await base44.entities.Workflow.filter(
        { id: { $in: project.workflow_ids } },
        { sort: "-created_date", limit: 50 }
      );
      setWorkflows(items);
    } catch (_) {}
    setLoading(false);
  }

  async function createWorkflow() {
    if (!newWf.name) return;
    try {
      const wf = await base44.entities.Workflow.create({
        tenant_id: project.tenant_id || "default",
        name: newWf.name,
        description: newWf.description,
        trigger_type: newWf.trigger_type,
        status: "draft",
      });
      await base44.entities.Project.update(project.id, {
        workflow_ids: [...(project.workflow_ids || []), wf.id],
      });
      setNewWf({ name: "", description: "", trigger_type: "manual" });
      setShowCreate(false);
      load();
      toast({ title: "Workflow created", description: newWf.name });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  async function toggleStatus(wf) {
    const next = wf.status === "active" ? "paused" : "active";
    await base44.entities.Workflow.update(wf.id, { status: next });
    load();
  }

  async function deleteWorkflow(wf) {
    await base44.entities.Workflow.delete(wf.id);
    await base44.entities.Project.update(project.id, {
      workflow_ids: (project.workflow_ids || []).filter(id => id !== wf.id),
    });
    load();
  }

  const triggerIcons = { manual: Zap, schedule: Clock, inbound_sms: Radio, inbound_call: Radio, webhook_event: Radio };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> Workflows ({workflows.length})</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
          <Plus className="h-3 w-3" /> New Workflow
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <input value={newWf.name} onChange={e => setNewWf({ ...newWf, name: e.target.value })}
            placeholder="Workflow name (e.g. Lead Follow-up Sequence)"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
          <textarea value={newWf.description} onChange={e => setNewWf({ ...newWf, description: e.target.value })}
            placeholder="What does this workflow do?" rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none" />
          <div className="flex gap-2">
            <select value={newWf.trigger_type} onChange={e => setNewWf({ ...newWf, trigger_type: e.target.value })}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
              <option value="manual">Manual Trigger</option>
              <option value="schedule">Scheduled</option>
              <option value="inbound_sms">Inbound SMS</option>
              <option value="inbound_call">Inbound Call</option>
              <option value="webhook_event">Webhook Event</option>
            </select>
            <button onClick={createWorkflow} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No workflows yet. Create one to automate this project.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map(wf => {
            const Icon = triggerIcons[wf.trigger_type] || Zap;
            return (
              <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">{wf.description || "No description"} · {wf.trigger_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border",
                    wf.status === "active" ? "bg-status-green/15 text-status-green border-status-green/20" :
                    wf.status === "paused" ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/20" :
                    "bg-muted text-muted-foreground border-border")}>
                    {wf.status}
                  </span>
                  <button onClick={() => toggleStatus(wf)} className="text-muted-foreground hover:text-primary p-1">
                    {wf.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteWorkflow(wf)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
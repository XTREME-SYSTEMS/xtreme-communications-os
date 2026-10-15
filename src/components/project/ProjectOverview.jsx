import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Building2, Calendar, Phone, Tag, TrendingUp, Users, GitBranch, FileText, Megaphone } from "lucide-react";

export default function ProjectOverview({ project, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
    client_name: project?.client_name || "",
    industry: project?.industry || "",
    priority: project?.priority || "medium",
    status: project?.status || "planning",
    target_end_date: project?.target_end_date?.split("T")[0] || "",
    notes: project?.notes || "",
  });

  const save = async () => {
    const updates = { ...form };
    if (form.target_end_date) updates.target_end_date = new Date(form.target_end_date).toISOString();
    await base44.entities.Project.update(project.id, updates);
    setEditing(false);
    onEdit();
  };

  const stats = [
    { label: "Workflows", value: project?.workflow_ids?.length || 0, icon: GitBranch, color: "text-blue-500" },
    { label: "Agents", value: project?.assigned_agent_ids?.length || 0, icon: Users, color: "text-purple-500" },
    { label: "Scripts", value: project?.template_ids?.length || 0, icon: FileText, color: "text-green-500" },
    { label: "Campaigns", value: project?.campaign_ids?.length || 0, icon: Megaphone, color: "text-orange-500" },
  ];

  const statusColors = {
    planning: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    active: "bg-status-green/15 text-status-green border-status-green/20",
    paused: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
    completed: "bg-purple-500/15 text-purple-500 border-purple-500/20",
    archived: "bg-muted text-muted-foreground border-border",
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Project Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Client</label>
            <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Industry</label>
            <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
              placeholder="real_estate, dental, hvac..." className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm">
              <option value="planning">Planning</option><option value="active">Active</option>
              <option value="paused">Paused</option><option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Target End Date</label>
            <input type="date" value={form.target_end_date} onChange={e => setForm({ ...form, target_end_date: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3} className="w-full px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2} className="w-full px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm resize-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <s.icon className={cn("h-4 w-4", s.color)} />
              <span className="text-2xl font-display font-bold text-foreground">{s.value}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Project details */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border", statusColors[project?.status])}>
                {project?.status}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                {project?.priority} priority
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{project?.description || "No description yet."}</p>
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline ml-3 shrink-0">Edit</button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          {project?.client_name && (
            <div className="flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Client:</span> {project.client_name}</div>
          )}
          {project?.industry && (
            <div className="flex items-center gap-2 text-sm"><Tag className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Industry:</span> {project.industry}</div>
          )}
          {project?.start_date && (
            <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Started:</span> {new Date(project.start_date).toLocaleDateString()}</div>
          )}
          {project?.target_end_date && (
            <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Target:</span> {new Date(project.target_end_date).toLocaleDateString()}</div>
          )}
        </div>

        {project?.notes && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Progress</h3>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${project?.progress_percent || 0}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{project?.progress_percent || 0}% complete</p>
      </div>
    </div>
  );
}
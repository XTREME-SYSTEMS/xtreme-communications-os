import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { FolderKanban, Plus, Loader2, LayoutDashboard, GitBranch, Users, FileText, BarChart3, ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ProjectOverview from "@/components/project/ProjectOverview";
import ProjectWorkflows from "@/components/project/ProjectWorkflows";
import ProjectAgents from "@/components/project/ProjectAgents";
import ProjectScripts from "@/components/project/ProjectScripts";
import ProjectTracker from "@/components/project/ProjectTracker";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "agents", label: "Agents", icon: Users },
  { id: "scripts", label: "Scripts", icon: FileText },
  { id: "tracking", label: "Tracking", icon: BarChart3 },
];

export default function ProjectConsole() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "", description: "", client_name: "", industry: "", priority: "medium",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { items } = await base44.entities.Project.filter(
        { user_id: user?.id },
        { sort: "-created_date", limit: 50 }
      );
      setProjects(items);
      if (items.length && !selected) setSelected(items[0]);
    } catch (_) {}
    setLoading(false);
  }

  async function createProject() {
    if (!newProject.name) return;
    try {
      const p = await base44.entities.Project.create({
        ...newProject,
        status: "planning",
        user_id: user?.id,
        start_date: new Date().toISOString(),
        assigned_agent_ids: [],
        workflow_ids: [],
        campaign_ids: [],
        template_ids: [],
        metrics: {},
      });
      setNewProject({ name: "", description: "", client_name: "", industry: "", priority: "medium" });
      setShowCreate(false);
      await load();
      setSelected(p);
      toast({ title: "Project created", description: newProject.name });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  async function refreshSelected() {
    if (!selected) return;
    const updated = await base44.entities.Project.get(selected.id);
    setSelected(updated);
  }

  const statusColors = {
    planning: "bg-blue-500/15 text-blue-500",
    active: "bg-status-green/15 text-status-green",
    paused: "bg-yellow-500/15 text-yellow-500",
    completed: "bg-purple-500/15 text-purple-500",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <FolderKanban className="h-6 w-6 text-primary" /> Project Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Provision and manage projects end-to-end: workflows, agents, scripts, and tracking.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Project list sidebar */}
        <div className="lg:w-72 shrink-0 space-y-3">
          <button onClick={() => setShowCreate(!showCreate)}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> New Project
          </button>

          {showCreate && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
              <input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Project name" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm" />
              <input value={newProject.client_name} onChange={e => setNewProject({ ...newProject, client_name: e.target.value })}
                placeholder="Client name" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm" />
              <input value={newProject.industry} onChange={e => setNewProject({ ...newProject, industry: e.target.value })}
                placeholder="Industry (e.g. real_estate)" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm" />
              <select value={newProject.priority} onChange={e => setNewProject({ ...newProject, priority: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm">
                <option value="low">Low Priority</option><option value="medium">Medium Priority</option>
                <option value="high">High Priority</option><option value="critical">Critical</option>
              </select>
              <textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="What is this project?" rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none" />
              <div className="flex gap-2">
                <button onClick={createProject} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No projects yet. Create one to get started.</p>
              </div>
            ) : (
              projects.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setActiveTab("overview"); }}
                  className={cn("w-full text-left p-3 rounded-lg border transition-colors",
                    selected?.id === p.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent")}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <span className={cn("text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full", statusColors[p.status])}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.client_name || p.industry || "No client set"}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>{p.workflow_ids?.length || 0} wf</span>
                    <span>{p.assigned_agent_ids?.length || 0} agents</span>
                    <span>{p.template_ids?.length || 0} scripts</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
              <div className="text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a project or create a new one to begin.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Project header */}
              <div className="rounded-xl border border-border bg-card p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground">{selected.client_name || "No client"} {selected.industry ? `· ${selected.industry}` : ""}</p>
                  </div>
                  <span className={cn("text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full", statusColors[selected.status])}>
                    {selected.status}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 mb-4 border-b border-border overflow-x-auto scrollbar-thin">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="rounded-xl border border-border bg-card p-5">
                {activeTab === "overview" && <ProjectOverview project={selected} onEdit={refreshSelected} />}
                {activeTab === "workflows" && <ProjectWorkflows project={selected} />}
                {activeTab === "agents" && <ProjectAgents project={selected} />}
                {activeTab === "scripts" && <ProjectScripts project={selected} />}
                {activeTab === "tracking" && <ProjectTracker project={selected} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
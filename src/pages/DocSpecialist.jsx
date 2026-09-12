import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  FileText, Table, Calendar, CheckSquare, FolderTree, ShieldCheck,
  Loader2, Play, ExternalLink, CheckCircle2, AlertCircle, Sparkles,
  ClipboardList, RefreshCw
} from "lucide-react";

const PIPELINE_STEPS = [
  { key: "ai_processing", label: "AI Processing", icon: Sparkles, desc: "AI analyzes brief and creates structured execution plan" },
  { key: "google_doc", label: "Google Doc", icon: FileText, desc: "Execution summary document created in Google Docs" },
  { key: "google_sheet", label: "Google Sheet", icon: Table, desc: "Task log with owner, deadline, priority, status" },
  { key: "google_calendar", label: "Google Calendar", icon: Calendar, desc: "Calendar events for tasks with deadlines" },
  { key: "google_tasks", label: "Google Tasks", icon: CheckSquare, desc: "Granular checklist items become Google Tasks" },
  { key: "agent_folders", label: "Agent Folders", icon: FolderTree, desc: "Drive folders with to-do lists for each agent" },
  { key: "qa_validation", label: "QA Validation", icon: ShieldCheck, desc: "Tasks tracked and validated for 100% enterprise grade" },
];

export default function DocSpecialist() {
  const [brief, setBrief] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [runs, setRuns] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const keys = await base44.entities.ApiKey.filter({ status: "active" }).catch(() => []);
      setApiKey(keys?.[0]?.key_value || "");
      const res = await base44.functions.invoke("docSpecialistPipeline", {
        api_key: keys?.[0]?.key_value || "", action: "list_runs",
      });
      setRuns(res?.data?.runs || res?.runs || []);
    } catch (e) { console.error(e); }
  };

  const runPipeline = async () => {
    if (!brief.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("docSpecialistPipeline", {
        api_key: apiKey, action: "run_pipeline", brief: brief.trim(),
      });
      const data = res?.data || res;
      if (data.status === "completed") {
        setResult(data.result);
        load(); // Refresh runs list
      } else {
        setError(data.error || "Pipeline failed");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const loadRun = async (runId) => {
    try {
      const res = await base44.functions.invoke("docSpecialistPipeline", {
        api_key: apiKey, action: "get_run", run_id: runId,
      });
      setSelectedRun(res?.data?.run || res?.run);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent-orange" />
          Doc Specialist Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Council agent that orchestrates the full Google Workspace pipeline: Brief → Docs → Sheets → Calendar → Tasks → Drive → QA
        </p>
      </div>

      {/* Pipeline visualization */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">7-Step Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const stepResult = result?.steps?.find(s => s.step === step.key);
            const isRunning = running && !stepResult && result?.steps?.length === i;
            const isDone = stepResult?.status === "completed";
            return (
              <div key={step.key} className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border text-center",
                isDone ? "bg-status-green/5 border-status-green/20" :
                isRunning ? "bg-accent-orange/5 border-accent-orange/20" :
                "bg-muted/30 border-border"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isDone ? "bg-status-green/10" : isRunning ? "bg-accent-orange/10" : "bg-muted"
                )}>
                  {isDone ? <CheckCircle2 className="h-4 w-4 text-status-green" /> :
                   isRunning ? <Loader2 className="h-4 w-4 text-accent-orange animate-spin" /> :
                   <Icon className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className="text-[10px] font-medium text-foreground">{step.label}</span>
                <span className="text-[9px] text-muted-foreground hidden lg:block">{step.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Project Brief
        </h3>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Paste your project brief, workflow description, or task list here. The Doc Specialist will analyze it, break it into tasks, and distribute across Google Workspace..."
          rows={5}
          className="w-full rounded-lg bg-muted p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <button
          onClick={runPipeline}
          disabled={!brief.trim() || running}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
            !brief.trim() || running
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running Pipeline..." : "Run Full Pipeline"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-status-green/30 bg-status-green/5 p-4">
            <h3 className="text-sm font-semibold text-status-green flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Pipeline Complete
            </h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{result.summary}</p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.doc_url && (
              <ResultLink icon={FileText} label="Execution Doc" url={result.doc_url} color="text-blue-500" />
            )}
            {result.sheet_url && (
              <ResultLink icon={Table} label="Task Log Sheet" url={result.sheet_url} color="text-status-green" />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Calendar Events" value={result.calendar_events || 0} icon={Calendar} />
            <StatCard label="Google Tasks" value={result.tasks_created || 0} icon={CheckSquare} />
            <StatCard label="Total Tasks" value={result.total_tasks || 0} icon={ClipboardList} />
          </div>

          {/* Agent Folders */}
          {result.agent_folders?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-accent-orange" />
                Agent Folders ({result.agent_folders.length})
              </h3>
              <div className="space-y-2">
                {result.agent_folders.map((folder, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-accent-orange" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{folder.agent_name}</p>
                        <p className="text-xs text-muted-foreground">{folder.task_count} task{folder.task_count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {folder.folder_url && (
                      <a href={folder.folder_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous Runs */}
      {runs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Previous Runs</h3>
            <button onClick={load} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="space-y-2">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => loadRun(run.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors hover:bg-muted/50",
                  selectedRun?.id === run.id ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{run.brief?.slice(0, 80)}...</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(run.created_date).toLocaleString()} • {run.tasks?.length || 0} tasks
                  </p>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-1 rounded font-mono shrink-0 ml-2",
                  run.status === "completed" ? "bg-status-green/10 text-status-green" :
                  run.status === "processing" ? "bg-accent-orange/10 text-accent-orange" :
                  run.status === "failed" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                )}>
                  {run.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultLink({ icon: Icon, label, url, color }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
    </a>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/30 border border-border">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xl font-display font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
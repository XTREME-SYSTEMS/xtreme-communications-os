import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Workflow as WorkflowIcon, Plus, Play, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER_TYPES = ["manual", "inbound_sms", "inbound_call", "inbound_mms", "bid_event", "webhook_event", "schedule"];
const STEP_TYPES = ["trigger", "condition", "action_delay", "api_call", "send_message", "escalation_human", "escalation_ai"];
const STATUS_DOT = { draft: "bg-text-muted", active: "bg-status-green animate-pulse", paused: "bg-chart-4", archived: "bg-text-muted" };

export default function WorkflowDesigner({ workflows, tenants, onMutate }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", trigger_type: "manual" });
  const [stepForm, setStepForm] = useState({ workflow_id: "", step_key: "", step_type: "condition", next_step_key: "" });
  const [expanded, setExpanded] = useState(null);
  const [logs, setLogs] = useState({});
  const [executing, setExecuting] = useState(null);

  const create = async () => {
    if (!form.name) return toast({ title: "Name required", variant: "destructive" });
    try {
      await base44.entities.Workflow.create({ ...form, tenant_id: tenants[0]?.id || "demo", status: "draft", trigger_config: {}, version: 1 });
      setForm({ name: "", trigger_type: "manual" });
      onMutate();
      toast({ title: "Workflow created" });
    } catch (e) { toast({ title: "Create failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const addStep = async () => {
    if (!stepForm.workflow_id || !stepForm.step_key) return toast({ title: "workflow + step_key required", variant: "destructive" });
    try {
      await base44.entities.WorkflowStep.create({
        ...stepForm, tenant_id: tenants[0]?.id || "demo",
        step_config: {}, position: 0, enabled: true,
      });
      setStepForm({ ...stepForm, step_key: "", step_type: "condition" });
      onMutate();
      toast({ title: "Step added" });
    } catch (e) { toast({ title: "Add step failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const activate = async (id) => {
    await base44.entities.Workflow.update(id, { status: "active" });
    onMutate();
    toast({ title: "Workflow activated" });
  };

  const execute = async (wf) => {
    setExecuting(wf.id);
    try {
      const res = await base44.functions.invoke("executeWorkflowEngine", {
        api_key: "xcom_live_acme_demo_0001", action: "execute", workflow_id: wf.id, payload: { from: "+15551110099", message: { body: "test trigger" } },
      });
      const data = res.data || res;
      if (data.execution_id) {
        setLogs({ ...logs, [wf.id]: data });
      }
      toast({ title: `Executed: ${data.steps_executed} steps`, description: data.final_status });
    } catch (e) { toast({ title: "Execute failed", description: String(e.message || e), variant: "destructive" }); }
    finally { setExecuting(null); }
  };

  const loadSteps = async (wfId) => {
    if (expanded === wfId) { setExpanded(null); return; }
    setExpanded(wfId);
    const steps = await base44.entities.WorkflowStep.filter({ workflow_id: wfId }, "position", 50);
    setLogs({ ...logs, [wfId]: { steps } });
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface">
      <div className="px-4 h-11 flex items-center gap-2 border-b border-surface-border">
        <WorkflowIcon className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase">Workflow Designer</span>
        <span className="ml-auto text-[10px] text-text-muted font-display">{workflows.length} total</span>
      </div>
      <div className="p-4 space-y-2 border-b border-surface-border">
        <div className="grid grid-cols-2 gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Workflow name"
            className="h-9 px-3 rounded bg-base border border-surface-border text-[12px] placeholder:text-text-muted focus:outline-none focus:border-accent-orange" />
          <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
            className="h-9 px-2 rounded bg-base border border-surface-border text-[12px] focus:outline-none focus:border-accent-orange">
            {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={create} className="w-full h-9 flex items-center justify-center gap-1.5 rounded bg-accent-orange/10 border border-accent-orange/40 text-accent-orange text-[11px] font-display uppercase tracking-wider hover:bg-accent-orange/20">
          <Plus className="h-3.5 w-3.5" /> Create Workflow
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {workflows.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-text-muted">No workflows yet</div>
        ) : workflows.map((w) => (
          <div key={w.id} className="border-b border-surface-border">
            <div className="px-4 py-3 hover:bg-base/50">
              <div className="flex items-center gap-2">
                <button onClick={() => loadSteps(w.id)}>
                  {expanded === w.id ? <ChevronDown className="h-3.5 w-3.5 text-text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-text-muted" />}
                </button>
                <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[w.status])} />
                <span className="text-[12px] text-text-primary truncate flex-1">{w.name}</span>
                <span className="text-[9px] font-display uppercase text-text-muted">{w.trigger_type}</span>
              </div>
              <div className="mt-2 flex gap-2 pl-6">
                {w.status === "draft" && (
                  <button onClick={() => activate(w.id)} className="flex items-center gap-1 h-7 px-2.5 rounded border border-status-green/40 text-status-green text-[10px] font-display uppercase hover:bg-status-green/10">Activate</button>
                )}
                {w.status === "active" && (
                  <button onClick={() => execute(w)} disabled={executing === w.id}
                    className="flex items-center gap-1 h-7 px-2.5 rounded border border-accent-orange/40 text-accent-orange text-[10px] font-display uppercase hover:bg-accent-orange/10 disabled:opacity-50">
                    <Play className="h-3 w-3" /> {executing === w.id ? "..." : "Execute"}
                  </button>
                )}
              </div>
            </div>
            {expanded === w.id && (
              <div className="px-4 pb-3 pl-10 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <input value={stepForm.workflow_id === w.id ? stepForm.step_key : ""} onChange={(e) => setStepForm({ ...stepForm, workflow_id: w.id, step_key: e.target.value })} placeholder="step_key"
                    className="col-span-3 h-8 px-2.5 rounded bg-base border border-surface-border text-[11px] placeholder:text-text-muted focus:outline-none focus:border-accent-orange" />
                  <select value={stepForm.step_type} onChange={(e) => setStepForm({ ...stepForm, step_type: e.target.value })} className="col-span-2 h-8 px-2 rounded bg-base border border-surface-border text-[11px] focus:outline-none focus:border-accent-orange">
                    {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={addStep} className="h-8 rounded border border-surface-border text-text-muted text-[10px] font-display uppercase hover:bg-base">Add</button>
                </div>
                {logs[w.id] && logs[w.id].steps && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-display uppercase tracking-wider text-text-muted">{logs[w.id].steps.length} steps</div>
                    {logs[w.id].trace && (
                      <div className="text-[9px] font-display uppercase tracking-wider text-status-green">Execution: {logs[w.id].steps_executed} steps → {logs[w.id].final_status}</div>
                    )}
                    {logs[w.id].steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-display">
                        <span className="text-text-muted">{i + 1}</span>
                        <span className="text-text-primary">{s.step_key}</span>
                        <span className="text-text-muted">{s.step_type}</span>
                        {s.status && <span className={cn("ml-auto", s.status === "completed" ? "text-status-green" : s.status === "failed" ? "text-destructive" : "text-chart-4")}>{s.status}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
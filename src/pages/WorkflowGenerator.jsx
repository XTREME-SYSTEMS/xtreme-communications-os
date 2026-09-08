import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import ElementPalette from "@/components/workflow/ElementPalette";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import StepConfigPanel from "@/components/workflow/StepConfigPanel";
import { Smartphone, Phone, MessageCircle, Mail, Settings, Save, Play, FolderOpen, Loader2, X, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";

const CHANNELS = [
  { type: "mobile", label: "Mobile (SMS/MMS)", icon: Smartphone },
  { type: "voice", label: "Voice", icon: Phone },
  { type: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { type: "email", label: "Email", icon: Mail },
  { type: "custom", label: "Custom", icon: Settings },
];

export default function WorkflowGenerator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState("mobile");
  const [steps, setSteps] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [assets, setAssets] = useState([]);
  const [library, setLibrary] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testModal, setTestModal] = useState(false);
  const [testTarget, setTestTarget] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.AgentPersona.list().catch(() => []),
      base44.entities.CommunicationTemplate.list().catch(() => []),
      base44.entities.CreativeAsset.list().catch(() => []),
      base44.entities.WorkflowDesign.list("-created_date", 50).catch(() => []),
    ]).then(([a, t, as, w]) => {
      setAgents(a || []); setTemplates(t || []); setAssets(as || []); setLibrary(w || []);
    });
  }, []);

  const addElement = (type, label) => {
    const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newStep = { id, type, label, config: {} };
    setSteps((prev) => [...prev, newStep]);
    setSelectedId(id);
  };

  const reorder = (from, to) => {
    setSteps((prev) => { const arr = [...prev]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); return arr; });
  };

  const deleteStep = (id) => { setSteps((prev) => prev.filter((s) => s.id !== id)); if (selectedId === id) setSelectedId(null); };

  const updateStep = (id, config) => setSteps((prev) => prev.map((s) => s.id === id ? { ...s, config } : s));

  const save = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.WorkflowDesign.create({ name, description, channel_type: channelType, steps, status: "draft" });
      toast({ title: "Workflow saved", description: `${name} saved to library` });
      setName(""); setDescription(""); setSteps([]);
      const w = await base44.entities.WorkflowDesign.list("-created_date", 50);
      setLibrary(w || []);
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const runTest = async () => {
    if (!testTarget.trim()) { toast({ title: "Enter a test number or email", variant: "destructive" }); return; }
    setTesting(true); setTestResults(null);
    try {
      const res = await base44.functions.invoke("testWorkflowDesign", { steps, channel_type: channelType, target: testTarget });
      setTestResults(res.data || res);
    } catch (e) { setTestResults({ status: "error", message: e.message }); }
    setTesting(false);
  };

  const assignToAgent = async (agentId, agentName) => {
    if (!assignModal) return;
    try {
      await base44.entities.WorkflowDesign.update(assignModal.id, { assigned_agent_id: agentId, assigned_agent_name: agentName, status: "active" });
      toast({ title: "Workflow assigned", description: `${assignModal.name} → ${agentName}` });
      setAssignModal(null);
      const w = await base44.entities.WorkflowDesign.list("-created_date", 50);
      setLibrary(w || []);
    } catch (e) { toast({ title: "Assign failed", description: e.message, variant: "destructive" }); }
  };

  const selected = steps.find((s) => s.id === selectedId);

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
        <h1 className="font-display text-sm font-bold text-foreground">Workflow Generator</h1>
        <div className="flex items-center gap-1 ml-4">
          {CHANNELS.map((c) => (
            <button key={c.type} onClick={() => setChannelType(c.type)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${channelType === c.type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name..." className="h-8 px-3 rounded-lg border border-border bg-background text-sm w-48" />
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-sm hover:bg-accent">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
        <button onClick={() => setTestModal(true)} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Play className="h-3.5 w-3.5" /> Test
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ElementPalette onAdd={addElement} />
        <WorkflowCanvas steps={steps} selectedId={selectedId} onSelect={setSelectedId} onReorder={reorder} onDelete={deleteStep} channelType={channelType} />
        <StepConfigPanel step={selected} agents={agents} templates={templates} assets={assets} onChange={(config) => updateStep(selected.id, config)} onClose={() => setSelectedId(null)} />
      </div>

      {/* Library */}
      <div className="h-48 border-t border-border bg-card overflow-y-auto p-3">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground">Saved Workflows</h3>
          <span className="text-xs text-muted-foreground">({library.length})</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {library.length === 0 && <p className="text-xs text-muted-foreground col-span-full">No saved workflows yet. Build and save one above.</p>}
          {library.map((w) => (
            <div key={w.id} className="rounded-lg border border-border p-2.5 hover:border-primary/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">{w.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${w.status === "active" ? "bg-status-green/20 text-status-green" : "bg-accent text-muted-foreground"}`}>{w.status}</span>
              </div>
              <p className="text-[10px] text-muted-foreground capitalize mb-2">{w.channel_type} - {w.steps?.length || 0} steps</p>
              {w.assigned_agent_name && <p className="text-[10px] text-primary mb-1 flex items-center gap-1"><UserCheck className="h-3 w-3" /> {w.assigned_agent_name}</p>}
              <button onClick={() => setAssignModal(w)} className="w-full text-[10px] px-2 py-1 rounded border border-border hover:bg-accent text-muted-foreground">Assign to Agent</button>
            </div>
          ))}
        </div>
      </div>

      {/* Test Modal */}
      {testModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !testing && setTestModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 w-[480px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-foreground">Test Workflow</h2>
              <button onClick={() => !testing && setTestModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Enter a test phone number or email to simulate the workflow end-to-end.</p>
            <input value={testTarget} onChange={(e) => setTestTarget(e.target.value)} placeholder="+1 555-0100 or test@example.com" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm mb-3" />
            <button onClick={runTest} disabled={testing} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {testing ? <><Loader2 className="h-4 w-4 animate-spin" /> Running test...</> : <><Play className="h-4 w-4" /> Run Live Test</>}
            </button>
            {testResults && (
              <div className="mt-4 space-y-2">
                {testResults.status === "success" ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-status-green/10 text-status-green"><CheckCircle2 className="h-4 w-4" /><span className="text-sm font-medium">Test passed</span></div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"><AlertCircle className="h-4 w-4" /><span className="text-sm font-medium">Test failed</span></div>
                )}
                {testResults.steps?.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${s.status === "pass" ? "bg-status-green/20 text-status-green" : "bg-destructive/20 text-destructive"}`}>{i + 1}</span>
                    <span className="text-foreground">{s.label}</span>
                    <span className="text-muted-foreground ml-auto">{s.detail}</span>
                  </div>
                ))}
                {testResults.message && <p className="text-xs text-muted-foreground p-2">{testResults.message}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAssignModal(null)}>
          <div className="bg-card rounded-xl border border-border p-6 w-[400px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-bold text-foreground mb-1">Assign: {assignModal.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Select an AI agent to operate this workflow.</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {agents.length === 0 && <p className="text-sm text-muted-foreground">No agents found. Create one in AI Agents first.</p>}
              {agents.map((a) => (
                <button key={a.id} onClick={() => assignToAgent(a.id, a.name)} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-accent text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: a.avatar_color || "#ff6b00" }}>{a.name[0]}</div>
                  <div><p className="text-sm font-medium text-foreground">{a.name}</p><p className="text-xs text-muted-foreground capitalize">{a.persona_type}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
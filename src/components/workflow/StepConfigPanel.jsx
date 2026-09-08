import { Brain, Clock, Calendar, MessageSquare, FileText, Image, Pause, GitBranch, Type, X } from "lucide-react";

const ICONS = { agent: Brain, time_window: Clock, day_of_week: Calendar, delay: Pause, script: Type, template: FileText, message: MessageSquare, image: Image, condition: GitBranch };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StepConfigPanel({ step, agents, templates, assets, onChange, onClose }) {
  if (!step) {
    return (
      <div className="w-72 shrink-0 border-l border-border bg-card p-4">
        <p className="text-sm text-muted-foreground text-center mt-8">Select a step to configure</p>
      </div>
    );
  }
  const Icon = ICONS[step.type] || Type;
  const config = step.config || {};
  const update = (field, value) => onChange({ ...config, [field]: value, summary: buildSummary(step.type, { ...config, [field]: value }) });

  return (
    <div className="w-72 shrink-0 border-l border-border bg-card p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">{step.label}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-3">
        {step.type === "agent" && (
          <>
            <Field label="Assign Agent">
              <select value={config.agent_id || ""} onChange={(e) => update("agent_id", e.target.value)} className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm">
                <option value="">Select agent...</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Role"><input value={config.role || ""} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Sales, Support" className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></Field>
          </>
        )}
        {step.type === "time_window" && (
          <>
            <Field label="Start Time"><input type="time" value={config.start || ""} onChange={(e) => update("start", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></Field>
            <Field label="End Time"><input type="time" value={config.end || ""} onChange={(e) => update("end", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></Field>
            <Field label="Timezone"><input value={config.timezone || "America/New_York"} onChange={(e) => update("timezone", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></Field>
          </>
        )}
        {step.type === "day_of_week" && (
          <Field label="Days">
            <div className="flex gap-1 flex-wrap">
              {DAYS.map((d) => (
                <button key={d} onClick={() => { const days = config.days || []; update("days", days.includes(d) ? days.filter((x) => x !== d) : [...days, d]); }}
                  className={`px-2 py-1 rounded text-xs font-medium ${(config.days || []).includes(d) ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"}`}>{d}</button>
              ))}
            </div>
          </Field>
        )}
        {step.type === "delay" && (
          <>
            <Field label="Duration"><input type="number" value={config.value || ""} onChange={(e) => update("value", parseInt(e.target.value) || 0)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" placeholder="5" /></Field>
            <Field label="Unit">
              <select value={config.unit || "minutes"} onChange={(e) => update("unit", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm">
                <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option>
              </select>
            </Field>
          </>
        )}
        {(step.type === "script" || step.type === "message") && (
          <Field label={step.type === "script" ? "Script Text" : "Message Body"}>
            <textarea value={config.text || ""} onChange={(e) => update("text", e.target.value)} rows={5} placeholder={step.type === "script" ? "Conversation script..." : "Message content..."} className="w-full p-2.5 rounded-lg border border-border bg-background text-sm resize-none" />
          </Field>
        )}
        {step.type === "template" && (
          <Field label="Select Template">
            <select value={config.template_id || ""} onChange={(e) => update("template_id", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm">
              <option value="">Select template...</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.situation} - {t.channel}</option>)}
            </select>
          </Field>
        )}
        {step.type === "image" && (
          <Field label="Select Image">
            <select value={config.asset_id || ""} onChange={(e) => update("asset_id", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm">
              <option value="">Select image...</option>
              {assets.filter((a) => a.content_type === "image").map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </Field>
        )}
        {step.type === "condition" && (
          <>
            <Field label="Condition"><input value={config.expression || ""} onChange={(e) => update("expression", e.target.value)} placeholder="e.g. response.contains('yes')" className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></Field>
            <Field label="If True → Go To"><input type="number" value={config.true_step || ""} onChange={(e) => update("true_step", parseInt(e.target.value) || 0)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" placeholder="Step #" /></Field>
            <Field label="If False → Go To"><input type="number" value={config.false_step || ""} onChange={(e) => update("false_step", parseInt(e.target.value) || 0)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" placeholder="Step #" /></Field>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>{children}</div>;
}

function buildSummary(type, config) {
  switch (type) {
    case "agent": return config.agent_id ? `Agent: ${config.role || "assigned"}` : "No agent selected";
    case "time_window": return config.start && config.end ? `${config.start} - ${config.end}` : "No time set";
    case "day_of_week": return (config.days || []).join(", ") || "No days selected";
    case "delay": return config.value ? `${config.value} ${config.unit || "minutes"}` : "No delay set";
    case "script": case "message": return (config.text || "").slice(0, 50) || "Empty";
    case "template": return config.template_id ? "Template selected" : "No template";
    case "image": return config.asset_id ? "Image attached" : "No image";
    case "condition": return config.expression || "No condition";
    default: return "";
  }
}
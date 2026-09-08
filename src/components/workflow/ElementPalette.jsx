import { Brain, Clock, Calendar, MessageSquare, FileText, Image, Pause, GitBranch, Type } from "lucide-react";

const ELEMENTS = [
  { type: "agent", label: "AI Agent", icon: Brain, color: "text-primary", desc: "Assign an AI agent to handle this step" },
  { type: "time_window", label: "Time Window", icon: Clock, color: "text-chart-2", desc: "Restrict execution to a time range" },
  { type: "day_of_week", label: "Day of Week", icon: Calendar, color: "text-chart-3", desc: "Run on specific days" },
  { type: "delay", label: "Delay", icon: Pause, color: "text-chart-4", desc: "Wait between steps" },
  { type: "script", label: "Script", icon: Type, color: "text-chart-5", desc: "Custom conversation script" },
  { type: "template", label: "Template", icon: FileText, color: "text-primary", desc: "Use a saved template" },
  { type: "message", label: "Message", icon: MessageSquare, color: "text-chart-2", desc: "Send a text message" },
  { type: "image", label: "Image", icon: Image, color: "text-chart-3", desc: "Attach an image/MMS" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "text-chart-4", desc: "Branch based on a condition" },
];

export default function ElementPalette({ onAdd }) {
  return (
    <div className="w-56 shrink-0 border-r border-border bg-card p-3 overflow-y-auto">
      <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-3">Elements</h3>
      <div className="space-y-1.5">
        {ELEMENTS.map((el) => (
          <button key={el.type} onClick={() => onAdd(el.type, el.label)}
            className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-colors text-left group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <el.icon className={`h-4 w-4 ${el.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{el.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{el.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
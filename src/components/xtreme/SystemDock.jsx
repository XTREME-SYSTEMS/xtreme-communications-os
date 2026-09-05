import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Brain, Factory, ShieldCheck, Globe, EyeOff, Radio, Network, Phone, KeyRound, CreditCard, Radar, Megaphone, Scale, Library } from "lucide-react";
import ThemeToggle from "@/components/xtreme/ThemeToggle";
import { ENGINE_STYLES } from "@/lib/xtreme";

const NODES = [
  { name: "Vision Cortex", role: "AI Brain", icon: Brain },
  { name: "AutoBuilder", role: "Factory", icon: Factory },
  { name: "Faultline", role: "Eng Control", icon: ShieldCheck },
  { name: "Cloud Browser", role: "Eyes + Hands", icon: Globe },
  { name: "Shadow", role: "Privileged", icon: EyeOff },
  { name: "Telecom Bus", role: "Provider Layer", icon: Radio, route: "/providers" },
  { name: "Wholesale Core", role: "CaaS Gateway", icon: Network, route: "/core" },
  { name: "Number Mgmt", role: "DIDs + SIP", icon: Phone, route: "/numbers" },
  { name: "Dev Keys", role: "API Auth", icon: KeyRound, route: "/developers" },
  { name: "Billing", role: "Usage Meter", icon: CreditCard, route: "/billing" },
  { name: "Route Quality", role: "Cognitive Telemetry", icon: Radar, route: "/routes" },
  { name: "Automations", role: "Workflows + Blasts", icon: Megaphone, route: "/campaigns" },
  { name: "Parity", role: "Twilio Comparison", icon: Scale, route: "/parity-comparison" },
  { name: "Prompt Library", role: "Autonomous 100% Prompts", icon: Library, route: "/prompts" },
  { name: "Preflight", role: "Audit · Score · Heal · Launch", icon: ShieldCheck, route: "/preflight" },
];

export default function SystemDock({ activeNode, onSelect, engineState }) {
  const navigate = useNavigate();
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-surface-border bg-base/60 backdrop-blur">
      <div className="px-4 h-14 flex items-center border-b border-surface-border">
        <span className="font-display text-[13px] tracking-[0.2em] text-text-primary">XTREME//COMMS</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {NODES.map((n) => {
          const Icon = n.icon;
          const st = engineState?.[n.name]?.state;
          const led = st ? ENGINE_STYLES[st] : "bg-text-muted";
          const active = activeNode === n.name;
          return (
            <button key={n.name} onClick={() => n.route ? navigate(n.route) : onSelect(n.name)}
              className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2",
                active ? "border-accent-orange bg-surface text-text-primary" : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface/50")}>
              <Icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[11px] tracking-[0.1em] uppercase truncate">{n.name}</div>
                <div className="text-[10px] text-text-muted tracking-[0.1em] uppercase">{n.role}</div>
              </div>
              <span className={cn("h-2 w-2 rounded-full", led, st === "online" && "animate-pulse")} />
            </button>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-surface-border space-y-2">
        <ThemeToggle />
        <div className="text-[10px] font-display tracking-[0.15em] text-text-muted uppercase leading-relaxed">
          Observe→Plan→Execute→Audit→Repair
        </div>
      </div>
    </aside>
  );
}
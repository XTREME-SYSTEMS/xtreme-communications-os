import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, PhoneCall, MessageSquare, Wrench, FlaskConical, Cpu, Radio } from "lucide-react";
import ThemeToggle from "@/components/xtreme/ThemeToggle";
import VoiceTestPanel from "@/components/xtreme/VoiceTestPanel";
import MessageTestPanel from "@/components/xtreme/MessageTestPanel";
import ToolDashboard from "@/components/xtreme/ToolDashboard";

export default function TestLab() {
  const [tab, setTab] = useState("voice");
  const [personas, setPersonas] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    base44.entities.AgentPersona.list("-created_date", 50).then(setPersonas).catch(() => {});
    base44.entities.PhoneNumber.list("-created_date", 100).then(setNumbers).catch(() => {});
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const TABS = [
    { id: "voice", label: "Voice Test", icon: PhoneCall, desc: "AI-to-AI voice with audio playback" },
    { id: "message", label: "Message Test", icon: MessageSquare, desc: "SMS & WhatsApp closed-loop" },
    { id: "tools", label: "Tool Dashboard", icon: Wrench, desc: "Execute any system function" },
  ];

  const timeStr = clock.toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className="relative min-h-screen bg-background text-text-primary overflow-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 tl-grid-bg opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

      {/* Header */}
      <div className="relative h-16 flex items-center gap-4 px-4 lg:px-6 border-b border-accent-orange/20 bg-surface/40 backdrop-blur-xl sticky top-0 z-20 tl-scanline">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-accent-orange text-[11px] font-display uppercase tracking-wider transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-8 w-px bg-surface-border" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <FlaskConical className="h-5 w-5 text-accent-orange" />
            <div className="absolute -inset-1 rounded-full bg-accent-orange/20 blur-md -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[13px] tracking-[0.2em] uppercase text-text-primary">Test Lab</span>
            <span className="text-[8px] text-text-muted uppercase tracking-[0.25em]">Closed-Loop AI Testing Chamber</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {/* System status indicators */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-text-muted" />
              <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">{personas.length} Personas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-text-muted" />
              <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">{numbers.length} Numbers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-green tl-led" />
              <span className="text-[9px] font-display uppercase tracking-wider text-status-green">System Online</span>
            </div>
          </div>
          <div className="font-display text-[11px] text-accent-orange tabular-nums tracking-wider">{timeStr}</div>
          <div className="w-32"><ThemeToggle /></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative flex items-center gap-1 px-4 lg:px-6 border-b border-surface-border bg-surface/20 backdrop-blur">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-5 h-12 text-[11px] font-display uppercase tracking-wider transition-all ${
                active ? "text-accent-orange" : "text-text-muted hover:text-text-primary"
              }`}>
              <Icon className={`h-3.5 w-3.5 ${active ? "drop-shadow-[0_0_4px_hsl(var(--accent-orange))]" : ""}`} />
              {t.label}
              {active && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-orange" />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-orange blur-sm" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab description */}
      <div className="relative px-4 lg:px-6 py-2 bg-surface/10">
        <span className="text-[10px] font-display uppercase tracking-[0.15em] text-text-muted">
          {TABS.find(t => t.id === tab)?.desc}
        </span>
      </div>

      {/* Content */}
      <div className="relative p-4 lg:p-6">
        {personas.length === 0 && (
          <div className="tl-panel rounded-lg p-4 mb-4 flex items-center gap-2 border-accent-orange/30 tl-glow-orange">
            <FlaskConical className="h-4 w-4 text-accent-orange" />
            <span className="text-[11px] text-text-primary">No personas found — create AI personas in Persona Studio first to run closed-loop tests.</span>
          </div>
        )}
        <div key={tab} className="tl-fade-in">
          {tab === "voice" && <VoiceTestPanel personas={personas} numbers={numbers} />}
          {tab === "message" && <MessageTestPanel personas={personas} numbers={numbers} />}
          {tab === "tools" && <ToolDashboard />}
        </div>
      </div>
    </div>
  );
}
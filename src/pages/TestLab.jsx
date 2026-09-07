import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, PhoneCall, MessageSquare, Wrench, FlaskConical } from "lucide-react";
import ThemeToggle from "@/components/xtreme/ThemeToggle";
import VoiceTestPanel from "@/components/xtreme/VoiceTestPanel";
import MessageTestPanel from "@/components/xtreme/MessageTestPanel";
import ToolDashboard from "@/components/xtreme/ToolDashboard";

export default function TestLab() {
  const [tab, setTab] = useState("voice");
  const [personas, setPersonas] = useState([]);
  const [numbers, setNumbers] = useState([]);

  useEffect(() => {
    base44.entities.AgentPersona.list("-created_date", 50).then(setPersonas).catch(() => {});
    base44.entities.PhoneNumber.list("-created_date", 100).then(setNumbers).catch(() => {});
  }, []);

  const TABS = [
    { id: "voice", label: "Voice Test", icon: PhoneCall },
    { id: "message", label: "Message Test", icon: MessageSquare },
    { id: "tools", label: "Tool Dashboard", icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-surface/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Test Lab</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">Closed-Loop AI Testing · Voice & Message · Tool Dashboard</span>
        </div>
        <div className="ml-auto w-32"><ThemeToggle /></div>
      </div>

      <div className="flex items-center gap-1 px-4 lg:px-6 border-b border-surface-border bg-surface/30">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 h-11 text-[11px] font-display uppercase tracking-wider border-b-2 transition-colors ${
                active ? "border-accent-orange text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 lg:p-6">
        {personas.length === 0 && (
          <div className="rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-4 mb-4 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-accent-orange" />
            <span className="text-[11px] text-text-primary">No personas found — create AI personas in Persona Studio first to run closed-loop tests.</span>
          </div>
        )}
        {tab === "voice" && <VoiceTestPanel personas={personas} numbers={numbers} />}
        {tab === "message" && <MessageTestPanel personas={personas} numbers={numbers} />}
        {tab === "tools" && <ToolDashboard />}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { MessageSquare, Mail, Brain, GitBranch, ArrowLeft } from "lucide-react";
import SmsMockup from "@/components/testing/SmsMockup";
import EmailMockup from "@/components/testing/EmailMockup";
import VoiceTest from "@/components/testing/VoiceTest";
import E2ELoopTest from "@/components/testing/E2ELoopTest";

const TABS = [
  { id: "sms", label: "SMS / MMS Test", icon: MessageSquare },
  { id: "email", label: "Email Test", icon: Mail },
  { id: "voice", label: "Voice Test", icon: Brain },
  { id: "e2e", label: "End-to-End Loop", icon: GitBranch },
];

export default function TestingStudio() {
  const { user } = useAuth();
  const [tab, setTab] = useState("sms");
  const [agents, setAgents] = useState([]);
  const [numbers, setNumbers] = useState([]);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const [a, n] = await Promise.all([
        base44.entities.AgentPersona.filter({ created_by_id: user.id }).catch(() => []),
        base44.entities.PhoneNumber.filter({ created_by_id: user.id }).catch(() => []),
      ]);
      setAgents(a || []);
      setNumbers(n || []);
    } catch (_) {}
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-foreground">Testing Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test your AI agents, templates, and messaging with live mockups — phone, desktop email, voice conversations, and end-to-end loops.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-thin">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {tab === "sms" && <SmsMockup agents={agents} numbers={numbers} />}
        {tab === "email" && <EmailMockup agents={agents} />}
        {tab === "voice" && <VoiceTest agents={agents} />}
        {tab === "e2e" && <E2ELoopTest agents={agents} numbers={numbers} />}
      </div>

      {/* Empty state guidance */}
      {agents.length === 0 && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-sm text-foreground font-medium">No AI agents yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link to="/portal/agents" className="text-primary hover:underline">Create an AI agent</Link> first to test voice and conversations.
          </p>
        </div>
      )}
    </div>
  );
}
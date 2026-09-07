import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import SystemDock from "@/components/xtreme/SystemDock";
import StatusStrip from "@/components/xtreme/StatusStrip";
import MobileNav from "@/components/xtreme/MobileNav";
import WeeklyMetricsPanel from "@/components/xtreme/WeeklyMetricsPanel";
import CallCard from "@/components/xtreme/CallCard";

export default function CallDashboard() {
  const { toast } = useToast();
  const [mobileView, setMobileView] = useState("dispatch");
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(null);

  const load = useCallback(async () => {
    const [voiceCalls, allTasks] = await Promise.all([
      base44.entities.CommsEvent.filter({ channel: "voice" }, "-created_date", 50),
      base44.entities.TaskAssignment.list("-created_date", 100),
    ]);
    setCalls(voiceCalls);
    setTasks(allTasks);
    setLoading(false);
  }, []);
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const callsThisWeek = calls.filter(c => new Date(c.created_date) >= weekStart).length;
  const completedCalls = calls.filter(c => c.status === "completed" && c.duration_sec);
  const avgDurationMin = completedCalls.length
    ? Math.round(
        completedCalls.reduce((s, c) => s + (c.duration_sec || 0), 0) /
          completedCalls.length /
          60
      )
    : 0;
  const tasksThisWeek = tasks.filter(t => new Date(t.created_date) >= weekStart).length;

  const tasksByCall = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const key = t.voice_session_id || t.conversation_id;
      if (key) (map[key] ||= []).push(t);
    });
    return map;
  }, [tasks]);

  const sendSummary = async call => {
    const email = window.prompt("Enter email address to send summary to:");
    if (!email) return;
    setEmailing(call.id);
    try {
      await base44.functions.invoke("sendVoiceSessionSummary", {
        voice_session_id: call.id,
        recipient_email: email,
        call_from: call.from_addr,
        call_to: call.to_addr,
        call_duration: call.duration_sec,
      });
      toast({
        title: "Summary sent",
        description: `Voice session summary emailed to ${email}`,
      });
    } catch (e) {
      toast({
        title: "Failed to send summary",
        description: String(e.message || e),
        variant: "destructive",
      });
    } finally {
      setEmailing(null);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-text-primary">
      <SystemDock activeNode="Call Dashboard" engineState={{}} />
      <div className="flex-1 flex flex-col min-w-0">
        <StatusStrip
          parityPct={0}
          healthPass={0}
          healthTotal={0}
          queueCount={0}
          activeCount={0}
          onAudit={load}
          auditing={loading}
        />
        <div className="flex-1 overflow-y-auto scrollbar-thin grid-hairline">
          <div className="p-4 space-y-4 pb-20 lg:pb-4">
            <div className="rounded-lg border border-surface-border bg-surface p-4">
              <h1 className="font-display text-lg tracking-[0.1em] uppercase">
                Call Dashboard
              </h1>
              <p className="text-[12px] text-text-muted mt-1">
                Recent calls with AI-generated summaries, task assignments, and weekly
                performance metrics.
              </p>
            </div>

            <WeeklyMetricsPanel
              callsThisWeek={callsThisWeek}
              avgDurationMin={avgDurationMin}
              tasksCreated={tasksThisWeek}
            />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-muted">
                  Recent Calls · {calls.length} total
                </span>
              </div>
              <div className="space-y-3">
                {loading && (
                  <div className="text-[12px] text-text-muted font-display tracking-wider">
                    LOADING…
                  </div>
                )}
                {!loading && calls.length === 0 && (
                  <div className="text-[12px] text-text-muted font-display tracking-wider">
                    NO CALLS YET
                  </div>
                )}
                {calls.map(call => (
                  <CallCard
                    key={call.id}
                    call={call}
                    tasks={tasksByCall[call.id] || []}
                    onEmailSummary={sendSummary}
                    emailing={emailing}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav view={mobileView} setView={setMobileView} />
    </div>
  );
}
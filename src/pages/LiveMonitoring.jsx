import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Radio, Phone, PhoneCall, PhoneOff, Volume2, Loader2, Clock, User, ArrowRight, Activity, Brain, BarChart3, TrendingUp, AlertCircle, CheckCircle2, Pause, Play } from "lucide-react";

export default function LiveMonitoring() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stats, setStats] = useState({ active: 0, total: 0, avgDuration: 0, agentsOnline: 0 });
  const transcriptRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await base44.entities.AiVoiceSession.list("-created_date", 50).catch(() => []);
        setSessions(list || []);
        const active = (list || []).filter(s => s.status === "active" || s.status === "in_progress" || s.status === "ringing");
        const avgDur = (list || []).reduce((sum, s) => sum + (s.duration_sec || 0), 0) / Math.max(list.length, 1);
        const agents = new Set((list || []).map(s => s.agent_name).filter(Boolean)).size;
        setStats({ active: active.length, total: (list || []).length, avgDuration: Math.round(avgDur), agentsOnline: agents });
      } catch { setSessions([]); }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [selected, autoScroll]);

  const activeCalls = sessions.filter(s => s.status === "active" || s.status === "in_progress" || s.status === "ringing");
  const recentCalls = sessions.filter(s => !activeCalls.includes(s));

  return (
    <div className="p-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" /> Live Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time call monitoring with live transcripts and audio</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.active > 0 && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> {stats.active} LIVE</span>}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green/10 text-status-green text-sm font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Auto-refresh 3s</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Calls", value: stats.active, icon: PhoneCall, color: "text-destructive" },
          { label: "Total Sessions", value: stats.total, icon: BarChart3, color: "text-primary" },
          { label: "Avg Duration", value: `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`, icon: Clock, color: "text-chart-2" },
          { label: "Agents Online", value: stats.agentsOnline, icon: Brain, color: "text-chart-3" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2"><s.icon className={cn("h-5 w-5", s.color)} /></div>
            <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Call list */}
          <div className="lg:col-span-1 space-y-4">
            {/* Active */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-display uppercase tracking-wider text-destructive mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> Active Calls ({activeCalls.length})
              </h3>
              <div className="space-y-2">
                {activeCalls.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No active calls</p>}
                {activeCalls.map(call => (
                  <CallCard key={call.id} call={call} active onClick={() => setSelected(call)} selected={selected?.id === call.id} />
                ))}
              </div>
            </div>
            {/* Recent */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Recent Calls</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {recentCalls.slice(0, 15).map(call => (
                  <CallCard key={call.id} call={call} onClick={() => setSelected(call)} selected={selected?.id === call.id} />
                ))}
                {recentCalls.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No recent calls</p>}
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                    {activeCalls.includes(selected) ? <PhoneCall className="h-5 w-5 text-destructive" /> : <PhoneOff className="h-5 w-5 text-muted-foreground" />}
                    Call Details
                  </h2>
                  <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                </div>

                {/* Call info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <InfoCard icon={Phone} label="From" value={selected.from_number || selected.caller || "N/A"} />
                  <InfoCard icon={ArrowRight} label="To" value={selected.to_number || selected.dialed || "N/A"} />
                  <InfoCard icon={User} label="Agent" value={selected.agent_name || selected.assistant_name || "N/A"} />
                  <InfoCard icon={Clock} label="Duration" value={selected.duration_sec ? `${Math.floor(selected.duration_sec / 60)}m ${selected.duration_sec % 60}s` : "N/A"} />
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium capitalize",
                    selected.status === "active" || selected.status === "in_progress" ? "bg-destructive/10 text-destructive" :
                    selected.status === "completed" ? "bg-status-green/10 text-status-green" :
                    "bg-accent text-muted-foreground")}>
                    {selected.status || "unknown"}
                  </span>
                  {selected.direction && <span className="px-2 py-1 rounded-full bg-accent text-xs text-muted-foreground capitalize">{selected.direction}</span>}
                </div>

                {/* Audio player */}
                {selected.recording_url && (
                  <div className="mb-4 p-3 rounded-lg bg-accent border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Call Recording</span>
                    </div>
                    <audio controls src={selected.recording_url} className="w-full h-10" />
                  </div>
                )}

                {/* Live transcript */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Live Transcript
                    </h3>
                    <button onClick={() => setAutoScroll(!autoScroll)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      {autoScroll ? <><Pause className="h-3 w-3" /> Pause auto-scroll</> : <><Play className="h-3 w-3" /> Resume auto-scroll</>}
                    </button>
                  </div>
                  <div ref={transcriptRef} className="max-h-80 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-background p-3 space-y-2">
                    {selected.transcript && selected.transcript.length > 0 ? (
                      selected.transcript.map((t, i) => (
                        <div key={i} className={cn("flex gap-2", (t.speaker || t.role) === "agent" ? "justify-end" : "")}>
                          <div className={cn("max-w-[80%] rounded-lg p-2.5",
                            (t.speaker || t.role) === "agent" ? "bg-primary/10 border border-primary/30" : "bg-accent border border-border")}>
                            <p className="text-xs font-medium text-primary mb-0.5">{t.speaker || t.role || "Unknown"}</p>
                            <p className="text-sm text-foreground">{t.text || t.content}</p>
                            {t.timestamp && <p className="text-[9px] text-muted-foreground mt-1">{new Date(t.timestamp).toLocaleTimeString()}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No transcript available for this call.</p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {selected.summary && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/30">
                    <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Summary</h3>
                    <p className="text-sm text-muted-foreground">{selected.summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a call from the left to view live transcript and audio.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CallCard({ call, active, onClick, selected }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors",
      selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", active ? "bg-destructive/10" : "bg-accent")}>
        {active ? <PhoneCall className="h-4 w-4 text-destructive" /> : <PhoneOff className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{call.from_number || call.caller || "Unknown"}</p>
        <p className="text-xs text-muted-foreground truncate">{call.agent_name || call.assistant_name || "No agent"} - {call.status || "unknown"}</p>
      </div>
      {active && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
    </button>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-accent/30 p-2.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5"><Icon className="h-3 w-3" /> {label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
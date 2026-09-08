import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Phone, PhoneCall, PhoneOff, Volume2, Loader2, Clock, User, ArrowRight, Radio } from "lucide-react";

export default function LiveCallViewer() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await base44.entities.AiVoiceSession.list("-created_date", 30).catch(() => []);
        setSessions(list || []);
      } catch { setSessions([]); }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeCalls = sessions.filter((s) => s.status === "active" || s.status === "in_progress" || s.status === "ringing");
  const recentCalls = sessions.filter((s) => !activeCalls.includes(s));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-foreground">Live Call Viewer</h2>
        {activeCalls.length > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> {activeCalls.length} LIVE</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No voice sessions recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Active calls */}
          <div>
            <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Active Calls</h3>
            <div className="space-y-2">
              {activeCalls.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No active calls right now.</p>}
              {activeCalls.map((call) => (
                <CallCard key={call.id} call={call} active onClick={() => setSelected(call)} selected={selected?.id === call.id} />
              ))}
            </div>
          </div>
          {/* Recent calls */}
          <div>
            <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Recent Calls</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {recentCalls.slice(0, 10).map((call) => (
                <CallCard key={call.id} call={call} onClick={() => setSelected(call)} selected={selected?.id === call.id} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Call detail */}
      {selected && (
        <div className="mt-4 p-4 rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground">Call Details</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <Detail icon={Phone} label="From" value={selected.from_number || selected.caller || "N/A"} />
            <Detail icon={ArrowRight} label="To" value={selected.to_number || selected.dialed || "N/A"} />
            <Detail icon={User} label="Agent" value={selected.agent_name || selected.assistant_name || "N/A"} />
            <Detail icon={Clock} label="Duration" value={selected.duration_sec ? `${Math.floor(selected.duration_sec / 60)}m ${selected.duration_sec % 60}s` : "N/A"} />
          </div>
          {selected.recording_url && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent">
              <Volume2 className="h-4 w-4 text-primary" />
              <audio controls src={selected.recording_url} className="flex-1 h-8" />
            </div>
          )}
          {selected.transcript && selected.transcript.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto scrollbar-thin space-y-1">
              {selected.transcript.map((t, i) => (
                <div key={i} className="text-xs"><span className="font-medium text-primary">{t.speaker || t.role}:</span> <span className="text-muted-foreground">{t.text || t.content}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CallCard({ call, active, onClick, selected }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? "bg-destructive/10" : "bg-accent"}`}>
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

function Detail({ icon: Icon, label, value }) {
  return <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p><p className="text-sm font-medium text-foreground truncate">{value}</p></div>;
}
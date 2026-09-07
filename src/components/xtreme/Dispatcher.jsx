import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Activity, Square } from "lucide-react";
import Waveform from "./Waveform";
import PersonaSwitcher from "./PersonaSwitcher";
import { STATUS_STYLES, SHORT_STATUS } from "@/lib/xtreme";

const CHANNELS = ["voice", "sms", "whatsapp", "mms", "rcs", "email"];
const STATUSES = ["active", "ringing", "completed", "queued", "failed"];

function genEvent() {
  const ch = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  const dir = Math.random() > 0.5 ? "inbound" : "outbound";
  const st = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  return {
    channel: ch, direction: dir,
    from_addr: `+1${Math.floor(2000000000 + Math.random() * 7999999999)}`,
    to_addr: `+1${Math.floor(2000000000 + Math.random() * 7999999999)}`,
    status: st, classification: "MOCK/DEV-ONLY",
    duration_sec: ch === "voice" ? Math.floor(Math.random() * 180) : 0,
    _ts: Date.now(),
  };
}

export default function Dispatcher() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [halted, setHalted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.CommsEvent.list("-created_date", 8).then(rows => {
      if (alive) setEvents(rows.map(r => ({ ...r, _ts: new Date(r.created_date).getTime() })));
      if (alive) setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (halted) return;
    const id = setInterval(() => setEvents(prev => [genEvent(), ...prev].slice(0, 8)), 2200);
    return () => clearInterval(id);
  }, [halted]);

  const emergencyStop = () => {
    const next = !halted;
    setHalted(next);
    toast({
      title: next ? "EMERGENCY STOP engaged" : "Dispatcher resumed",
      description: next ? "All outbound comms halted" : "Live stream reactivated",
      variant: next ? "destructive" : "default",
    });
  };

  return (
    <section className="relative rounded-lg border border-surface-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-status-green" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Live Communications Dispatcher</span>
          <span className={cn("ml-2 h-1.5 w-1.5 rounded-full", halted ? "bg-accent-orange" : "bg-status-green animate-pulse")} />
        </div>
        <div className="flex items-center gap-2">
          <PersonaSwitcher />
          <button onClick={emergencyStop}
            className={cn("flex items-center gap-1.5 px-3 h-8 rounded text-[11px] font-display tracking-[0.1em] uppercase border transition-colors",
              halted ? "border-status-green/40 text-status-green hover:bg-status-green/10" : "border-accent-orange/50 text-accent-orange hover:bg-accent-orange/10")}>
            {halted ? <Activity className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {halted ? "Resume" : "Emergency Stop"}
          </button>
        </div>
      </div>
      <div className="grid md:grid-cols-[1fr_280px]">
        <div className="divide-y divide-surface-border max-h-[260px] overflow-y-auto scrollbar-thin">
          {loading && <div className="p-4 text-[12px] text-text-muted font-display tracking-wider">SYNCING STREAM…</div>}
          {events.map((e, i) => {
            const st = STATUS_STYLES[e.classification] || STATUS_STYLES["MOCK/DEV-ONLY"];
            return (
              <div key={e.id || e._ts + "-" + i} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
                <span className={cn("font-display uppercase tracking-wider w-16", st.text)}>{e.channel}</span>
                <span className="text-text-muted w-14 uppercase text-[10px]">{e.direction}</span>
                <span className="text-text-primary font-mono text-[11px] flex-1 truncate">{e.from_addr} → {e.to_addr}</span>
                <span className="text-text-muted text-[10px] uppercase hidden sm:block">{e.status}</span>
                <span className="text-[9px] font-display tracking-[0.1em] uppercase text-text-muted border border-surface-border rounded px-1.5 py-0.5">{SHORT_STATUS(e.classification || "MOCK/DEV-ONLY")}</span>
              </div>
            );
          })}
        </div>
        <div className="relative h-[120px] md:h-auto border-t md:border-t-0 md:border-l border-surface-border bg-base/40">
          <Waveform active={!halted && events.length > 0} halted={halted} />
          <div className="absolute bottom-2 left-3 font-display text-[9px] tracking-[0.15em] uppercase text-text-muted">audio relay</div>
        </div>
      </div>
    </section>
  );
}
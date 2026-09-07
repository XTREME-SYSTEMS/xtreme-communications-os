import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Activity, Square, RadioTower } from "lucide-react";
import Waveform from "./Waveform";
import PersonaSwitcher from "./PersonaSwitcher";
import { STATUS_STYLES, SHORT_STATUS } from "@/lib/xtreme";

export default function Dispatcher() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [halted, setHalted] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEvents = () => {
    base44.entities.CommsEvent.list("-created_date", 12).then(rows => {
      setEvents(rows.map(r => ({ ...r, _ts: new Date(r.created_date).getTime() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
    const unsub = base44.entities.CommsEvent.subscribe(() => loadEvents());
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

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
          {!loading && events.length === 0 && (
            <div className="p-4 flex items-center gap-2 text-[12px] text-text-muted font-display tracking-wider">
              <RadioTower className="h-4 w-4" /> NO LIVE EVENTS — AWAITING REAL TRAFFIC
            </div>
          )}
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
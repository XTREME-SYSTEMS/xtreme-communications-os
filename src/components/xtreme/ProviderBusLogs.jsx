import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const PROVIDERS = ["Twilio", "Vonage", "Bandwidth", "Meta WhatsApp", "SendGrid", "Plivo", "SignalWire", "Sinch"];
const CHANNELS = ["sms", "voice", "whatsapp", "sip", "number", "email", "verify", "payment"];
const EVENTS = ["inbound", "outbound", "delivery", "webhook", "provision", "lookup", "status", "error"];
const STATUSES = ["delivered", "sent", "received", "accepted", "processing", "queued", "failed"];

function gen() {
  const p = PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)];
  const ch = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const st = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  return {
    provider: p, channel: ch, event_type: ev,
    direction: (ev === "inbound" || ev === "delivery" || ev === "webhook") ? "inbound" : "outbound",
    status: st, latency_ms: Math.floor(20 + Math.random() * 480),
    message: `${p} ${ch} ${ev} → ${st}`, _ts: Date.now(),
  };
}

const color = (s) => s === "failed" ? "text-accent-orange"
  : (s === "delivered" || s === "received" || s === "sent") ? "text-status-green" : "text-text-muted";

export default function ProviderBusLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.ProviderLog.list("-created_date", 12).then(rows => {
      if (alive) setLogs(rows.map(r => ({ ...r, _ts: new Date(r.created_date).getTime() })));
      if (alive) setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLogs(prev => [gen(), ...prev].slice(0, 14)), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-surface-border">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Realtime Provider Bus</span>
        <span className="text-[10px] font-display tracking-wider text-text-muted">CARRIER · SIP · WEBHOOK</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="grid grid-cols-[120px_70px_80px_60px_70px_1fr] gap-2 px-4 py-2 border-b border-surface-border font-display text-[9px] tracking-[0.1em] uppercase text-text-muted min-w-[520px]">
          <span>Provider</span><span>Channel</span><span>Event</span><span>Dir</span><span>Latency</span><span>Status</span>
        </div>
        <div className="max-h-[220px] overflow-y-auto scrollbar-thin min-w-[520px]">
          {loading && <div className="p-4 text-[12px] text-text-muted font-display tracking-wider">CONNECTING BUS…</div>}
          {logs.map((l, i) => (
            <div key={l.id || l._ts + "-" + i} className="grid grid-cols-[120px_70px_80px_60px_70px_1fr] gap-2 px-4 py-1.5 border-b border-surface-border/50 text-[11px]">
              <span className="text-text-primary truncate">{l.provider}</span>
              <span className="text-text-muted uppercase">{l.channel}</span>
              <span className="text-text-muted truncate">{l.event_type}</span>
              <span className="text-text-muted uppercase">{l.direction}</span>
              <span className="font-display text-text-muted">{l.latency_ms}ms</span>
              <span className={cn("font-display uppercase tracking-wider", color(l.status))}>{l.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
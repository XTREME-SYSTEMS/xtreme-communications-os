import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Radar, AlertTriangle, Gauge, Waves, Brain } from "lucide-react";
import RouteQualityChart from "@/components/xtreme/RouteQualityChart";

const ANOMALY_STYLES = {
  none: "text-text-muted",
  latency_spike: "text-accent-orange",
  packet_loss: "text-destructive",
  jitter_burst: "text-chart-4",
  delivery_drop: "text-destructive",
  mos_degradation: "text-chart-5",
};

export default function RouteQuality() {
  const [metrics, setMetrics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([
        base44.entities.CarrierRouteMetrics.list("-measured_at", 200),
        base44.entities.AiVoiceSession.list("-created_date", 50),
      ]);
      setMetrics(m); setSessions(s);
    } catch (_) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const anomalies = metrics.filter((m) => m.anomaly_flag);
  const avgLatency = metrics.length ? Math.round(metrics.reduce((s, m) => s + (m.latency_ms || 0), 0) / metrics.length) : 0;
  const avgSuccess = metrics.length ? (Math.round(metrics.reduce((s, m) => s + (m.delivery_success_pct || 0), 0) / metrics.length * 10) / 10) : 100;
  const avgMos = metrics.length ? (Math.round(metrics.reduce((s, m) => s + (m.mos_score || 0), 0) / metrics.length * 100) / 100) : 4.0;

  const byChannel = {};
  for (const m of metrics) {
    if (!byChannel[m.channel]) byChannel[m.channel] = { latency_sum: 0, success_sum: 0, count: 0, anomalies: 0 };
    byChannel[m.channel].latency_sum += m.latency_ms || 0;
    byChannel[m.channel].success_sum += m.delivery_success_pct || 0;
    byChannel[m.channel].count++;
    if (m.anomaly_flag) byChannel[m.channel].anomalies++;
  }
  const chartData = Object.entries(byChannel).map(([channel, v]) => ({
    channel,
    latency: Math.round(v.latency_sum / v.count),
    success: Math.round(v.success_sum / v.count * 10) / 10,
    anomalies: v.anomalies,
  }));

  const cognitiveSessions = sessions.filter((s) => s.sentiment_summary || (s.barge_in_count || 0) > 0);

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Route Quality · Cognitive Telemetry</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">XTREME COMMUNICATIONS · anomaly detection + sentiment analytics</span>
        </div>
      </div>

      <div className="p-4 lg:p-6 grid lg:grid-cols-4 gap-4">
        <StatCard icon={Gauge} label="Avg Latency" value={`${avgLatency}ms`} tone="text-accent-orange" />
        <StatCard icon={Waves} label="Delivery Success" value={`${avgSuccess}%`} tone={avgSuccess >= 95 ? "text-status-green" : "text-destructive"} />
        <StatCard icon={Radar} label="Avg MOS" value={avgMos.toFixed(2)} tone={avgMos >= 3.5 ? "text-status-green" : "text-chart-4"} />
        <StatCard icon={AlertTriangle} label="Anomalies" value={anomalies.length} tone={anomalies.length ? "text-destructive" : "text-status-green"} />
      </div>

      <div className="px-4 lg:px-6 pb-4 grid lg:grid-cols-3 gap-4">
        <section className="rounded-lg border border-surface-border bg-surface flex flex-col lg:col-span-2">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <Waves className="h-3.5 w-3.5 text-status-green" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Route Quality by Channel</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{chartData.length} CHANNELS</span>
          </div>
          <div className="p-3">
            {chartData.length ? <RouteQualityChart data={chartData} /> : <div className="h-[220px] flex items-center justify-center text-[11px] text-text-muted font-display tracking-wider">NO METRICS</div>}
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface flex flex-col">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Anomaly Feed</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{anomalies.length}</span>
          </div>
          <div className="divide-y divide-surface-border max-h-[260px] overflow-y-auto scrollbar-thin">
            {anomalies.map((m) => (
              <div key={m.id} className="px-4 py-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-display uppercase tracking-wider text-accent-orange">{m.channel}</span>
                  <span className={`text-[10px] font-display uppercase tracking-wider ${ANOMALY_STYLES[m.anomaly_type] || "text-destructive"}`}>{m.anomaly_type}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                  <span>{m.provider_name} · {m.latency_ms}ms · {m.packet_loss_pct}% loss</span>
                  <span>{m.measured_at?.slice(11, 19)}</span>
                </div>
              </div>
            ))}
            {!anomalies.length && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO ANOMALIES</div>}
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface flex flex-col lg:col-span-3">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <Radar className="h-3.5 w-3.5 text-accent-orange" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Live Route Metric Feed</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{metrics.length} SAMPLES</span>
          </div>
          <div className="divide-y divide-surface-border max-h-[280px] overflow-y-auto scrollbar-thin">
            {metrics.slice(0, 50).map((m) => (
              <div key={m.id} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                <span className="text-text-muted font-mono w-20 truncate">{m.measured_at?.slice(11, 19)}</span>
                <span className="text-accent-orange font-display uppercase tracking-wider w-16">{m.channel}</span>
                <span className="text-text-muted w-24 truncate">{m.provider_name}</span>
                <span className="text-text-primary font-mono w-16">{m.latency_ms}ms</span>
                <span className="text-text-muted font-mono w-16">{m.packet_loss_pct}%</span>
                <span className={`font-mono w-14 ${m.delivery_success_pct >= 95 ? "text-status-green" : "text-destructive"}`}>{m.delivery_success_pct}%</span>
                <span className="text-text-muted font-mono w-12">{m.mos_score?.toFixed(1)}</span>
                <span className={`ml-auto text-[9px] uppercase tracking-wider w-28 text-right ${m.anomaly_flag ? "text-destructive" : "text-text-muted"}`}>{m.anomaly_flag ? m.anomaly_type : "nominal"}</span>
              </div>
            ))}
            {!metrics.length && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO METRICS RECORDED</div>}
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface flex flex-col lg:col-span-3">
          <div className="flex items-center gap-2 px-4 h-11 border-b border-surface-border">
            <Brain className="h-3.5 w-3.5 text-chart-5" />
            <span className="font-display text-[11px] tracking-[0.15em] uppercase">Cognitive Voice Sessions · Sentiment + Barge-in Telemetry</span>
            <span className="ml-auto text-[10px] font-display tracking-wider text-text-muted">{cognitiveSessions.length}</span>
          </div>
          <div className="divide-y divide-surface-border max-h-[260px] overflow-y-auto scrollbar-thin">
            {cognitiveSessions.map((s) => {
              const sm = s.sentiment_summary || {};
              const latent = s.latent_metrics || {};
              return (
                <div key={s.id} className="px-4 py-2.5 flex items-center gap-4 text-[11px]">
                  <span className="text-text-muted font-mono w-16 truncate">{s.status}</span>
                  <span className="text-accent-orange font-display uppercase tracking-wider w-20">{sm.dominant || "—"}</span>
                  <span className="text-text-muted">P:{sm.positive || 0} N:{sm.negative || 0} F:{sm.frustrated || 0}</span>
                  <span className="text-text-muted font-mono">avg {latent.avg_response_latency_ms || 0}ms</span>
                  <span className="text-text-muted font-mono">max {latent.max_silence_gap_ms || 0}ms</span>
                  <span className={`font-mono ${s.barge_in_count > 2 ? "text-destructive" : "text-text-muted"}`}>barge:{s.barge_in_count || 0}</span>
                  <span className="ml-auto text-text-muted font-mono">{s.duration_sec?.toFixed(1) || "0"}s</span>
                </div>
              );
            })}
            {!cognitiveSessions.length && <div className="p-4 text-[11px] text-text-muted font-display tracking-wider">NO COGNITIVE SESSIONS</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface px-4 py-3 flex items-center gap-3">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="flex flex-col">
        <span className="text-[9px] text-text-muted uppercase tracking-wider">{label}</span>
        <span className={`text-[18px] font-mono ${tone}`}>{value}</span>
      </div>
    </div>
  );
}
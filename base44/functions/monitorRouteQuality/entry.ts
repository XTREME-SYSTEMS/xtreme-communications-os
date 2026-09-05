import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Carrier route quality metrics collector + anomaly detector.
// Tracks latency spikes, packet loss, jitter, delivery success, and MOS degradation
// across provider abstraction adapters. Flags anomalies in real time.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const key = keys[0];
    const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    if (!tenant || tenant.status !== "active") return Response.json({ error: "tenant not active" }, { status: 403 });

    const action = body.action || "record";

    // --- RECORD: persist a route quality sample with anomaly detection ---
    if (action === "record") {
      const channel = body.channel;
      if (!channel) return Response.json({ error: "channel required" }, { status: 400 });
      const latency_ms = body.latency_ms || 0;
      const latency_p95_ms = body.latency_p95_ms || latency_ms;
      const packet_loss_pct = body.packet_loss_pct || 0;
      const jitter_ms = body.jitter_ms || 0;
      const delivery_success_pct = body.delivery_success_pct ?? 100;
      const mos_score = body.mos_score ?? 4.0;
      const provider_id = body.provider_id || null;
      const provider_name = body.provider_name || "sandbox";
      const classification = body.classification || "SANDBOX";

      // Anomaly detection thresholds
      let anomaly_flag = false;
      let anomaly_type = "none";
      if (latency_ms > 800 || latency_p95_ms > 1500) { anomaly_flag = true; anomaly_type = "latency_spike"; }
      else if (packet_loss_pct > 2) { anomaly_flag = true; anomaly_type = "packet_loss"; }
      else if (jitter_ms > 50) { anomaly_flag = true; anomaly_type = "jitter_burst"; }
      else if (delivery_success_pct < 95) { anomaly_flag = true; anomaly_type = "delivery_drop"; }
      else if (mos_score < 3.5) { anomaly_flag = true; anomaly_type = "mos_degradation"; }

      const metric = await base44.asServiceRole.entities.CarrierRouteMetrics.create({
        tenant_id: tenant.id, provider_id, provider_name, channel,
        route_id: body.route_id || null,
        latency_ms, latency_p95_ms, packet_loss_pct, jitter_ms,
        delivery_success_pct, mos_score,
        anomaly_flag, anomaly_type,
        sample_count: body.sample_count || 1,
        measured_at: new Date().toISOString(),
        classification,
      });

      // Log to provider audit trail
      await base44.asServiceRole.entities.ProviderLog.create({
        provider: provider_name, channel, event_type: anomaly_flag ? "route_anomaly" : "route_metric",
        direction: "system", status: anomaly_flag ? "failed" : "delivered",
        latency_ms, message: `anomaly=${anomaly_type} loss=${packet_loss_pct}% jitter=${jitter_ms}ms mos=${mos_score} success=${delivery_success_pct}%`,
      });

      return Response.json({ metric_id: metric.id, anomaly_flag, anomaly_type, recorded: true });
    }

    // --- QUERY: fetch recent metrics + aggregate health for dashboard ---
    if (action === "query") {
      const limit = body.limit || 50;
      const metrics = await base44.asServiceRole.entities.CarrierRouteMetrics.filter(
        { tenant_id: tenant.id }, "-measured_at", limit
      );
      const anomalies = metrics.filter(m => m.anomaly_flag);
      const avgLatency = metrics.length ? Math.round(metrics.reduce((s, m) => s + (m.latency_ms || 0), 0) / metrics.length) : 0;
      const avgSuccess = metrics.length ? Math.round(metrics.reduce((s, m) => s + (m.delivery_success_pct || 0), 0) / metrics.length * 10) / 10 : 100;
      const avgMos = metrics.length ? Math.round(metrics.reduce((s, m) => s + (m.mos_score || 0), 0) / metrics.length * 100) / 100 : 4.0;
      const byChannel = {};
      metrics.forEach(m => {
        if (!byChannel[m.channel]) byChannel[m.channel] = { count: 0, latency_sum: 0, success_sum: 0, anomalies: 0 };
        byChannel[m.channel].count++;
        byChannel[m.channel].latency_sum += m.latency_ms || 0;
        byChannel[m.channel].success_sum += m.delivery_success_pct || 0;
        if (m.anomaly_flag) byChannel[m.channel].anomalies++;
      });
      return Response.json({
        total_samples: metrics.length,
        anomaly_count: anomalies.length,
        avg_latency_ms: avgLatency,
        avg_success_pct: avgSuccess,
        avg_mos: avgMos,
        by_channel: byChannel,
        recent: metrics.slice(0, 20).map(m => ({
          id: m.id, channel: m.channel, provider_name: m.provider_name,
          latency_ms: m.latency_ms, packet_loss_pct: m.packet_loss_pct,
          delivery_success_pct: m.delivery_success_pct, mos_score: m.mos_score,
          anomaly_flag: m.anomaly_flag, anomaly_type: m.anomaly_type,
          measured_at: m.measured_at,
        })),
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
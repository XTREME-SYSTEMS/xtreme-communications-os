import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const latencyColor = (ms) => {
  if (ms < 100) return "#22c55e";
  if (ms < 300) return "#eab308";
  return "#ef4444";
};

export default function GeoLatencyMap({ metrics }) {
  const geoMetrics = metrics.filter((m) => m.latitude && m.longitude);

  return (
    <MapContainer
      center={[39.5, -98.5]}
      zoom={4}
      scrollWheelZoom={false}
      style={{ height: "420px", width: "100%", borderRadius: "0.5rem", zIndex: 0 }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {geoMetrics.map((m, i) => {
        const color = latencyColor(m.latency_ms || 0);
        const radius = Math.max(8, Math.min(30, (m.delivery_success_pct || 100) / 5));
        return (
          <CircleMarker
            key={m.id || i}
            center={[m.latitude, m.longitude]}
            radius={radius}
            fillColor={color}
            color={color}
            fillOpacity={0.6}
            weight={1.5}
          >
            <Popup>
              <div className="text-[11px]">
                <strong>{m.provider_name || m.channel}</strong>
                <br />
                Region: {m.region || "Unknown"}
                <br />
                Latency: {m.latency_ms}ms (p95: {m.latency_p95_ms}ms)
                <br />
                Success: {m.delivery_success_pct}%
                <br />
                Packet Loss: {m.packet_loss_pct}%
                <br />
                Jitter: {m.jitter_ms}ms
                <br />
                MOS: {m.mos_score?.toFixed(1) || "—"}
                {m.anomaly_flag && (
                  <>
                    <br />
                    <span style={{ color: "#ef4444" }}>⚠ {m.anomaly_type}</span>
                  </>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
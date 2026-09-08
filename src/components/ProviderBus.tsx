"use client";

const events = [
  { provider: "twilio", channel: "sms", event: "delivered", direction: "out", latency: "42ms", status: "ok" },
  { provider: "sendgrid", channel: "email", event: "queued", direction: "out", latency: "18ms", status: "ok" },
  { provider: "twilio", channel: "voice", event: "completed", direction: "in", latency: "120ms", status: "ok" },
  { provider: "sip", channel: "voice", event: "ringing", direction: "out", latency: "8ms", status: "ok" },
];

export function ProviderBus() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-white mb-3">REALTIME PROVIDER BUS</h2>
      <div className="space-y-1">
        {events.map((e, i) => (
          <div key={i} className="grid grid-cols-6 gap-1 text-xs bg-black border border-gray-800 rounded px-3 py-2">
            <span className="text-green-400 font-mono">{e.provider}</span>
            <span className="text-gray-400">{e.channel}</span>
            <span className="text-white">{e.event}</span>
            <span className="text-gray-500">{e.direction}</span>
            <span className="text-gray-500">{e.latency}</span>
            <span className="text-green-400">{e.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

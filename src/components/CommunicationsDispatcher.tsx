"use client";
import { Mail, MessageSquare, Phone } from "lucide-react";

const messages = [
  { type: "SMS", direction: "OUT", routing: "twilio", status: "delivered", env: "prod" },
  { type: "Email", direction: "IN", routing: "smtp", status: "queued", env: "prod" },
  { type: "Voice", direction: "OUT", routing: "sip", status: "completed", env: "prod" },
  { type: "SMS", direction: "IN", routing: "twilio", status: "delivered", env: "prod" },
];

export function CommunicationsDispatcher() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-white mb-3">LIVE COMMUNICATIONS DISPATCHER</h2>
      <div className="space-y-1">
        {messages.map((m, i) => {
          const Icon = m.type === "SMS" ? MessageSquare : m.type === "Email" ? Mail : Phone;
          return (
            <div key={i} className="flex items-center gap-2 text-xs bg-black border border-gray-800 rounded px-3 py-2">
              <Icon className="h-3 w-3 text-gray-500" />
              <span className="text-white font-medium">{m.type}</span>
              <span className="text-gray-500">{m.direction}</span>
              <span className="text-gray-500">{m.routing}</span>
              <span className="text-gray-500">{m.env}</span>
              <span className={m.status === "delivered" || m.status === "completed" ? "text-green-400 ml-auto" : "text-orange-400 ml-auto"}>{m.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

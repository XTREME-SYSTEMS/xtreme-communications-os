"use client";
import { Loader2 } from "lucide-react";

const tasks = [
  { name: "Deploy voice gateway v2.1", builder: "autobuilder", priority: "high", status: "building" },
  { name: "Sync provider parity report", builder: "faultline", priority: "medium", status: "queued" },
  { name: "Update SIP routing rules", builder: "shadow", priority: "high", status: "building" },
  { name: "Generate telemetry dashboard", builder: "vision", priority: "low", status: "queued" },
];

export function BuildQueue() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-white mb-3">AUTONOMOUS BUILD QUEUE</h2>
      <div className="space-y-1">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-black border border-gray-800 rounded px-3 py-2">
            {t.status === "building" ? <Loader2 className="h-3 w-3 text-orange-400 animate-spin" /> : <span className="h-3 w-3" />}
            <span className="text-white font-medium flex-1">{t.name}</span>
            <span className="text-gray-500">{t.builder}</span>
            <span className={t.priority === "high" ? "text-red-400" : t.priority === "medium" ? "text-orange-400" : "text-gray-500"}>{t.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

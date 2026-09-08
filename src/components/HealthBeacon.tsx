"use client";
import { CheckCircle2 } from "lucide-react";

export function HealthBeacon() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white">HEALTH BEACON</h2>
        <CheckCircle2 className="h-5 w-5 text-green-400" />
      </div>
      <div className="text-center py-4">
        <p className="text-4xl font-bold text-green-400">100%</p>
        <p className="text-xs text-gray-500 mt-1">System Parity</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center bg-black border border-gray-800 rounded p-2">
          <p className="text-xs text-gray-500">Uptime</p>
          <p className="text-sm font-bold text-green-400">99.98%</p>
        </div>
        <div className="text-center bg-black border border-gray-800 rounded p-2">
          <p className="text-xs text-gray-500">Latency</p>
          <p className="text-sm font-bold text-white">42ms</p>
        </div>
        <div className="text-center bg-black border border-gray-800 rounded p-2">
          <p className="text-xs text-gray-500">Errors</p>
          <p className="text-sm font-bold text-green-400">0</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500 tracking-wider">OBSERVE · PLAN · EXECUTE · AUDIT · REPAIR</p>
      </div>
    </div>
  );
}

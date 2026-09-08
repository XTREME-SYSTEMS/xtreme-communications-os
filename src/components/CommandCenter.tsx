"use client";
import { CheckCircle2 } from "lucide-react";

export function CommandCenter() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white">COMMAND CENTER</h2>
        <span className="flex items-center gap-1 text-xs text-green-400"><span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> LIVE</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-black border border-gray-800 rounded p-3">
          <p className="text-xs text-gray-500">Twilio Parity</p>
          <p className="text-xl font-bold text-green-400">100%</p>
        </div>
        <div className="bg-black border border-gray-800 rounded p-3">
          <p className="text-xs text-gray-500">Release Gate</p>
          <p className="text-xl font-bold text-white">200/200</p>
        </div>
        <div className="bg-black border border-gray-800 rounded p-3">
          <p className="text-xs text-gray-500">Build Queue</p>
          <p className="text-xl font-bold text-orange-400">4</p>
        </div>
        <div className="bg-black border border-gray-800 rounded p-3">
          <p className="text-xs text-gray-500">Active Streams</p>
          <p className="text-xl font-bold text-white">1</p>
        </div>
      </div>
    </div>
  );
}

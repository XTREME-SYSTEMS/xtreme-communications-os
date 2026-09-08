"use client";

const engines = [
  { name: "Vision Cortex", role: "AI Brain", score: 98 },
  { name: "Faultline", role: "Engineering Control", score: 92 },
  { name: "Cloud Browser", role: "Eyes + Hands", score: 74 },
  { name: "Shadow", role: "Privileged Subsystem", score: 100 },
];

export function SystemEngines() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-white mb-3">SYSTEM ENGINES</h2>
      <div className="space-y-2">
        {engines.map((e) => (
          <div key={e.name} className="bg-black border border-gray-800 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{e.name}</p>
                <p className="text-xs text-gray-500">{e.role}</p>
              </div>
              <span className={e.score >= 90 ? "text-green-400 text-lg font-bold" : "text-orange-400 text-lg font-bold"}>{e.score}%</span>
            </div>
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={e.score >= 90 ? "h-full bg-green-400" : "h-full bg-orange-400"} style={{ width: e.score + "%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

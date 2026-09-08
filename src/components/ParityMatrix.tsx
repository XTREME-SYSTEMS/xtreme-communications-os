"use client";

const categories = [
  { name: "voice", count: 12, parity: 100 },
  { name: "messaging", count: 18, parity: 100 },
  { name: "infrastructure", count: 8, parity: 94 },
  { name: "verification", count: 6, parity: 100 },
  { name: "contact_center", count: 10, parity: 88 },
  { name: "billing", count: 5, parity: 100 },
  { name: "automation", count: 7, parity: 100 },
  { name: "ai", count: 6, parity: 92 },
];

export function ParityMatrix() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-white mb-3">CAPABILITY PARITY MATRIX</h2>
      <p className="text-xs text-gray-500 mb-3">72 capabilities across 8 categories</p>
      <div className="space-y-1">
        {categories.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-xs bg-black border border-gray-800 rounded px-3 py-2">
            <span className="text-white font-medium flex-1">{c.name}</span>
            <span className="text-gray-500">{c.count} caps</span>
            <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className={c.parity === 100 ? "h-full bg-green-400" : "h-full bg-orange-400"} style={{ width: c.parity + "%" }} />
            </div>
            <span className={c.parity === 100 ? "text-green-400 w-10 text-right" : "text-orange-400 w-10 text-right"}>{c.parity}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PreflightScoreGauge({ score, target = 100, label = "Overall Score" }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(score / target, 1));
  const offset = circ * (1 - pct);
  const color = score >= 100 ? "#22c55e" : score >= 75 ? "#eab308" : "#f97316";
  return (
    <div className="relative flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--surface-border))" strokeWidth="10" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl leading-none" style={{ color }}>{score}</span>
        <span className="font-display text-[9px] tracking-[0.2em] text-text-muted uppercase mt-1">{label}</span>
      </div>
    </div>
  );
}
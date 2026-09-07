import { useEffect, useState } from "react";

// Animated oscilloscope / equalizer visualization for voice test playback
export default function Oscilloscope({ active = false, bars = 24 }) {
  const [heights, setHeights] = useState(() => Array(bars).fill(0.2));

  useEffect(() => {
    if (!active) { setHeights(Array(bars).fill(0.15)); return; }
    const id = setInterval(() => {
      setHeights(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 120);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="flex items-end justify-center gap-1 h-16 w-full">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all duration-150 ${active ? "bg-accent-orange tl-bar-eq" : "bg-surface-border"}`}
          style={{
            height: `${h * 100}%`,
            animationDelay: `${i * 0.05}s`,
            opacity: active ? 0.4 + h * 0.6 : 0.3,
          }}
        />
      ))}
    </div>
  );
}
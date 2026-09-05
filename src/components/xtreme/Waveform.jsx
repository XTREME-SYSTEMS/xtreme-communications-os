import { useEffect, useRef } from "react";

export default function Waveform({ active = true, halted = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const BARS = 56;
    if (stateRef.current.length === 0) stateRef.current = new Array(BARS).fill(0.08);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width) * dpr;
      canvas.height = Math.max(1, rect.height) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const bw = w / BARS;
      for (let i = 0; i < BARS; i++) {
        const target = active && !halted ? Math.random() * 0.9 + 0.1 : 0.05;
        stateRef.current[i] += (target - stateRef.current[i]) * 0.18;
        const v = stateRef.current[i];
        const bh = v * h * 0.9;
        const x = i * bw + bw * 0.2;
        const y = (h - bh) / 2;
        ctx.fillStyle = halted ? "rgba(255,85,0,0.55)" : v > 0.6 ? "rgba(0,230,118,0.9)" : "rgba(0,230,118,0.4)";
        ctx.fillRect(x, y, bw * 0.6, bh);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [active, halted]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
import { useState } from "react";
import { Eye, Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PreflightSensory({ tests, score }) {
  const [speaking, setSpeaking] = useState(false);
  const visualTests = tests.slice(0, 48);
  const passCount = tests.filter((t) => t.status === "pass").length;
  const failCount = tests.filter((t) => t.status === "fail").length;

  const speak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const verdict = `Preflight verdict. Overall score ${score} out of 100. ${passCount} tests passed, ${failCount} failed. ${
      score >= 100 ? "System is production ready." : score >= 75 ? "System is near ready, gaps remain." : "Critical gaps detected, healing required."}`;
    const u = new SpeechSynthesisUtterance(verdict);
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-accent-orange" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase">Visual Test Matrix</span>
          <span className="ml-auto font-display text-[10px] text-text-muted">{passCount} pass · {failCount} fail</span>
        </div>
        <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 flex-1 content-start">
          {visualTests.length === 0 && <span className="text-[11px] text-text-muted">No test results — run a stage to populate.</span>}
          {visualTests.map((t, i) => (
            <div key={t.id || i} title={`${t.test_name}: ${t.status}`}
              className={cn("h-5 rounded-sm", t.status === "pass" ? "bg-status-green" : t.status === "fail" ? "bg-destructive" : "bg-text-muted/30")} />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="h-4 w-4 text-accent-orange" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase">Auditory Verdict</span>
        </div>
        <p className="text-[12px] text-text-muted leading-relaxed mb-4 flex-1">
          Speaks the live preflight verdict — overall score, pass/fail counts, and production readiness — using system speech synthesis. Verifiable auditory proof of system state.
        </p>
        <button onClick={speak}
          className={cn("h-10 rounded font-display tracking-[0.1em] uppercase text-[11px] flex items-center justify-center gap-2",
            speaking ? "bg-destructive text-base" : "bg-accent-orange text-base")}>
          {speaking ? <><Square className="h-4 w-4" /> Stop</> : <><Volume2 className="h-4 w-4" /> Speak Verdict</>}
        </button>
      </div>
    </div>
  );
}
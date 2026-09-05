import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import SystemDock from "@/components/xtreme/SystemDock";
import StatusStrip from "@/components/xtreme/StatusStrip";
import MobileNav from "@/components/xtreme/MobileNav";
import PreflightMatrix from "@/components/xtreme/PreflightMatrix";
import PreflightStages from "@/components/xtreme/PreflightStages";
import PreflightScoreGauge from "@/components/xtreme/PreflightScoreGauge";
import PreflightSensory from "@/components/xtreme/PreflightSensory";
import { Rocket, Bot } from "lucide-react";

export default function Preflight() {
  const { toast } = useToast();
  const [activeNode] = useState("Preflight");
  const [mobileView, setMobileView] = useState("parity");
  const [capabilities, setCapabilities] = useState([]);
  const [tests, setTests] = useState([]);
  const [findings, setFindings] = useState([]);
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoPiloting, setAutoPiloting] = useState(false);

  const load = useCallback(async () => {
    const [caps, tst, fnd, eng] = await Promise.all([
      base44.entities.Capability.list("-created_date", 300),
      base44.entities.TestResult.list("-created_date", 200),
      base44.entities.AuditFinding.list("-created_date", 50),
      base44.entities.EngineStatus.list("-created_date", 50),
    ]);
    setCapabilities(caps); setTests(tst); setFindings(fnd); setEngines(eng);
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const engineState = Object.fromEntries(engines.map((e) => [e.engine_name, e]));
  const liveCount = capabilities.filter((c) => c.status === "LIVE" || c.status === "PROVIDER-BACKED").length;
  const parityPct = capabilities.length ? Math.round((liveCount / capabilities.length) * 100) : 0;
  const passCount = tests.filter((t) => t.status === "pass").length;
  const mandatory = tests.filter((t) => t.mandatory !== false);
  const testScore = mandatory.length ? Math.round((mandatory.filter((t) => t.status === "pass").length / mandatory.length) * 100) : 0;
  const coverageScore = capabilities.length ? Math.round(capabilities.reduce((s, c) => s + (c.coverage_pct ?? 0), 0) / capabilities.length) : 0;
  const openFindings = findings.filter((f) => f.status === "open").length;
  const findingPenalty = Math.min(openFindings * 2, 20);
  const overall = Math.max(0, Math.round(coverageScore * 0.5 + testScore * 0.4 + parityPct * 0.1 - findingPenalty));

  const systemSummary = useMemo(() => ({
    status: overall >= 100 ? "LIVE" : overall >= 75 ? "PROVIDER-BACKED" : "GAP",
    score: overall,
    evidence: `${capabilities.length} capabilities, ${tests.length} tests (${passCount} pass), ${openFindings} open findings, ${liveCount}/${capabilities.length} live`,
  }), [overall, capabilities, tests, passCount, openFindings, liveCount]);

  const onResult = (cap, data) => {
    if (data?.projected_score != null)
      toast({ title: `${cap.name}: ${data.gap_severity || "analyzed"}`, description: `Projected ${data.projected_score}% after fix` });
  };

  const launch = () => toast({
    title: overall >= 100 ? "LAUNCH GO" : "LAUNCH HOLD",
    description: overall >= 100 ? "100% parity reached — production cutover cleared." : `${overall}% — ${Math.max(0, 100 - overall)}% gap remains. Heal all gaps first.`,
    variant: overall >= 100 ? "default" : "destructive",
  });

  const runAutoPilot = async () => {
    setAutoPiloting(true);
    try {
      const res = await base44.functions.invoke("preflightAutoPilot", { max_gaps: 5 });
      const d = res.data || res;
      toast({ title: "AutoPilot sweep complete", description: `${d.gaps_found} gaps · ${d.tasks_queued} tasks queued · ${d.current_score}% → ${d.projected_score}% projected` });
      await load();
    } catch (e) {
      toast({ title: "AutoPilot failed", description: String(e.message || e), variant: "destructive" });
    } finally { setAutoPiloting(false); }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-text-primary">
      <SystemDock activeNode={activeNode} engineState={engineState} />
      <div className="flex-1 flex flex-col min-w-0">
        <StatusStrip parityPct={parityPct} healthPass={passCount} healthTotal={tests.length} queueCount={0} activeCount={0} onAudit={load} auditing={loading} />
        <div className="flex-1 overflow-y-auto scrollbar-thin grid-hairline">
          <div className="p-4 space-y-4 pb-20 lg:pb-4">
            <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h1 className="font-display text-lg tracking-[0.1em] uppercase">Preflight Audit · XTREME vs Twilio</h1>
                <p className="text-[12px] text-text-muted mt-1">Reverse-engineered capability matrix with an autonomous prompt-creator at every stage. Twilio benchmark on top, XTREME below. Per-row Auto Fix / Heal / Harden / Validate.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={runAutoPilot} disabled={autoPiloting} className="h-10 px-4 rounded border border-accent-orange/50 text-accent-orange font-display tracking-[0.1em] uppercase text-[12px] flex items-center gap-2 disabled:opacity-60">
                  <Bot className="h-4 w-4" /> {autoPiloting ? "Sweeping…" : "AutoPilot"}
                </button>
                <button onClick={launch} className="h-10 px-5 rounded bg-accent-orange text-base font-display tracking-[0.1em] uppercase text-[12px] flex items-center gap-2">
                  <Rocket className="h-4 w-4" /> Launch
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
              <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col items-center justify-center gap-2">
                <PreflightScoreGauge score={overall} target={100} label="Overall Score" />
                <div className="text-center space-y-0.5">
                  <div className="font-display text-[10px] tracking-[0.1em] uppercase text-text-muted">Coverage {coverageScore}% · Tests {testScore}%</div>
                  <div className="font-display text-[10px] tracking-[0.1em] uppercase text-accent-orange">Gap to 100: {Math.max(0, 100 - overall)}%</div>
                </div>
              </div>
              <PreflightSensory tests={tests} score={overall} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-muted">Autonomous Prompt Creator · Pipeline Stages</span>
              </div>
              <PreflightStages systemSummary={systemSummary} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-muted">Capability Matrix · Twilio (top) vs XTREME (bottom)</span>
                <span className="ml-auto font-display text-[10px] text-text-muted">{capabilities.length} capabilities · {loading ? "loading" : "ready"}</span>
              </div>
              <PreflightMatrix capabilities={capabilities} onResult={onResult} />
            </div>
          </div>
        </div>
      </div>
      <MobileNav view={mobileView} setView={setMobileView} />
    </div>
  );
}
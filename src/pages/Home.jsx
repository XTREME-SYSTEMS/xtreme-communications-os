import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ScanLine } from "lucide-react";
import SystemDock from "@/components/xtreme/SystemDock";
import StatusStrip from "@/components/xtreme/StatusStrip";
import Dispatcher from "@/components/xtreme/Dispatcher";
import ParityMatrix from "@/components/xtreme/ParityMatrix";
import BuildQueue from "@/components/xtreme/BuildQueue";
import EngineTelemetry from "@/components/xtreme/EngineTelemetry";
import ProviderBusLogs from "@/components/xtreme/ProviderBusLogs";
import AuditPanel from "@/components/xtreme/AuditPanel";
import MobileNav from "@/components/xtreme/MobileNav";

export default function Home() {
  const { toast } = useToast();
  const [activeNode, setActiveNode] = useState("Vision Cortex");
  const [mobileView, setMobileView] = useState("dispatch");
  const [capabilities, setCapabilities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [engines, setEngines] = useState([]);
  const [findings, setFindings] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  const load = useCallback(async () => {
    const [caps, tks, eng, fnd, tst] = await Promise.all([
      base44.entities.Capability.list("-created_date", 200),
      base44.entities.BuildQueueTask.list("-created_date", 50),
      base44.entities.EngineStatus.list("-created_date", 50),
      base44.entities.AuditFinding.list("-created_date", 50),
      base44.entities.TestResult.list("-created_date", 200),
    ]);
    setCapabilities(caps); setTasks(tks); setEngines(eng); setFindings(fnd); setTests(tst);
    setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const engineState = Object.fromEntries(engines.map(e => [e.engine_name, e]));
  const liveCount = capabilities.filter(c => c.status === "LIVE" || c.status === "PROVIDER-BACKED").length;
  const parityPct = capabilities.length ? Math.round((liveCount / capabilities.length) * 100) : 0;
  const passCount = tests.filter(t => t.status === "pass").length;
  const queueCount = tasks.filter(t => t.status !== "done").length;
  const activeCount = tasks.filter(t => t.status === "in_progress").length;

  const runAudit = async () => {
    setAuditing(true);
    try {
      const res = await base44.functions.invoke("runAutonomousAudit", {
        capabilities: capabilities.map(c => ({ name: c.name, category: c.category, status: c.status, coverage_pct: c.coverage_pct })),
      });
      const data = res.data || res;
      const newFindings = data.findings || [];
      const newTasks = data.tasks || [];
      if (newFindings.length) await base44.entities.AuditFinding.bulkCreate(newFindings.map(f => ({
        severity: f.severity || "high", area: f.area, finding: f.finding, recommendation: f.recommendation || "", status: "open",
      })));
      if (newTasks.length) await base44.entities.BuildQueueTask.bulkCreate(newTasks.map(t => ({
        title: t.title, capability: t.capability || "", status: "queued", priority: t.priority || "high",
        assigned_engine: t.assigned_engine || "AutoBuilder", notes: t.notes || "",
      })));
      toast({ title: "Autonomous audit complete", description: `${newFindings.length} findings · ${newTasks.length} tasks queued` });
      await load();
    } catch (e) {
      toast({ title: "Audit failed", description: String(e.message || e), variant: "destructive" });
    } finally { setAuditing(false); }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-text-primary">
      <SystemDock activeNode={activeNode} onSelect={setActiveNode} engineState={engineState} />
      <div className="flex-1 flex flex-col min-w-0">
        <StatusStrip parityPct={parityPct} healthPass={passCount} healthTotal={tests.length} queueCount={queueCount} activeCount={activeCount} onAudit={runAudit} auditing={auditing} />
        <div className="flex-1 overflow-y-auto scrollbar-thin grid-hairline">
          <div className="hidden lg:block p-4 space-y-4">
            <Dispatcher />
            <div className="grid grid-cols-[3fr_2fr] gap-4">
              <div className="space-y-4">
                <ParityMatrix capabilities={capabilities} tests={tests} audits={findings} loading={loading} />
                <BuildQueue tasks={tasks} loading={loading} onMutate={load} />
              </div>
              <div className="space-y-4">
                <EngineTelemetry engines={engines} />
                <AuditPanel findings={findings} />
              </div>
            </div>
            <ProviderBusLogs />
          </div>

          <div className="lg:hidden p-3 pb-20 space-y-3">
            {mobileView === "dispatch" && (
              <>
                <div className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
                    <span className="font-display text-[11px] tracking-[0.15em] uppercase">Health Beacon</span>
                    <span className="ml-auto font-display text-[11px] text-accent-orange">{parityPct}% PARITY</span>
                  </div>
                  <button onClick={runAudit} disabled={auditing}
                    className="w-full h-12 rounded bg-accent-orange text-base font-display tracking-[0.1em] uppercase text-[12px] flex items-center justify-center gap-2 disabled:opacity-60">
                    <ScanLine className="h-4 w-4" /> {auditing ? "Auditing…" : "Trigger Autonomous Audit & Build"}
                  </button>
                </div>
                <Dispatcher />
                <ProviderBusLogs />
              </>
            )}
            {mobileView === "parity" && (
              <>
                <ParityMatrix capabilities={capabilities} tests={tests} audits={findings} loading={loading} />
                <BuildQueue tasks={tasks} loading={loading} onMutate={load} />
              </>
            )}
            {mobileView === "audit" && (
              <>
                <EngineTelemetry engines={engines} />
                <AuditPanel findings={findings} />
              </>
            )}
          </div>
        </div>
      </div>
      <MobileNav view={mobileView} setView={setMobileView} />
    </div>
  );
}
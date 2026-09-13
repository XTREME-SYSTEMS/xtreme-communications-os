import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import VisionCortexChat from "@/components/fabric/VisionCortexChat";
import {
  Brain, Shield, Activity, Rocket, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, Zap, Clock, TrendingUp, Users, FileText,
  AlertCircle, ChevronRight, Gauge
} from "lucide-react";

export default function XtremeFabric() {
  const [fleet, setFleet] = useState(null);
  const [systems, setSystems] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("command");
  const [runningCycle, setRunningCycle] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fleetRes, sysList, repList, apprList, incList, benchList] = await Promise.all([
        base44.functions.invoke("fleetAlphaPrime", { action: "fleet_cycle" }).catch(() => ({ data: {} })),
        base44.entities.XtremeSystem.list('-updated_date', 50).catch(() => []),
        base44.entities.RepairPacket.filter({ status: 'pending' }).catch(() => []),
        base44.entities.ApprovalRequest.filter({ status: 'pending' }).catch(() => []),
        base44.entities.IncidentRecord.filter({ status: 'active' }).catch(() => []),
        base44.entities.BenchmarkResult.list('-created_date', 50).catch(() => []),
      ]);
      setFleet(fleetRes?.data || null);
      setSystems(sysList || []);
      setRepairs(repList || []);
      setApprovals(apprList || []);
      setIncidents(incList || []);
      setBenchmarks(benchList || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCycle = async () => {
    setRunningCycle(true);
    try {
      await base44.functions.invoke("fleetAlphaPrime", { action: "fleet_cycle" });
      await load();
    } catch (e) { console.error(e); }
    setRunningCycle(false);
  };

  const runBenchmarks = async (systemId) => {
    try {
      await base44.functions.invoke("benchmarkEngine", { action: "run_benchmarks", system_id: systemId });
      await load();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-accent-orange" /></div>;
  }

  const fleetData = fleet || {};
  const TABS = [
    { key: "command", label: "Command", icon: Brain },
    { key: "fleet", label: "Fleet", icon: Shield },
    { key: "systems", label: "Systems", icon: Rocket },
    { key: "benchmarks", label: "Benchmarks", icon: Gauge },
    { key: "repairs", label: "Repairs", icon: AlertTriangle },
    { key: "approvals", label: "Approvals", icon: CheckCircle2 },
    { key: "incidents", label: "Incidents", icon: AlertCircle },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent-orange" />
            XTREME Operating Fabric
          </h1>
          <p className="text-xs text-muted-foreground">Universal autonomous operating fabric — Shadow Vision Cortex + Fleet Alpha Prime</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            fleetData.fleet_status === 'healthy' ? 'bg-status-green/10 text-status-green' :
            fleetData.fleet_status === 'degraded' ? 'bg-chart-4/10 text-chart-4' :
            'bg-destructive/10 text-destructive')}>
            <div className={cn("w-1.5 h-1.5 rounded-full",
              fleetData.fleet_status === 'healthy' ? 'bg-status-green' :
              fleetData.fleet_status === 'degraded' ? 'bg-chart-4' : 'bg-destructive')} />
            {fleetData.fleet_status || 'unknown'}
          </div>
          <button onClick={runCycle} disabled={runningCycle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-50">
            {runningCycle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {runningCycle ? "Running..." : "Run Cycle"}
          </button>
        </div>
      </div>

      {/* Fleet stats bar */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 px-4 py-2 border-b border-border bg-card/50 shrink-0">
        {[
          { label: "Systems", value: fleetData.systems_total || 0, icon: Rocket },
          { label: "Verified", value: fleetData.systems_verified_100 || 0, icon: CheckCircle2, color: "text-status-green" },
          { label: "Sprint", value: fleetData.systems_in_sprint || 0, icon: Zap, color: "text-accent-orange" },
          { label: "Degraded", value: fleetData.systems_degraded || 0, icon: AlertTriangle, color: "text-chart-4" },
          { label: "P0", value: fleetData.p0 || 0, icon: AlertCircle, color: fleetData.p0 > 0 ? "text-destructive" : "" },
          { label: "P1", value: fleetData.p1 || 0, icon: AlertTriangle, color: fleetData.p1 > 0 ? "text-chart-4" : "" },
          { label: "Repairs", value: fleetData.active_repairs || 0, icon: AlertTriangle },
          { label: "Approvals", value: fleetData.pending_approvals || 0, icon: CheckCircle2, color: fleetData.pending_approvals > 0 ? "text-accent-orange" : "" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <s.icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", s.color || "text-muted-foreground")} />
            <p className="text-sm font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border overflow-x-auto scrollbar-thin shrink-0">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key ? "bg-accent-orange/10 text-accent-orange" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
            {tab.key === "approvals" && approvals.length > 0 && (
              <span className="ml-1 text-[9px] px-1 rounded-full bg-accent-orange/20 text-accent-orange">{approvals.length}</span>
            )}
            {tab.key === "repairs" && repairs.length > 0 && (
              <span className="ml-1 text-[9px] px-1 rounded-full bg-chart-4/20 text-chart-4">{repairs.length}</span>
            )}
            {tab.key === "incidents" && incidents.length > 0 && (
              <span className="ml-1 text-[9px] px-1 rounded-full bg-destructive/20 text-destructive">{incidents.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* COMMAND tab */}
        {activeTab === "command" && (
          <div className="h-full">
            <VisionCortexChat />
          </div>
        )}

        {/* FLEET tab */}
        {activeTab === "fleet" && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4">
            {fleetData.actions_taken?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-orange" /> Last Cycle Actions
                </h3>
                <div className="space-y-1">
                  {fleetData.actions_taken.map((a, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" /> {a}
                    </div>
                  ))}
                </div>
                {fleetData.next_action && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3 text-accent-orange" /> <span className="font-medium">Next:</span> {fleetData.next_action}
                  </div>
                )}
              </div>
            )}

            {fleetData.closest_to_launch?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-status-green" /> Closest to Launch
                </h3>
                <div className="space-y-2">
                  {fleetData.closest_to_launch.map(s => (
                    <div key={s.system_id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{s.system_id}</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.mode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-accent-orange">{s.distance}</p>
                        <p className="text-[10px] text-muted-foreground">to 100</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Fleet Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Total Systems:</span> <span className="font-medium text-foreground">{fleetData.systems_total || 0}</span></div>
                <div><span className="text-muted-foreground">Verified 100:</span> <span className="font-medium text-status-green">{fleetData.systems_verified_100 || 0}</span></div>
                <div><span className="text-muted-foreground">In Sprint:</span> <span className="font-medium text-accent-orange">{fleetData.systems_in_sprint || 0}</span></div>
                <div><span className="text-muted-foreground">Degraded:</span> <span className="font-medium text-chart-4">{fleetData.systems_degraded || 0}</span></div>
                <div><span className="text-muted-foreground">Active Repairs:</span> <span className="font-medium text-foreground">{fleetData.active_repairs || 0}</span></div>
                <div><span className="text-muted-foreground">Pending Approvals:</span> <span className="font-medium text-foreground">{fleetData.pending_approvals || 0}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEMS tab */}
        {activeTab === "systems" && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-2">
            {systems.length === 0 ? (
              <div className="text-center py-12">
                <Rocket className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No systems registered yet.</p>
                <p className="text-xs text-muted-foreground mt-1">The fabric is ready — register your first system to begin.</p>
              </div>
            ) : (
              systems.map(sys => (
                <div key={sys.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      sys.lifecycle_mode === 'preservation' ? 'bg-status-green/10' :
                      sys.lifecycle_mode === 'completion_sprint' ? 'bg-accent-orange/10' :
                      sys.lifecycle_mode === 'degraded' ? 'bg-chart-4/10' : 'bg-muted')}>
                      <Rocket className={cn("h-5 w-5",
                        sys.lifecycle_mode === 'preservation' ? 'text-status-green' :
                        sys.lifecycle_mode === 'completion_sprint' ? 'text-accent-orange' :
                        sys.lifecycle_mode === 'degraded' ? 'text-chart-4' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{sys.name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">{sys.system_id}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full capitalize",
                          sys.lifecycle_mode === 'preservation' ? 'bg-status-green/10 text-status-green' :
                          sys.lifecycle_mode === 'completion_sprint' ? 'bg-accent-orange/10 text-accent-orange' :
                          sys.lifecycle_mode === 'degraded' ? 'bg-chart-4/10 text-chart-4' : 'bg-muted text-muted-foreground')}>
                          {sys.lifecycle_mode?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{sys.description || sys.business_purpose || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {sys.verified_score || 0}/100</span>
                        <span className="flex items-center gap-1 text-accent-orange">↓{sys.distance_to_100 || 100}</span>
                        {sys.p0_count > 0 && <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> P0:{sys.p0_count}</span>}
                        {sys.p1_count > 0 && <span className="flex items-center gap-1 text-chart-4"><AlertTriangle className="h-3 w-3" /> P1:{sys.p1_count}</span>}
                      </div>
                    </div>
                    <button onClick={() => runBenchmarks(sys.system_id)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-accent text-foreground transition-colors shrink-0">
                      Run Benchmarks
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BENCHMARKS tab */}
        {activeTab === "benchmarks" && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-2">
            {benchmarks.length === 0 ? (
              <div className="text-center py-12">
                <Gauge className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No benchmark results yet. Run benchmarks from the Systems tab.</p>
              </div>
            ) : (
              benchmarks.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className={cn("w-2 h-2 rounded-full shrink-0",
                    b.status === 'pass' ? 'bg-status-green' :
                    b.status === 'fail' ? 'bg-destructive' : 'bg-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.test_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{b.benchmark_id} • {b.system_id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full uppercase",
                      b.severity === 'p0' ? 'bg-destructive/10 text-destructive' :
                      b.severity === 'p1' ? 'bg-chart-4/10 text-chart-4' : 'bg-muted text-muted-foreground')}>
                      {b.severity}
                    </span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
                      b.status === 'pass' ? 'bg-status-green/10 text-status-green' :
                      b.status === 'fail' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* REPAIRS tab */}
        {activeTab === "repairs" && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-2">
            {repairs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-status-green mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No pending repairs. Fleet is stable.</p>
              </div>
            ) : (
              repairs.map(r => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      r.priority === 'p0' ? 'bg-destructive/10' : r.priority === 'p1' ? 'bg-chart-4/10' : 'bg-muted')}>
                      <AlertTriangle className={cn("h-4 w-4",
                        r.priority === 'p0' ? 'text-destructive' : r.priority === 'p1' ? 'text-chart-4' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.finding}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.system_id} • {r.benchmark_id}</p>
                      {r.proposed_fix && <p className="text-xs text-foreground mt-2 bg-muted rounded p-2">{r.proposed_fix}</p>}
                      {r.root_cause && <p className="text-[10px] text-muted-foreground mt-1">Root cause: {r.root_cause}</p>}
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full shrink-0",
                      r.priority === 'p0' ? 'bg-destructive/10 text-destructive' :
                      r.priority === 'p1' ? 'bg-chart-4/10 text-chart-4' : 'bg-muted text-muted-foreground')}>
                      {r.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* APPROVALS tab */}
        {activeTab === "approvals" && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-2">
            {approvals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-status-green mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No pending approvals. Autonomous operation proceeding.</p>
              </div>
            ) : (
              approvals.map(a => (
                <div key={a.id} className="rounded-xl border border-accent-orange/30 bg-accent-orange/5 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-accent-orange shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.system_id} • {a.action_type?.replace(/_/g, ' ')} • Risk: {a.risk_level}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="px-3 py-1.5 rounded-lg text-xs bg-status-green/10 text-status-green hover:bg-status-green/20 transition-colors">
                        Approve
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* INCIDENTS tab */}
        {activeTab === "incidents" && (
          <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-2">
            {incidents.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-status-green mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No active incidents. All systems operational.</p>
              </div>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className={cn("h-5 w-5 shrink-0 mt-0.5",
                      inc.severity === 'p0' ? 'text-destructive' : 'text-chart-4')} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{inc.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {inc.system_id} • Severity: {inc.severity?.toUpperCase()} • Status: {inc.status}
                      </p>
                      {inc.evidence && <p className="text-xs text-muted-foreground mt-2 bg-muted rounded p-2">{inc.evidence}</p>}
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full shrink-0",
                      inc.severity === 'p0' ? 'bg-destructive/10 text-destructive' : 'bg-chart-4/10 text-chart-4')}>
                      {inc.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
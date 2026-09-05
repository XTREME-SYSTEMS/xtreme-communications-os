import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Scale, ShieldAlert, CheckCircle2 } from "lucide-react";
import ParityMatrix from "@/components/xtreme/ParityMatrix";
import ThemeToggle from "@/components/xtreme/ThemeToggle";

export default function ParityComparison() {
  const [capabilities, setCapabilities] = useState([]);
  const [tests, setTests] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, t, a] = await Promise.all([
      base44.entities.Capability.list("-coverage_pct", 200),
      base44.entities.TestResult.list("-created_date", 500),
      base44.entities.TwilioVulnerabilityAudit.list("-created_date", 100),
    ]);
    setCapabilities(c); setTests(t); setAudits(a); setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const passCount = tests.filter((t) => t.status === "pass").length;
  const auditCount = audits.length;

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-surface/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Parity Comparison</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">XTREME COMMUNICATIONS vs Twilio · {capabilities.length} capabilities · {passCount} passing tests</span>
        </div>
        <div className="ml-auto w-32"><ThemeToggle /></div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-surface-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Capabilities" value={capabilities.length} icon={Scale} />
            <StatCard label="Passing Tests" value={passCount} icon={CheckCircle2} accent="text-status-green" />
            <StatCard label="Twilio Vulnerabilities" value={auditCount} icon={ShieldAlert} accent="text-destructive" />
            <StatCard label="Parity Coverage" value={`${Math.round(capabilities.reduce((s, c) => s + (c.coverage_pct || 0), 0) / Math.max(capabilities.length, 1))}%`} icon={Scale} accent="text-primary" />
          </div>
          <ParityMatrix capabilities={capabilities} tests={tests} audits={audits} />
          {audits.length > 0 && (
            <div className="rounded-lg border border-surface-border bg-surface">
              <div className="px-4 h-11 flex items-center gap-2 border-b border-surface-border">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span className="font-display text-[11px] tracking-[0.15em] uppercase">Twilio Vulnerability Audit</span>
                <span className="ml-auto text-[10px] text-text-muted font-display">{audits.length} findings</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {audits.map((a, i) => (
                  <div key={a.id || i} className="px-4 py-3 border-b border-surface-border">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-text-primary font-medium">{a.area}</span>
                      <span className="text-[9px] font-display uppercase px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{a.vulnerability_class}</span>
                      <span className="text-[9px] font-display uppercase px-1.5 py-0.5 rounded bg-surface border border-surface-border text-text-muted">{a.severity}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">{a.twilio_behavior}</p>
                    {a.xcomm_bypass && (
                      <p className="mt-1 text-[11px] text-status-green"><span className="font-display uppercase text-[9px] tracking-wider">XCOM Bypass:</span> {a.xcomm_bypass}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className={`h-3.5 w-3.5 ${accent || ""}`} />
        <span className="text-[9px] font-display uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-1 text-xl font-display font-bold ${accent || "text-text-primary"}`}>{value}</div>
    </div>
  );
}
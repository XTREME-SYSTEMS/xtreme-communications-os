import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  Shield, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw,
  Gauge, FileText, Calendar, ArrowRight, TrendingUp
} from "lucide-react";

export default function TwilioParityMatrix() {
  const [capabilities, setCapabilities] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [caps, bmarks, systems] = await Promise.all([
        base44.entities.Capability.list('-created_date', 200).catch(() => []),
        base44.entities.BenchmarkResult.list('-created_date', 200).catch(() => []),
        base44.entities.XtremeSystem.filter({ system_id: 'xtreme-comms' }).catch(() => []),
      ]);
      setCapabilities(caps || []);
      setBenchmarks(bmarks || []);
      setSystem(systems?.[0] || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Map benchmark results by test_name for quick lookup
  const benchmarkMap = {};
  for (const b of benchmarks) {
    benchmarkMap[b.test_name] = b;
  }

  // Twilio capability categories for comparison
  const twilioCategories = [
    { name: "Programmable Messaging (SMS)", twilio: "GA", critical: true },
    { name: "Programmable Messaging (MMS)", twilio: "GA", critical: true },
    { name: "Programmable Voice", twilio: "GA", critical: true },
    { name: "WhatsApp Business API", twilio: "GA", critical: true },
    { name: "SIP Trunking", twilio: "GA", critical: true },
    { name: "Phone Number Management", twilio: "GA", critical: true },
    { name: "A2P 10DLC Registration", twilio: "GA", critical: true },
    { name: "Toll-Free Verification", twilio: "GA", critical: true },
    { name: "Verify (OTP/2FA)", twilio: "GA", critical: false },
    { name: "Lookup API", twilio: "GA", critical: false },
    { name: "Voice Intelligence (Transcription)", twilio: "GA", critical: true },
    { name: "TaskRouter (Contact Center)", twilio: "GA", critical: true },
    { name: "Studio (Flow Builder)", twilio: "GA", critical: false },
    { name: "Conversations (SMS Chat)", twilio: "GA", critical: false },
    { name: "Webhooks & Signing", twilio: "GA", critical: true },
    { name: "Usage & Billing", twilio: "GA", critical: true },
    { name: "RCS Business Messaging", twilio: "Beta", critical: false },
    { name: "Email (SendGrid)", twilio: "GA", critical: false },
  ];

  // Match capabilities to twilio categories
  const matchCap = (catName) => {
    const lower = catName.toLowerCase();
    return capabilities.find(c => {
      const cn = (c.name || '').toLowerCase();
      if (lower.includes('sms') && cn.includes('sms') && !cn.includes('mms')) return true;
      if (lower.includes('mms') && cn.includes('mms')) return true;
      if (lower.includes('voice') && cn.includes('voice')) return true;
      if (lower.includes('whatsapp') && cn.includes('whatsapp')) return true;
      if (lower.includes('sip') && cn.includes('sip')) return true;
      if (lower.includes('phone number') && (cn.includes('number') || cn.includes('phone'))) return true;
      if (lower.includes('10dlc') && cn.includes('10dlc')) return true;
      if (lower.includes('toll-free') && cn.includes('toll')) return true;
      if (lower.includes('verify') && cn.includes('verify')) return true;
      if (lower.includes('lookup') && cn.includes('lookup')) return true;
      if (lower.includes('transcription') && (cn.includes('transcri') || cn.includes('whisper'))) return true;
      if (lower.includes('contact center') && (cn.includes('contact center') || cn.includes('routing'))) return true;
      if (lower.includes('studio') && cn.includes('flow')) return true;
      if (lower.includes('conversations') && cn.includes('conversation')) return true;
      if (lower.includes('webhook') && cn.includes('webhook')) return true;
      if (lower.includes('usage') && (cn.includes('usage') || cn.includes('billing'))) return true;
      if (lower.includes('rcs') && cn.includes('rcs')) return true;
      if (lower.includes('email') && cn.includes('email')) return true;
      return false;
    });
  };

  const matrix = twilioCategories.map(cat => {
    const cap = matchCap(cat.name);
    const benchmark = cap ? benchmarkMap[cap.name] : null;
    return {
      ...cat,
      xtremeCap: cap,
      auditedStatus: benchmark?.status || 'unknown',
      observed: benchmark?.observed || 'No benchmark data',
      severity: benchmark?.severity || 'p2',
    };
  });

  const filtered = filter === "all" ? matrix :
    filter === "pass" ? matrix.filter(m => m.auditedStatus === 'pass') :
    filter === "fail" ? matrix.filter(m => m.auditedStatus === 'fail') :
    filter === "unknown" ? matrix.filter(m => m.auditedStatus === 'unknown') :
    filter === "critical" ? matrix.filter(m => m.critical) : matrix;

  const parityScore = Math.round((matrix.filter(m => m.auditedStatus === 'pass').length / matrix.length) * 100);
  const criticalPass = matrix.filter(m => m.critical && m.auditedStatus === 'pass').length;
  const criticalTotal = matrix.filter(m => m.critical).length;

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-accent-orange" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent-orange" />
            Twilio Parity Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Dated: {new Date().toISOString().split('T')[0]} • Evidence-based forensic audit
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-accent transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <Gauge className="h-5 w-5 text-accent-orange" />
            <span className="text-xs text-muted-foreground">Overall</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{parityScore}%</p>
          <p className="text-xs text-muted-foreground">Feature Parity</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-5 w-5 text-status-green" />
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{criticalPass}/{criticalTotal}</p>
          <p className="text-xs text-muted-foreground">Critical Pass</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-5 w-5 text-status-green" />
            <span className="text-xs text-muted-foreground">Pass</span>
          </div>
          <p className="text-2xl font-display font-bold text-status-green">{matrix.filter(m => m.auditedStatus === 'pass').length}</p>
          <p className="text-xs text-muted-foreground">Capabilities</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="h-5 w-5 text-chart-4" />
            <span className="text-xs text-muted-foreground">Gaps</span>
          </div>
          <p className="text-2xl font-display font-bold text-chart-4">
            {matrix.filter(m => m.auditedStatus === 'fail').length + matrix.filter(m => m.auditedStatus === 'unknown').length}
          </p>
          <p className="text-xs text-muted-foreground">Fail + Unknown</p>
        </div>
      </div>

      {/* System score */}
      {system && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--accent-orange))" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 28 * (system.verified_score || 0) / 100} ${2 * Math.PI * 28}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{system.verified_score || 0}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{system.name}</p>
              <p className="text-xs text-muted-foreground">
                Verified Score: {system.verified_score}/100 • Distance: {system.distance_to_100} • Mode: {system.lifecycle_mode?.replace('_', ' ')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                P0: {system.p0_count} • P1: {system.p1_count} • Last Benchmark: {system.last_benchmark_at ? new Date(system.last_benchmark_at).toLocaleString() : 'never'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin">
        {[
          { key: "all", label: "All", count: matrix.length },
          { key: "critical", label: "Critical", count: criticalTotal },
          { key: "pass", label: "Pass", count: matrix.filter(m => m.auditedStatus === 'pass').length },
          { key: "fail", label: "Fail", count: matrix.filter(m => m.auditedStatus === 'fail').length },
          { key: "unknown", label: "Unknown", count: matrix.filter(m => m.auditedStatus === 'unknown').length },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              filter === f.key ? "bg-accent-orange/10 text-accent-orange" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {f.label} <span className="text-[10px] opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Matrix table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Twilio Capability</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Twilio</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">XTREME</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Evidence</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{row.name}</p>
                      {row.critical && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">CRITICAL</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-mono text-muted-foreground">{row.twilio}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.auditedStatus === 'pass' && <CheckCircle2 className="h-4 w-4 text-status-green mx-auto" />}
                    {row.auditedStatus === 'fail' && <XCircle className="h-4 w-4 text-destructive mx-auto" />}
                    {row.auditedStatus === 'unknown' && <AlertCircle className="h-4 w-4 text-muted-foreground mx-auto" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{row.observed}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-[10px] px-2 py-1 rounded-full uppercase",
                      row.severity === 'p0' ? 'bg-destructive/10 text-destructive' :
                      row.severity === 'p1' ? 'bg-chart-4/10 text-chart-4' : 'bg-muted text-muted-foreground')}>
                      {row.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-status-green" /> Pass = Runtime evidence verified</span>
        <span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-destructive" /> Fail = No runtime evidence</span>
        <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-muted-foreground" /> Unknown = Self-reported, no evidence</span>
      </div>
    </div>
  );
}
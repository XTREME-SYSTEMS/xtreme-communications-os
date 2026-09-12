import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Phone, MessageSquare,
  MessageCircle, Mail, Bot, Monitor, RefreshCw, Play, Loader2,
  Activity, FileWarning, Wrench, ChevronDown, ChevronRight, Zap
} from "lucide-react";

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", label: "CRITICAL" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", label: "HIGH" },
  medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-500", label: "MEDIUM" },
  low: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", label: "LOW" },
  info: { bg: "bg-status-green/10", border: "border-status-green/30", text: "text-status-green", label: "INFO" },
};

const STATUS_ICONS = {
  open: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  remediated: <CheckCircle2 className="h-4 w-4 text-status-green" />,
  accepted: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  wont_fix: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

export default function SystemAudit() {
  const [audit, setAudit] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testingNumber, setTestingNumber] = useState(null);
  const [fixingProfiles, setFixingProfiles] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState(null);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    loadApiKey();
    runAudit();
    loadFindings();
  }, []);

  const loadApiKey = async () => {
    try {
      const keys = await base44.entities.ApiKey.filter({ status: "active" });
      setApiKey(keys?.[0]?.key_value || "");
    } catch (e) { console.error(e); }
  };

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("systemAudit", {
        api_key: apiKey, action: "full_audit",
      });
      setAudit(res?.data || res);
      // Reload findings after audit
      setTimeout(() => loadFindings(), 1000);
    } catch (e) {
      console.error("Audit failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadFindings = async () => {
    try {
      const res = await base44.functions.invoke("systemAudit", {
        api_key: apiKey, action: "get_findings",
      });
      setFindings(res?.data?.findings || res?.findings || []);
    } catch (e) { console.error(e); }
  };

  const testSms = async (fromNumber) => {
    setTestingNumber(fromNumber);
    try {
      const res = await base44.functions.invoke("systemAudit", {
        api_key: apiKey, action: "test_sms", from_number: fromNumber,
      });
      // Re-run audit to update
      setTimeout(() => runAudit(), 2000);
    } catch (e) { console.error(e); }
    finally { setTestingNumber(null); }
  };

  const fixProfiles = async () => {
    setFixingProfiles(true);
    try {
      await base44.functions.invoke("systemAudit", {
        api_key: apiKey, action: "fix_messaging_profiles",
      });
      setTimeout(() => runAudit(), 2000);
    } catch (e) { console.error(e); }
    finally { setFixingProfiles(false); }
  };

  const updateFindingStatus = async (findingId, status) => {
    try {
      await base44.functions.invoke("systemAudit", {
        api_key: apiKey, action: "update_finding",
        finding_id: findingId, status,
      });
      loadFindings();
    } catch (e) { console.error(e); }
  };

  const summary = audit?.summary || {};
  const channelStatus = audit?.channel_status || {};
  const deliveryTests = audit?.delivery_tests || [];
  const telnyxNumbers = audit?.telnyx?.numbers || [];
  const twilioNumbers = audit?.twilio?.numbers || [];
  const tenDLCBrands = audit?.telnyx?.tenDLC_brands || [];
  const openFindings = findings.filter(f => f.status === "open");
  const criticalFindings = openFindings.filter(f => f.severity === "critical");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent-orange" />
            System Audit Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end audit of all carriers, numbers, channels, and delivery paths
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fixProfiles}
            disabled={fixingProfiles}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
          >
            {fixingProfiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Fix Profiles
          </button>
          <button
            onClick={runAudit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? "Auditing..." : "Run Full Audit"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Numbers" value={summary.total_numbers || 0} icon={Phone} color="text-blue-500" bg="bg-blue-500/10" />
        <SummaryCard label="Working SMS" value={summary.working_numbers || 0} icon={CheckCircle2} color="text-status-green" bg="bg-status-green/10" />
        <SummaryCard label="Blocked" value={summary.blocked_numbers || 0} icon={XCircle} color="text-red-500" bg="bg-red-500/10" />
        <SummaryCard label="Open Issues" value={summary.issues || 0} icon={AlertTriangle} color="text-orange-500" bg="bg-orange-500/10" />
        <SummaryCard label="Critical" value={summary.critical_issues || 0} icon={FileWarning} color="text-red-500" bg="bg-red-500/10" />
      </div>

      {/* Channel Status */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-orange" />
          Channel Readiness
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <ChannelBadge label="Voice" live={channelStatus.voice} icon={Phone} />
          <ChannelBadge label="SMS" live={channelStatus.sms} icon={MessageSquare} />
          <ChannelBadge label="MMS" live={channelStatus.sms} icon={MessageSquare} />
          <ChannelBadge label="WhatsApp" live={channelStatus.whatsapp} icon={MessageCircle} />
          <ChannelBadge label="Email" live={channelStatus.email} icon={Mail} />
          <ChannelBadge label="AI Gateway" live={channelStatus.ai_gateway} icon={Bot} />
          <ChannelBadge label="Cloud Browser" live={channelStatus.cloud_browser} icon={Monitor} />
        </div>
      </div>

      {/* Critical Issues Banner */}
      {criticalFindings.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" />
            {criticalFindings.length} Critical Issue{criticalFindings.length > 1 ? "s" : ""} Requiring Immediate Action
          </h3>
          <div className="space-y-2">
            {criticalFindings.map((f, i) => (
              <div key={f.id || i} className="flex items-start gap-2 text-sm">
                <span className="text-red-500 mt-0.5">•</span>
                <div>
                  <p className="text-foreground">{f.finding}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">→ {f.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telnyx Numbers + Delivery Tests */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-blue-500" />
          Telnyx Numbers — SMS Delivery Tests
        </h3>
        <div className="space-y-2">
          {telnyxNumbers.map((num, i) => {
            const test = deliveryTests.find(t => t.from === num.phone_number);
            const delivered = test?.delivered;
            const failed = test?.accepted && !test?.delivered && test?.delivery_status !== "queued";
            const noProfile = !num.messaging_profile_id;
            return (
              <div key={i} className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-lg border",
                delivered ? "bg-status-green/5 border-status-green/20" :
                failed ? "bg-red-500/5 border-red-500/20" :
                noProfile ? "bg-orange-500/5 border-orange-500/20" :
                "bg-muted/30 border-border"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    delivered ? "bg-status-green/10" : failed ? "bg-red-500/10" : "bg-muted"
                  )}>
                    {delivered ? <CheckCircle2 className="h-4 w-4 text-status-green" /> :
                     failed ? <XCircle className="h-4 w-4 text-red-500" /> :
                     <Phone className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium text-foreground">{num.phone_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {noProfile ? "⚠ No messaging profile" :
                       delivered ? `✅ Delivered to ${test?.to}` :
                       failed ? `❌ ${test?.delivery_status} (error ${test?.error_code})` :
                       test?.status === "skipped" ? "Skipped — no profile" :
                       "Queued..."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded font-mono",
                    num.phone_number?.startsWith("+1833") || num.phone_number?.startsWith("+1800") || num.phone_number?.startsWith("+1888")
                      ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {num.phone_number?.startsWith("+1833") || num.phone_number?.startsWith("+1800") || num.phone_number?.startsWith("+1888") ? "TOLL-FREE" : "LOCAL"}
                  </span>
                  <button
                    onClick={() => testSms(num.phone_number)}
                    disabled={testingNumber === num.phone_number || noProfile}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {testingNumber === num.phone_number ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Test
                  </button>
                </div>
              </div>
            );
          })}
          {telnyxNumbers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No Telnyx numbers found</p>
          )}
        </div>
      </div>

      {/* Twilio Numbers */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-red-500" />
          Twilio Numbers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {twilioNumbers.map((num, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <Phone className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-mono font-medium text-foreground">{num.phone_number}</p>
                <p className="text-xs text-muted-foreground">
                  {num.friendly_name} • {num.capabilities?.voice ? "Voice" : ""} {num.capabilities?.sms ? "SMS" : ""} {num.capabilities?.mms ? "MMS" : ""}
                </p>
              </div>
            </div>
          ))}
          {twilioNumbers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No Twilio numbers on this account</p>
          )}
        </div>
      </div>

      {/* 10DLC Brands */}
      {tenDLCBrands.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            10DLC Brand Registration
          </h3>
          <div className="space-y-2">
            {tenDLCBrands.map((brand, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{brand.displayName || brand.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    TCR: {brand.tcrBrandId} • Campaigns: {brand.assignedCampaignsCount}
                  </p>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-1 rounded font-mono",
                  brand.identityStatus === "VERIFIED"
                    ? "bg-status-green/10 text-status-green"
                    : "bg-yellow-500/10 text-yellow-500"
                )}>
                  {brand.identityStatus || "UNKNOWN"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Findings Log */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-accent-orange" />
          Audit Findings Log ({findings.length} total, {openFindings.length} open)
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {findings.map((f, i) => {
            const sev = SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.info;
            const isExpanded = expandedFinding === (f.id || i);
            return (
              <div key={f.id || i} className={cn("rounded-lg border p-3", sev.bg, sev.border)}>
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedFinding(isExpanded ? null : (f.id || i))}
                >
                  <div className="flex items-start gap-2 flex-1">
                    {STATUS_ICONS[f.status] || STATUS_ICONS.open}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded", sev.bg, sev.text)}>
                          {sev.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{f.area}</span>
                      </div>
                      <p className="text-sm text-foreground">{f.finding}</p>
                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Recommendation:</span> {f.recommendation}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">Status:</span>
                            {["open", "remediated", "accepted", "wont_fix"].map(s => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); updateFindingStatus(f.id, s); }}
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded transition-colors",
                                  f.status === s
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                                )}
                              >
                                {s.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </div>
            );
          })}
          {findings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No findings logged yet — run a full audit</p>
          )}
        </div>
      </div>

      {/* Audit Prompt Reference */}
      <div className="rounded-xl border border-accent-orange/30 bg-accent-orange/5 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent-orange" />
          Master Audit Prompt
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          Copy this prompt to trigger a full system audit from any conversation:
        </p>
        <pre className="text-xs font-mono text-foreground bg-muted/50 p-3 rounded-lg overflow-x-auto scrollbar-thin border border-border">
{`EXECUTE FULL SYSTEM AUDIT: Programmatically and systematically audit the entire XTREME Communications OS end-to-end. Using the stored TELNYX_API_KEY and TWILIO_ACCOUNT_SID/AUTH_TOKEN secrets:

1. List all Telnyx numbers, their messaging profiles, 10DLC brand/campaign status, and toll-free verification status
2. List all Twilio numbers and their capabilities
3. Test real SMS delivery from every Telnyx number to +17722090266 (my real Verizon mobile)
4. Check WhatsApp Business setup status for +15559730487
5. Identify all blocked numbers, missing messaging profiles, unverified toll-free numbers, and 10DLC gaps
6. Auto-fix what can be fixed programmatically (messaging profile assignments, 10DLC campaign creation)
7. Log every finding to the AuditFinding entity with severity, area, finding, recommendation, and status
8. Generate a summary: total numbers, working SMS numbers, blocked numbers, open issues, critical issues
9. Provide step-by-step manual remediation for issues that can't be auto-fixed (toll-free verification, 10DLC brand verification)
10. Display results on the /admin/system-audit page for ongoing monitoring

Do not skip any step. Do not use mock data. Report real API responses and real delivery statuses.`}
        </pre>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className={cn("rounded-xl border p-3", bg, "border-border")}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-2xl font-display font-bold", color)}>{value}</p>
    </div>
  );
}

function ChannelBadge({ label, live, icon: Icon }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-3 rounded-lg border",
      live ? "bg-status-green/5 border-status-green/20" : "bg-red-500/5 border-red-500/20"
    )}>
      <Icon className={cn("h-5 w-5", live ? "text-status-green" : "text-red-500")} />
      <span className={cn("text-xs font-medium", live ? "text-status-green" : "text-red-500")}>{label}</span>
      <span className={cn("text-[10px]", live ? "text-status-green/70" : "text-red-500/70")}>
        {live ? "LIVE" : "DOWN"}
      </span>
    </div>
  );
}
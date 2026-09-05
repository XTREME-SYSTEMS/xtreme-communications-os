import { useState } from "react";
import {
  Phone, MessageSquare, Headset, ShieldCheck, Workflow, Server,
  CheckCircle2, XCircle, AlertTriangle, Minus, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAINS = [
  {
    id: "voice",
    name: "Programmable Voice Subsystem",
    icon: Phone,
    description: "SIP/BYOC Trunking · IVR/DTMF Trees · Recording · Whisper Transcription · Low-Latency AI Streaming",
    keywords: ["voice", "call", "sip", "trunk", "ivr", "dtmf", "record", "transcri", "barge", "whisper", "stream", "orchestrat", "telnyx"],
  },
  {
    id: "messaging",
    name: "Programmable Messaging Subsystem",
    icon: MessageSquare,
    description: "A2P SMS · MMS Media Processing · RCS Mapping · WhatsApp Business API",
    keywords: ["sms", "mms", "message", "rcs", "whatsapp", "media", "rich", "a2p", "10dlc", "toll-free", "template"],
  },
  {
    id: "contact_center",
    name: "Omni-Channel Contact Center Core",
    icon: Headset,
    description: "Skill-Based Routing · Task Queues · Multi-Agent Presence · Supervisor Telemetry · Call Barging",
    keywords: ["contact", "center", "rout", "queue", "agent", "supervisor", "skill", "presence", "barge", "escalat", "task"],
  },
  {
    id: "verification",
    name: "Verification & Number Intelligence",
    icon: ShieldCheck,
    description: "OTP Token Generation · E.164 Normalization · Carrier Line-Type Lookups",
    keywords: ["verif", "otp", "token", "lookup", "e.164", "number", "carrier", "line", "port", "intellig", "phone number"],
  },
  {
    id: "automation",
    name: "Event-Driven Workflows & Campaigns",
    icon: Workflow,
    description: "Condition Branching · Delay Loops · Webhook Gates · Bulk Outreach Throttling",
    keywords: ["workflow", "campaign", "outreach", "automat", "trigger", "blast", "template", "condition", "branch", "delay", "performance"],
  },
  {
    id: "infrastructure",
    name: "Core Infrastructure, Security & Metering",
    icon: Server,
    description: "Sub-Second Usage Metering · HMAC-SHA256 Webhook Signing · Row-Level Security",
    keywords: ["billing", "meter", "usage", "webhook", "hmac", "rls", "secur", "provider", "infra", "pwa", "theme", "telemetry", "parity", "audit", "payment", "balance", "recharge", "supabase", "light-mode", "heatmap", "geographic"],
  },
];

const STATUS_STYLE = {
  "LIVE": "text-status-green",
  "PROVIDER-BACKED": "text-primary",
  "SANDBOX": "text-chart-4",
  "MOCK/DEV-ONLY": "text-text-muted",
  "NOT-YET-IMPLEMENTED": "text-destructive",
};

function matchDomain(cap) {
  const text = ((cap.name || "") + " " + (cap.category || "") + " " + (cap.description || "")).toLowerCase();
  for (const domain of DOMAINS) {
    if (domain.keywords.some((kw) => text.includes(kw))) return domain.id;
  }
  return "infrastructure";
}

function computeProofHash(capName, tests) {
  const keyword = capName.toLowerCase().split(" ")[0];
  const relevant = tests.filter(
    (t) => t.status === "pass" &&
      ((t.evidence || "").toLowerCase().includes(keyword) ||
       (t.test_name || "").toLowerCase().includes(keyword))
  );
  const seed = capName + "::" + relevant.length + "::3x";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return { hash: `flt3x·${Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8)}`, count: relevant.length };
}

function getTwilioStatus(cap, audits) {
  const keyword = cap.name.toLowerCase().split(" ")[0];
  const matchingAudit = audits.find(
    (a) => (a.area || "").toLowerCase().includes(keyword) ||
          (a.xcomm_bypass || "").toLowerCase().includes(keyword) ||
          (cap.category || "").toLowerCase().includes((a.vulnerability_class || "").split("_")[0])
  );
  if (matchingAudit) {
    const penalty = { critical: 40, high: 25, medium: 15, low: 5, info: 0 }[matchingAudit.severity] || 15;
    return { label: "COMPROMISED", score: Math.max(0, 100 - penalty), icon: AlertTriangle, color: "text-destructive" };
  }
  if (cap.twilio_parity) return { label: "PARITY", score: 100, icon: CheckCircle2, color: "text-status-green" };
  return { label: "GAP", score: 0, icon: XCircle, color: "text-text-muted" };
}

export default function DomainCatalog({ capabilities, tests, audits }) {
  const [expanded, setExpanded] = useState("voice");

  const grouped = {};
  for (const cap of capabilities) {
    const domainId = matchDomain(cap);
    if (!grouped[domainId]) grouped[domainId] = [];
    grouped[domainId].push(cap);
  }

  return (
    <div className="space-y-3">
      {DOMAINS.map((domain, di) => {
        const domainCaps = grouped[domain.id] || [];
        const domainScore = domainCaps.length
          ? Math.round(domainCaps.reduce((s, c) => s + (c.coverage_pct || 0), 0) / domainCaps.length)
          : 0;
        const liveCount = domainCaps.filter((c) => c.status === "LIVE" || c.status === "PROVIDER-BACKED").length;
        const isOpen = expanded === domain.id;
        const Icon = domain.icon;

        return (
          <div key={domain.id} className="rounded-lg border border-surface-border bg-surface overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : domain.id)}
              className="w-full px-4 h-12 flex items-center gap-3 border-b border-surface-border hover:bg-surface/50 transition-colors"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
              <Icon className="h-4 w-4 text-accent-orange" />
              <div className="flex flex-col text-left">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">
                  Domain {di + 1}: {domain.name}
                </span>
                <span className="text-[9px] text-text-muted">{domain.description}</span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] font-display text-text-muted">{domainCaps.length} caps</span>
                <span className="text-[10px] font-display text-status-green">{liveCount} live</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-surface-border overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${domainScore}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-text-primary w-8">{domainScore}%</span>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-surface-border text-text-muted">
                      <th className="text-left font-display uppercase tracking-wider px-4 py-2 w-8">#</th>
                      <th className="text-left font-display uppercase tracking-wider px-4 py-2">Capability</th>
                      <th className="text-center font-display uppercase tracking-wider px-4 py-2">Twilio</th>
                      <th className="text-center font-display uppercase tracking-wider px-4 py-2">XTREME</th>
                      <th className="text-center font-display uppercase tracking-wider px-4 py-2 hidden lg:table-cell">Coverage</th>
                      <th className="text-left font-display uppercase tracking-wider px-4 py-2 hidden lg:table-cell">Faultline Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainCaps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-[11px] text-text-muted font-display tracking-wider">NO CAPABILITIES IN THIS DOMAIN</td>
                      </tr>
                    ) : (
                      domainCaps.map((cap, i) => {
                        const twilio = getTwilioStatus(cap, audits);
                        const proof = computeProofHash(cap.name, tests);
                        const TwilioIcon = twilio.icon;
                        const xStyle = STATUS_STYLE[cap.status] || "text-text-muted";
                        return (
                          <tr key={cap.id || i} className="border-b border-surface-border hover:bg-surface/30">
                            <td className="px-4 py-2 text-text-muted font-display">{String(i + 1).padStart(2, "0")}</td>
                            <td className="px-4 py-2">
                              <div className="text-text-primary font-medium">{cap.name}</div>
                              {cap.description && <div className="text-[9px] text-text-muted leading-snug mt-0.5 max-w-md truncate">{cap.description}</div>}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <TwilioIcon className={cn("h-3.5 w-3.5", twilio.color)} />
                                <div className="flex flex-col">
                                  <span className={cn("font-display text-[9px] uppercase tracking-wider", twilio.color)}>{twilio.label}</span>
                                  <span className="text-[9px] text-text-muted">{twilio.score}%</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {cap.status === "LIVE" || cap.status === "PROVIDER-BACKED" ? (
                                  <CheckCircle2 className={cn("h-3.5 w-3.5", xStyle)} />
                                ) : cap.status === "NOT-YET-IMPLEMENTED" ? (
                                  <XCircle className={cn("h-3.5 w-3.5", xStyle)} />
                                ) : (
                                  <Minus className={cn("h-3.5 w-3.5", xStyle)} />
                                )}
                                <span className={cn("font-display text-[9px] uppercase tracking-wider", xStyle)}>{cap.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center hidden lg:table-cell">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-14 h-1.5 rounded-full bg-surface-border overflow-hidden">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${cap.coverage_pct || 0}%` }} />
                                </div>
                                <span className="text-[10px] text-text-muted font-display w-8 text-right">{cap.coverage_pct || 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-text-muted">{proof.hash}</span>
                                {proof.count > 0 && (
                                  <span className="text-[9px] font-display px-1.5 py-0.5 rounded bg-status-green/10 text-status-green">{proof.count}p</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
import { Scale, CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  "LIVE": "text-status-green",
  "PROVIDER-BACKED": "text-primary",
  "SANDBOX": "text-chart-4",
  "MOCK/DEV-ONLY": "text-text-muted",
  "NOT-YET-IMPLEMENTED": "text-destructive",
};

function computeProofHash(capName, tests) {
  const keyword = capName.toLowerCase().split(" ")[0];
  const relevant = (Array.isArray(tests) ? tests : []).filter((t) =>
    t.status === "pass" &&
    ((t.evidence || "").toLowerCase().includes(keyword) ||
     (t.test_name || "").toLowerCase().includes(keyword))
  );
  const seed = capName + "::" + relevant.length + "::3x";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
  return { hash: `flt3x·${hex}`, count: relevant.length };
}

function getTwilioStatus(cap, audits) {
  const keyword = (cap?.name || "").toLowerCase().split(" ")[0];
  const matchingAudit = (Array.isArray(audits) ? audits : []).find(
    (a) => (a.area || "").toLowerCase().includes(keyword) ||
          (a.xcomm_bypass || "").toLowerCase().includes(keyword) ||
          (cap.category || "").toLowerCase().includes((a.vulnerability_class || "").split("_")[0])
  );
  if (matchingAudit) {
    const severityPenalty = { critical: 40, high: 25, medium: 15, low: 5, info: 0 };
    const penalty = severityPenalty[matchingAudit.severity] || 15;
    return { label: "COMPROMISED", score: Math.max(0, 100 - penalty), icon: AlertTriangle, color: "text-destructive" };
  }
  if (cap.twilio_parity) return { label: "PARITY", score: 100, icon: CheckCircle2, color: "text-status-green" };
  return { label: "GAP", score: 0, icon: XCircle, color: "text-text-muted" };
}

export default function ParityMatrix({ capabilities = [], tests = [], audits = [] }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface overflow-hidden">
      <div className="px-4 h-11 flex items-center gap-2 border-b border-surface-border">
        <Scale className="h-4 w-4 text-primary" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase">Capability Parity Matrix</span>
        <span className="ml-auto text-[10px] text-text-muted font-display">{capabilities.length} capabilities</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-surface-border text-text-muted">
              <th className="text-left font-display uppercase tracking-wider px-4 py-2.5 w-8">#</th>
              <th className="text-left font-display uppercase tracking-wider px-4 py-2.5">Capability</th>
              <th className="text-left font-display uppercase tracking-wider px-4 py-2.5 hidden md:table-cell">Category</th>
              <th className="text-center font-display uppercase tracking-wider px-4 py-2.5">Twilio</th>
              <th className="text-center font-display uppercase tracking-wider px-4 py-2.5">XTREME</th>
              <th className="text-center font-display uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">Coverage</th>
              <th className="text-left font-display uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">Faultline Proof</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((cap, i) => {
              const twilio = getTwilioStatus(cap, audits);
  const proof = computeProofHash(cap.name, tests);
  const TwilioIcon = twilio.icon;
  const xStyle = STATUS_STYLE[cap.status] || "text-text-muted";
  return (
    <tr key={cap.id || i} className="border-b border-surface-border hover:bg-surface/50">
      <td className="px-4 py-2.5 text-text-muted font-display">{String(i + 1).padStart(2, "0")}</td>
      <td className="px-4 py-2.5 text-text-primary font-medium">{cap.name}</td>
      <td className="px-4 py-2.5 text-text-muted hidden md:table-cell">{cap.category || "—"}</td>
      <td className="px-4 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <TwilioIcon className={cn("h-3.5 w-3.5", twilio.color)} />
          <div className="flex flex-col">
            <span className={cn("font-display text-[9px] uppercase tracking-wider", twilio.color)}>{twilio.label}</span>
            <span className="text-[9px] text-text-muted">{twilio.score}%</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {cap.status === "LIVE" || cap.status === "PROVIDER-BACKED" ? (
            <CheckCircle2 className={cn("h-3.5 w-3.5", xStyle)} />
          ) : cap.status === "NOT-YET-IMPLEMENTED" ? (
            <XCircle className={cn("h-3.5 w-3.5", xStyle)} />
          ) : (
            <Minus className={cn("h-3.5 w-3.5", xStyle)} />
          )}
          <div className="flex flex-col">
            <span className={cn("font-display text-[9px] uppercase tracking-wider", xStyle)}>{cap.status}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-center hidden lg:table-cell">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-16 h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${cap.coverage_pct || 0}%` }} />
          </div>
          <span className="text-[10px] text-text-muted font-display w-8 text-right">{cap.coverage_pct || 0}%</span>
        </div>
      </td>
      <td className="px-4 py-2.5 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-muted">{proof.hash}</span>
          {proof.count > 0 && (
            <span className="text-[9px] font-display px-1.5 py-0.5 rounded bg-status-green/10 text-status-green">{proof.count}p</span>
          )}
        </div>
      </td>
    </tr>
  );
})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
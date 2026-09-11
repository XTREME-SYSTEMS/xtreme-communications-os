import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Phone, PhoneCall, Loader2, CheckCircle2, XCircle, Circle, Volume2, ArrowRight, Radio, MessageSquare, MessageCircle, Bot, ShieldCheck, Zap } from "lucide-react";

// Workflow stage definitions — each maps to phone number entity fields
const STAGES = [
  { id: "purchased", label: "Number Purchased", icon: Zap, desc: "Acquired from carrier provider" },
  { id: "provisioned", label: "Provisioned to Account", icon: ShieldCheck, desc: "Assigned to your tenant and ready for config" },
  { id: "voice", label: "Voice Configured", icon: PhoneCall, desc: "AI voice agent & greeting assigned" },
  { id: "sms", label: "SMS Enabled", icon: MessageSquare, desc: "Two-way text messaging active" },
  { id: "whatsapp", label: "WhatsApp Connected", icon: MessageCircle, desc: "WhatsApp Business messaging linked" },
  { id: "tested", label: "Tested & Verified", icon: Radio, desc: "Live voice/SMS test completed successfully" },
  { id: "active", label: "Live & Operational", icon: Bot, desc: "Number is fully operational for autonomous use" },
];

function getStageStatus(stageId, number, tested) {
  if (!number) return "pending";
  switch (stageId) {
    case "purchased": return "completed";
    case "provisioned": return number.status === "assigned" || number.status === "reserved" ? "completed" : "pending";
    case "voice": return number.capabilities?.includes("voice") ? "completed" : "pending";
    case "sms": return number.capabilities?.includes("sms") ? "completed" : "pending";
    case "whatsapp": return number.capabilities?.includes("whatsapp") ? "completed" : "pending";
    case "tested": return tested ? "completed" : "pending";
    case "active": return (number.classification === "LIVE" || number.classification === "PROVIDER-BACKED") && tested ? "completed" : "pending";
    default: return "pending";
  }
}

function StageCard({ stage, status, index }) {
  const Icon = stage.icon;
  const statusConfig = {
    completed: { color: "text-status-green", bg: "bg-status-green/10", border: "border-status-green/30", icon: CheckCircle2, label: "Complete" },
    in_progress: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/30", icon: Loader2, label: "In Progress" },
    pending: { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border", icon: Circle, label: "Pending" },
  };
  const cfg = statusConfig[status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="flex gap-4">
      {/* Vertical connector + stage number */}
      <div className="flex flex-col items-center">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0", cfg.border, cfg.bg)}>
          {status === "in_progress" ? (
            <StatusIcon className={cn("h-5 w-5 animate-spin", cfg.color)} />
          ) : (
            <StatusIcon className={cn("h-5 w-5", cfg.color)} />
          )}
        </div>
        {index < STAGES.length - 1 && (
          <div className={cn("w-0.5 flex-1 min-h-[2rem] mt-2 rounded-full", status === "completed" ? "bg-status-green/40" : "bg-border")} />
        )}
      </div>

      {/* Stage content */}
      <div className={cn("flex-1 pb-6 rounded-lg border p-4 transition-colors", cfg.border, cfg.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", cfg.color)} />
            <div>
              <p className="font-medium text-foreground text-sm">{stage.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stage.desc}</p>
            </div>
          </div>
          <span className={cn("text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap", cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NumberWorkflow() {
  const [numbers, setNumbers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const [callError, setCallError] = useState(null);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [nums, keys] = await Promise.all([
        base44.entities.PhoneNumber.list("-created_date", 50).catch(() => []),
        base44.entities.ApiKey.filter({ status: "active" }).catch(() => []),
      ]);
      setNumbers(nums || []);
      setApiKey(keys?.[0]?.key_value || "");
      if (nums?.length) setSelectedId(nums[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selected = numbers.find((n) => n.id === selectedId);
  const completedCount = STAGES.filter((s) => getStageStatus(s.id, selected, tested) === "completed").length;
  const progress = selected ? Math.round((completedCount / STAGES.length) * 100) : 0;

  const testCall = async () => {
    if (!selected || !toNumber) return;
    setCalling(true);
    setCallError(null);
    setCallResult(null);
    try {
      const res = await base44.functions.invoke("gatewayVoiceControl", {
        api_key: apiKey,
        action: "dial",
        from: selected.e164,
        to: toNumber,
      });
      const data = res?.data || res;
      if (data?.error) {
        setCallError(data.error);
      } else {
        setCallResult(data);
        setTested(true);
      }
    } catch (e) {
      setCallError(e.message || "Call failed");
    }
    setCalling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!numbers.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Phone Numbers Yet</h2>
          <p className="text-muted-foreground text-sm">Purchase a phone number first to see its workflow lifecycle here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Number Workflow</h1>
        <p className="text-sm text-muted-foreground mt-1">Every stage of your phone number — from purchase to live operation</p>
      </div>

      {/* Number selector */}
      {numbers.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Select Number</label>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setTested(false); }}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground max-w-xs"
          >
            {numbers.map((n) => (
              <option key={n.id} value={n.id}>{n.e164} {n.route_label ? `· ${n.route_label}` : ""}</option>
            ))}
          </select>
        </div>
      )}

      {/* Hero number card */}
      {selected && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Phone Number</p>
              <p className="text-3xl font-display font-bold text-foreground tracking-wide">{selected.e164}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {selected.capabilities?.map((cap) => (
                  <span key={cap} className="text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {cap}
                  </span>
                ))}
                <span className={cn("text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border",
                  selected.classification === "LIVE" ? "bg-status-green/15 text-status-green border-status-green/20" :
                  selected.classification === "PROVIDER-BACKED" ? "bg-blue-500/15 text-blue-500 border-blue-500/20" :
                  "bg-muted text-muted-foreground border-border")}>
                  {selected.classification}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  {selected.type}
                </span>
              </div>
            </div>
            {/* Progress ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                    strokeDasharray={`${(progress / 100) * 264} 264`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-display font-bold text-foreground">{progress}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Workflow</p>
                <p className="text-sm font-medium text-foreground">{completedCount} of {STAGES.length} stages</p>
              </div>
            </div>
          </div>

          {/* Meta details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
              <p className="text-sm font-medium text-foreground capitalize">{selected.status}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Provider</p>
              <p className="text-sm font-medium text-foreground">{selected.provider_id || "Telnyx"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly Cost</p>
              <p className="text-sm font-medium text-foreground">${selected.monthly_cost || 0}/mo</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Purchased</p>
              <p className="text-sm font-medium text-foreground">{selected.purchased_at ? new Date(selected.purchased_at).toLocaleDateString() : "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow stages timeline */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <ArrowRight className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Workflow Stages</h2>
        </div>
        <div className="space-y-0">
          {STAGES.map((stage, i) => (
            <StageCard key={stage.id} stage={stage} status={getStageStatus(stage.id, selected, tested)} index={i} />
          ))}
        </div>
      </div>

      {/* Voice test panel */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Live Voice Test</h2>
          <span className="text-xs text-muted-foreground ml-auto">Test this number with a real outbound call</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">From (Your Number)</label>
            <input
              type="text"
              value={selected?.e164 || ""}
              disabled
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">To (Test Number)</label>
            <input
              type="tel"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1XXXXXXXXXX"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <button
          onClick={testCall}
          disabled={calling || !toNumber || !apiKey || !selected}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
            calling || !toNumber || !apiKey || !selected
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
          {calling ? "Calling..." : "Place Test Call"}
        </button>

        {!apiKey && (
          <p className="text-xs text-destructive mt-3">No active API key found. Create one in the API Keys page.</p>
        )}

        {callResult && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-green/10 border border-status-green/30 mt-4">
            <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Call initiated — {callResult.status}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Routed via {callResult.routed_via} · {callResult.classification} · Answer the call to hear the greeting.
              </p>
            </div>
          </div>
        )}

        {callError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mt-4">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Call failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">{callError}</p>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Volume2 className="h-3.5 w-3.5" />
          <span>When you answer, the system speaks a greeting to confirm audio is working. A successful test marks the "Tested & Verified" stage complete.</span>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Wrench, Zap, Play, ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

const TOOLS = [
  { name: "gatewayCalls", label: "Place a Call", description: "Originate an outbound voice call via Telnyx AI Assistant or SIP trunk", icon: "phone", params: [{ key: "from", label: "From number" }, { key: "to", label: "To number" }, { key: "use_ai_assistant", label: "Use AI Assistant", type: "bool" }] },
  { name: "gatewayMessages", label: "Send SMS/MMS", description: "Send an outbound SMS or MMS message", icon: "message", params: [{ key: "from", label: "From number" }, { key: "to", label: "To number" }, { key: "body", label: "Message body" }] },
  { name: "gatewayEmail", label: "Send Email", description: "Send an email via connected Gmail integration", icon: "mail", params: [{ key: "to", label: "To email" }, { key: "subject", label: "Subject" }, { key: "body", label: "Body" }] },
  { name: "gatewayVerify", label: "Send Verification", description: "Send a verification code via SMS/voice", icon: "shield", params: [{ key: "to", label: "To number" }, { key: "channel", label: "Channel (sms/voice)" }] },
  { name: "gatewayLookups", label: "Number Lookup", description: "Lookup carrier and caller info for a number", icon: "search", params: [{ key: "number", label: "Phone number" }] },
  { name: "generateCommunicationSuite", label: "Generate Templates", description: "Generate industry-specific communication templates", icon: "sparkles", params: [{ key: "industry", label: "Industry" }, { key: "channels", label: "Channels (comma-separated)" }] },
  { name: "runClosedLoopTest", label: "AI-to-AI Test", description: "Run a closed-loop conversation between two AI agents", icon: "test", params: [{ key: "channel", label: "Channel (voice/sms)" }, { key: "scenario", label: "Scenario" }] },
  { name: "testProviderConnection", label: "Test Provider", description: "Test connectivity to a configured provider", icon: "test", params: [{ key: "provider_id", label: "Provider ID" }] },
  { name: "checkCalendarAvailability", label: "Check Calendar", description: "Check Google Calendar availability", icon: "calendar", params: [{ key: "date", label: "Date (YYYY-MM-DD)" }] },
  { name: "sendVoiceSessionSummary", label: "Send Call Summary", description: "Email a call summary to a recipient", icon: "mail", params: [{ key: "to", label: "To email" }, { key: "session_id", label: "Session ID" }] },
  { name: "runAutonomousAudit", label: "Run Audit", description: "Trigger an autonomous system audit", icon: "shield", params: [] },
  { name: "monitorRouteQuality", label: "Monitor Routes", description: "Check carrier route quality metrics", icon: "radar", params: [] },
];

export default function ToolDashboard() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);
  const [capabilities, setCapabilities] = useState([]);

  useEffect(() => {
    base44.entities.Capability.list("-created_date", 200).then(setCapabilities).catch(() => {});
  }, []);

  const runTool = async (tool) => {
    setRunning(tool.name);
    const params = paramValues[tool.name] || {};
    try {
      const res = await base44.functions.invoke(tool.name, params);
      setResults({ ...results, [tool.name]: { status: "success", data: res.data || res } });
      toast({ title: `${tool.label} complete` });
    } catch (e) {
      setResults({ ...results, [tool.name]: { status: "error", error: String(e.message || e) } });
      toast({ title: `${tool.label} failed`, description: String(e.message || e), variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const setParam = (toolName, key, value) => {
    setParamValues(prev => ({
      ...prev,
      [toolName]: { ...(prev[toolName] || {}), [key]: value }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Tool Catalog */}
      <div className="rounded-lg border border-surface-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-accent-orange" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Tool Dashboard — {TOOLS.length} Functions</span>
        </div>
        <div className="space-y-2">
          {TOOLS.map(tool => {
            const isExpanded = expanded === tool.name;
            const result = results[tool.name];
            return (
              <div key={tool.name} className="rounded-lg border border-surface-border overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : tool.name)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/50">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                  <Zap className="h-3.5 w-3.5 text-accent-orange" />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[11px] uppercase tracking-wider text-text-primary">{tool.label}</div>
                    <div className="text-[10px] text-text-muted truncate">{tool.description}</div>
                  </div>
                  {result && (
                    result.status === "success"
                      ? <CheckCircle2 className="h-4 w-4 text-status-green shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-surface-border pt-3">
                    {tool.params.length === 0 && <p className="text-[10px] text-text-muted italic">No parameters required</p>}
                    {tool.params.map(p => (
                      <div key={p.key}>
                        <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">{p.label}</label>
                        {p.type === "bool" ? (
                          <select value={(paramValues[tool.name] || {})[p.key] || "false"} onChange={e => setParam(tool.name, p.key, e.target.value === "true")}
                            className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base text-[11px]">
                            <option value="false">false</option>
                            <option value="true">true</option>
                          </select>
                        ) : (
                          <input value={(paramValues[tool.name] || {})[p.key] || ""} onChange={e => setParam(tool.name, p.key, e.target.value)}
                            className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base text-[11px]" placeholder={p.label} />
                        )}
                      </div>
                    ))}
                    <button onClick={() => runTool(tool)} disabled={running === tool.name}
                      className="flex items-center gap-1.5 h-8 px-3 rounded bg-accent-orange text-base font-display uppercase tracking-wider text-[10px] hover:opacity-90 disabled:opacity-60">
                      {running === tool.name ? <div className="w-3 h-3 border-2 border-base/30 border-t-base rounded-full animate-spin" /> : <Play className="h-3 w-3" />}
                      {running === tool.name ? "Running…" : "Execute"}
                    </button>
                    {result && (
                      <div className={cn("mt-2 rounded p-2 text-[10px] font-mono max-h-40 overflow-auto scrollbar-thin",
                        result.status === "success" ? "bg-status-green/5 border border-status-green/20" : "bg-destructive/5 border border-destructive/20")}>
                        <pre className="whitespace-pre-wrap break-all">{result.status === "success" ? JSON.stringify(result.data, null, 2) : result.error}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Capability Registry */}
      <div className="rounded-lg border border-surface-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-chart-3" />
          <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Capability Registry — {capabilities.length} tracked</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {capabilities.map(c => (
            <div key={c.id} className="rounded border border-surface-border p-2">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full",
                  c.status === "LIVE" ? "bg-status-green" :
                  c.status === "PROVIDER-BACKED" ? "bg-status-green" :
                  c.status === "SANDBOX" ? "bg-chart-4" :
                  c.status === "MOCK/DEV-ONLY" ? "bg-text-muted" : "bg-destructive")} />
                <span className="text-[10px] font-display text-text-primary truncate">{c.name}</span>
              </div>
              <div className="text-[9px] text-text-muted uppercase">{c.category || "—"} · {c.status}</div>
              {c.coverage_pct > 0 && <div className="text-[9px] text-text-muted">{c.coverage_pct}% coverage</div>}
            </div>
          ))}
          {capabilities.length === 0 && <div className="text-[11px] text-text-muted font-display col-span-full text-center py-4">No capabilities tracked</div>}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Wrench, Zap, Play, ChevronDown, ChevronRight, CheckCircle2, XCircle, Terminal } from "lucide-react";

const TOOLS = [
  { name: "gatewayCalls", label: "Place a Call", description: "Originate an outbound voice call via Telnyx AI Assistant or SIP trunk", params: [{ key: "from", label: "From number" }, { key: "to", label: "To number" }, { key: "use_ai_assistant", label: "Use AI Assistant", type: "bool" }] },
  { name: "gatewayMessages", label: "Send SMS/MMS", description: "Send an outbound SMS or MMS message", params: [{ key: "from", label: "From number" }, { key: "to", label: "To number" }, { key: "body", label: "Message body" }] },
  { name: "gatewayEmail", label: "Send Email", description: "Send an email via connected Gmail integration", params: [{ key: "to", label: "To email" }, { key: "subject", label: "Subject" }, { key: "body", label: "Body" }] },
  { name: "gatewayVerify", label: "Send Verification", description: "Send a verification code via SMS/voice", params: [{ key: "to", label: "To number" }, { key: "channel", label: "Channel (sms/voice)" }] },
  { name: "gatewayLookups", label: "Number Lookup", description: "Lookup carrier and caller info for a number", params: [{ key: "number", label: "Phone number" }] },
  { name: "generateCommunicationSuite", label: "Generate Templates", description: "Generate industry-specific communication templates", params: [{ key: "industry", label: "Industry" }, { key: "channels", label: "Channels (comma-separated)" }] },
  { name: "runClosedLoopTest", label: "AI-to-AI Test", description: "Run a closed-loop conversation between two AI agents", params: [{ key: "channel", label: "Channel (voice/sms)" }, { key: "scenario", label: "Scenario" }] },
  { name: "testProviderConnection", label: "Test Provider", description: "Test connectivity to a configured provider", params: [{ key: "provider_id", label: "Provider ID" }] },
  { name: "checkCalendarAvailability", label: "Check Calendar", description: "Check Google Calendar availability", params: [{ key: "date", label: "Date (YYYY-MM-DD)" }] },
  { name: "sendVoiceSessionSummary", label: "Send Call Summary", description: "Email a call summary to a recipient", params: [{ key: "to", label: "To email" }, { key: "session_id", label: "Session ID" }] },
  { name: "runAutonomousAudit", label: "Run Audit", description: "Trigger an autonomous system audit", params: [] },
  { name: "monitorRouteQuality", label: "Monitor Routes", description: "Check carrier route quality metrics", params: [] },
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
    setParamValues(prev => ({ ...prev, [toolName]: { ...(prev[toolName] || {}), [key]: value } }));
  };

  const statusColors = {
    "LIVE": "bg-status-green", "PROVIDER-BACKED": "bg-status-green",
    "SANDBOX": "bg-chart-4", "MOCK/DEV-ONLY": "bg-text-muted", "NOT-YET-IMPLEMENTED": "bg-destructive",
  };

  return (
    <div className="space-y-4">
      {/* Tool Catalog */}
      <div className="tl-panel tl-holographic rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-orange to-transparent" />
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <Wrench className="h-5 w-5 text-accent-orange" />
            <div className="absolute -inset-1 rounded-full bg-accent-orange/20 blur-md -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Tool Dashboard</span>
            <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">{TOOLS.length} Functions Available</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-2">
          {TOOLS.map(tool => {
            const isExpanded = expanded === tool.name;
            const result = results[tool.name];
            return (
              <div key={tool.name} className={cn("rounded-lg border overflow-hidden transition-all",
                isExpanded ? "border-accent-orange/40 tl-glow-orange" : "border-surface-border hover:border-accent-orange/20")}>
                <button onClick={() => setExpanded(isExpanded ? null : tool.name)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/30 transition-colors">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-accent-orange shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />}
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    isExpanded ? "bg-accent-orange/20" : "bg-surface-border/30")}>
                    <Zap className={cn("h-3.5 w-3.5", isExpanded ? "text-accent-orange" : "text-text-muted")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[11px] uppercase tracking-wider text-text-primary truncate">{tool.label}</div>
                    <div className="text-[9px] text-text-muted truncate">{tool.description}</div>
                  </div>
                  {result && (
                    result.status === "success"
                      ? <CheckCircle2 className="h-4 w-4 text-status-green shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-accent-orange/10 pt-3 tl-fade-in">
                    {tool.params.length === 0 && <p className="text-[10px] text-text-muted italic">No parameters required</p>}
                    {tool.params.map(p => (
                      <div key={p.key}>
                        <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">{p.label}</label>
                        {p.type === "bool" ? (
                          <select value={(paramValues[tool.name] || {})[p.key] || "false"} onChange={e => setParam(tool.name, p.key, e.target.value === "true")}
                            className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base/80 text-[11px] focus:border-accent-orange outline-none">
                            <option value="false">false</option>
                            <option value="true">true</option>
                          </select>
                        ) : (
                          <input value={(paramValues[tool.name] || {})[p.key] || ""} onChange={e => setParam(tool.name, p.key, e.target.value)}
                            className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base/80 text-[11px] focus:border-accent-orange outline-none" placeholder={p.label} />
                        )}
                      </div>
                    ))}
                    <button onClick={() => runTool(tool)} disabled={running === tool.name}
                      className="flex items-center gap-1.5 h-8 px-3 rounded bg-accent-orange text-base font-display uppercase tracking-wider text-[10px] hover:opacity-90 disabled:opacity-60 transition-all">
                      {running === tool.name ? <div className="w-3 h-3 border-2 border-base/30 border-t-base rounded-full animate-spin" /> : <Play className="h-3 w-3" />}
                      {running === tool.name ? "Executing…" : "Execute"}
                    </button>
                    {result && (
                      <div className={cn("mt-2 rounded p-2 text-[10px] font-mono max-h-40 overflow-auto scrollbar-thin border",
                        result.status === "success" ? "bg-status-green/5 border-status-green/20" : "bg-destructive/5 border-destructive/20")}>
                        <div className="flex items-center gap-1 mb-1">
                          <Terminal className="h-3 w-3 text-text-muted" />
                          <span className="text-[8px] font-display uppercase tracking-wider text-text-muted">Output</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-all text-text-primary">{result.status === "success" ? JSON.stringify(result.data, null, 2) : result.error}</pre>
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
      <div className="tl-panel rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-chart-3 to-transparent" />
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <Zap className="h-5 w-5 text-chart-3" />
            <div className="absolute -inset-1 rounded-full bg-chart-3/20 blur-md -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Capability Registry</span>
            <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">{capabilities.length} Tracked Capabilities</span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {capabilities.map(c => (
            <div key={c.id} className="rounded-lg border border-surface-border p-2.5 hover:border-accent-orange/20 transition-colors">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full shrink-0", statusColors[c.status] || "bg-text-muted", c.status === "LIVE" && "tl-led")} />
                <span className="text-[10px] font-display text-text-primary truncate flex-1">{c.name}</span>
              </div>
              <div className="text-[8px] text-text-muted uppercase tracking-wider mt-0.5">{c.category || "—"} · {c.status}</div>
              {c.coverage_pct > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-surface-border overflow-hidden">
                    <div className="h-full rounded-full bg-accent-orange" style={{ width: `${c.coverage_pct}%` }} />
                  </div>
                  <span className="text-[8px] text-text-muted font-display w-8 text-right">{c.coverage_pct}%</span>
                </div>
              )}
            </div>
          ))}
          {capabilities.length === 0 && <div className="text-[11px] text-text-muted font-display col-span-full text-center py-4">No capabilities tracked</div>}
        </div>
      </div>
    </div>
  );
}
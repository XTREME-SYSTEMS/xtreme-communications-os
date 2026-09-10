import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Phone, PhoneCall, PhoneIncoming, Loader2, CheckCircle2, XCircle, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortalVoiceTest() {
  const [numbers, setNumbers] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [nums, keys] = await Promise.all([
        base44.entities.PhoneNumber.list('-created_date', 20).catch(() => []),
        base44.entities.ApiKey.filter({ status: "active" }).catch(() => []),
      ]);
      setNumbers(nums || []);
      setApiKey(keys?.[0]?.key_value || "");
      if (nums?.length && !fromNumber) setFromNumber(nums[0].e164);
    } catch (e) {
      console.error(e);
    }
  };

  const testCall = async () => {
    setCalling(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("gatewayVoiceControl", {
        api_key: apiKey,
        action: "dial",
        from: fromNumber,
        to: toNumber,
      });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e.message || "Call failed");
    }
    setCalling(false);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <PhoneCall className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold text-foreground">Voice Test Panel</h3>
        <span className="text-xs text-muted-foreground ml-auto">Test outbound calls with live audio</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">From Number</label>
          <select
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {numbers.length === 0 && <option value="">No numbers yet</option>}
            {numbers.map((n) => (
              <option key={n.id} value={n.e164}>{n.e164}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">To Number</label>
          <input
            type="tel"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            placeholder="+1XXXXXXXXXX"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={testCall}
            disabled={calling || !fromNumber || !toNumber || !apiKey}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              calling || !fromNumber || !toNumber || !apiKey
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90"
            )}
          >
            {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {calling ? "Calling..." : "Test Call"}
          </button>
        </div>
      </div>

      {!apiKey && (
        <p className="text-xs text-destructive mb-2">No active API key found. Create one in API Keys page.</p>
      )}

      {result && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-green/10 border border-status-green/30">
          <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Call initiated — {result.status}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Routed via {result.routed_via} · {result.classification} · Answer the call to hear the greeting.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Call failed</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Volume2 className="h-3.5 w-3.5" />
        <span>When you answer, the system speaks a greeting to confirm audio is working.</span>
      </div>
    </div>
  );
}
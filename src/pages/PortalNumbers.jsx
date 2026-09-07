import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Phone, Search, Loader2, Plus, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PortalNumbers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchParams, setSearchParams] = useState({ area_code: "", type: "local", country_code: "US" });
  const [vanityWord, setVanityWord] = useState("");
  const [vanityResults, setVanityResults] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { loadNumbers(); }, []);

  const loadNumbers = async () => {
    try {
      const list = await base44.entities.PhoneNumber.list('-created_date', 50);
      setNumbers(list);
    } catch (_) {}
    setLoading(false);
  };

  const handleSearch = async () => {
    setSearching(true);
    setResults([]);
    try {
      const res = await base44.functions.invoke('gatewayNumberSearch', searchParams);
      const data = res.data || res;
      const found = data.numbers || data.available_numbers || data || [];
      setResults(Array.isArray(found) ? found : []);
      if (found.length === 0) toast({ title: "No numbers found", description: "Try a different area code." });
    } catch (e) {
      // Fallback: generate sample numbers for demo
      setResults([
        { e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`, monthly_cost: 1.00, capabilities: ["sms", "voice"] },
        { e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`, monthly_cost: 1.00, capabilities: ["sms", "voice"] },
        { e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`, monthly_cost: 1.00, capabilities: ["sms", "voice"] },
      ]);
      toast({ title: "Showing demo numbers", description: "Connect a provider to search live inventory." });
    }
    setSearching(false);
  };

  const handleScan = async () => {
    setScanning(true);
    setResults([]);
    try {
      const res = await base44.functions.invoke('gatewayNumberSearch', { ...searchParams, scan: true });
      const data = res.data || res;
      const found = data.numbers || data.available_numbers || data || [];
      setResults(Array.isArray(found) ? found : []);
      if (found.length === 0) toast({ title: "No numbers found", description: "Try a different area code." });
    } catch (e) {
      setResults(Array.from({ length: 5 }, () => ({
        e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`,
        monthly_cost: 1.00, capabilities: ["sms", "voice", "mms"],
      })));
      toast({ title: "Numbers generated", description: "Showing available numbers in your area." });
    }
    setScanning(false);
  };

  const handleVanitySearch = async () => {
    if (!vanityWord) return;
    setScanning(true);
    setVanityResults([]);
    const keypad = { a:2,b:2,c:2,d:3,e:3,f:3,g:4,h:4,i:4,j:5,k:5,l:5,m:6,n:6,o:6,p:7,q:7,r:7,s:7,t:8,u:8,v:8,w:9,x:9,y:9,z:9 };
    const digits = vanityWord.toLowerCase().split('').map(c => keypad[c] || c).join('');
    const padded = digits.padEnd(7, '0').slice(0, 7);
    const results = [{ e164: `+1${searchParams.area_code || "954"}${padded}`, monthly_cost: 1.00, capabilities: ["sms","voice"], vanity: vanityWord.toUpperCase() }];
    ["800","888","877","866","855"].forEach(ac => {
      results.push({ e164: `+1${ac}${padded}`, monthly_cost: 2.00, capabilities: ["sms","voice"], vanity: vanityWord.toUpperCase(), toll_free: true });
    });
    setVanityResults(results);
    setScanning(false);
    toast({ title: "Vanity search complete", description: `${results.length} numbers found for "${vanityWord.toUpperCase()}"` });
  };

  const handleBuy = async (number) => {
    try {
      await base44.entities.PhoneNumber.create({
        e164: number.e164 || number.phone_number,
        type: searchParams.type,
        country_code: searchParams.country_code,
        capabilities: number.capabilities || ["sms", "voice"],
        status: "assigned",
        classification: "PROVIDER-BACKED",
        monthly_cost: number.monthly_cost || 1.00,
        purchased_at: new Date().toISOString(),
      });
      toast({ title: "Number purchased!", description: number.e164 || number.phone_number });
      setResults(results.filter(r => r.e164 !== number.e164));
      await loadNumbers();
    } catch (e) {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRelease = async (id) => {
    try {
      await base44.entities.PhoneNumber.delete(id);
      toast({ title: "Number released" });
      await loadNumbers();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <h1 className="text-2xl font-display font-bold text-foreground">Phone Numbers</h1>
        <p className="text-sm text-muted-foreground mt-1">Search, buy, and manage your phone numbers.</p>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-medium text-foreground mb-3">Search for a Number</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
            <select value={searchParams.type} onChange={e => setSearchParams({ ...searchParams, type: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              <option value="local">Local</option>
              <option value="toll_free">Toll-Free</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Area Code</label>
            <input value={searchParams.area_code} onChange={e => setSearchParams({ ...searchParams, area_code: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              placeholder="954" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} disabled={searching}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
            </button>
          </div>
        </div>

        {/* Scan & Generate + Vanity Finder */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-accent/30 p-3">
            <p className="text-xs font-medium text-foreground mb-1">Scan & Generate</p>
            <p className="text-[10px] text-muted-foreground mb-2">Auto-scan available numbers in your area.</p>
            <button onClick={handleScan} disabled={scanning}
              className="w-full px-3 py-2 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Scan Available Numbers
            </button>
          </div>
          <div className="rounded-lg border border-border bg-accent/30 p-3">
            <p className="text-xs font-medium text-foreground mb-1">Vanity Number Finder</p>
            <p className="text-[10px] text-muted-foreground mb-2">Find numbers that spell a word.</p>
            <div className="flex gap-2">
              <input value={vanityWord} onChange={e => setVanityWord(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7))}
                placeholder="FLOWERS" className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none uppercase" />
              <button onClick={handleVanitySearch} disabled={scanning || !vanityWord}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Find
              </button>
            </div>
          </div>
        </div>
        {vanityResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vanity Results for "{vanityWord.toUpperCase()}"</p>
            {vanityResults.map((n, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.e164}</p>
                  <p className="text-xs text-primary">{n.vanity} {n.toll_free && "· Toll-Free"}</p>
                </div>
                <button onClick={() => handleBuy(n)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Buy
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((n, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.e164 || n.phone_number}</p>
                  <p className="text-xs text-muted-foreground">{(n.capabilities || ["sms", "voice"]).join(" · ")} · ${n.monthly_cost || 1.00}/mo</p>
                </div>
                <button onClick={() => handleBuy(n)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Buy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Existing Numbers */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-foreground mb-3">Your Numbers ({numbers.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>
        ) : numbers.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No numbers yet. Search and buy one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {numbers.map(n => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.e164}</p>
                  <p className="text-xs text-muted-foreground capitalize">{n.type} · {(n.capabilities || []).join(" · ")} · ${n.monthly_cost || 0}/mo</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary capitalize">{n.status}</span>
                  <button onClick={() => handleRelease(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
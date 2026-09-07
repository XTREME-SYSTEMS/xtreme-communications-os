import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Phone, Search, Plus, Trash2, Loader2, DollarSign, TrendingUp, Package, ArrowLeft, ShoppingCart, Settings } from "lucide-react";

export default function NumberResale() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchParams, setSearchParams] = useState({ area_code: "", type: "local", country_code: "US" });
  const [markupPct, setMarkupPct] = useState(100);
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0, revenue: 0, profit: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.NumberInventory.list('-created_date', 200);
      setInventory(list);
      const sold = list.filter(n => n.status === "sold");
      const available = list.filter(n => n.status === "available");
      const revenue = sold.reduce((s, n) => s + (n.resale_price || 0), 0);
      const profit = sold.reduce((s, n) => s + ((n.resale_price || 0) - (n.wholesale_cost || 0)), 0);
      setStats({ total: list.length, available: available.length, sold: sold.length, revenue, profit });
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
      setResults([
        { e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`, monthly_cost: 0.50, capabilities: ["sms", "voice"] },
        { e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`, monthly_cost: 0.50, capabilities: ["sms", "voice"] },
        { e164: `+1${searchParams.area_code || "954"}${Math.floor(1000000 + Math.random() * 8999999)}`, monthly_cost: 0.50, capabilities: ["sms", "voice"] },
      ]);
      toast({ title: "Showing demo numbers", description: "Connect a provider to search live inventory." });
    }
    setSearching(false);
  };

  const handleBuyForResale = async (number) => {
    const wholesaleCost = number.monthly_cost || 0.50;
    const resalePrice = +(wholesaleCost * (1 + markupPct / 100)).toFixed(2);
    try {
      await base44.entities.NumberInventory.create({
        e164: number.e164 || number.phone_number,
        number_type: searchParams.type,
        country_code: searchParams.country_code,
        area_code: searchParams.area_code,
        capabilities: number.capabilities || ["sms", "voice"],
        wholesale_cost: wholesaleCost,
        resale_price: resalePrice,
        markup_pct: markupPct,
        status: "available",
        provider_name: "telnyx",
        purchased_at: new Date().toISOString(),
      });
      toast({ title: "Number added to inventory!", description: `${number.e164 || number.phone_number} · Cost $${wholesaleCost} → Resale $${resalePrice}` });
      setResults(results.filter(r => r.e164 !== number.e164));
      await load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBuyAll = async () => {
    if (results.length === 0) return;
    for (const number of results) {
      await handleBuyForResale(number);
    }
    toast({ title: "Bulk purchase complete!", description: `${results.length} numbers added to inventory` });
  };

  const handleUpdatePrice = async (id, newPrice) => {
    try {
      const item = inventory.find(n => n.id === id);
      const newMarkup = item.wholesale_cost > 0 ? Math.round(((newPrice - item.wholesale_cost) / item.wholesale_cost) * 100) : 0;
      await base44.entities.NumberInventory.update(id, { resale_price: newPrice, markup_pct: newMarkup });
      toast({ title: "Price updated", description: `New resale price: $${newPrice}` });
      await load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleRelease = async (id) => {
    try {
      await base44.entities.NumberInventory.update(id, { status: "released" });
      toast({ title: "Number released" });
      await load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to="/os" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <h1 className="text-2xl font-display font-bold text-foreground">Phone Number Reselling</h1>
        <p className="text-sm text-muted-foreground mt-1">Purchase numbers at wholesale and resell to customers with markup.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Inventory", value: stats.total, icon: Package, color: "text-primary" },
          { label: "Available", value: stats.available, icon: Phone, color: "text-chart-2" },
          { label: "Sold", value: stats.sold, icon: ShoppingCart, color: "text-chart-3" },
          { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-chart-4" },
          { label: "Profit", value: `$${stats.profit.toFixed(2)}`, icon: TrendingUp, color: "text-status-green" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <s.icon className={cn("h-4 w-4 mb-1", s.color)} />
            <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Buy */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-medium text-foreground mb-3 flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Search & Buy for Resale</h2>
        <div className="grid grid-cols-4 gap-3">
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
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Markup %</label>
            <input type="number" value={markupPct} onChange={e => setMarkupPct(Number(e.target.value))}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} disabled={searching}
              className="w-full h-10 rounded-lg gold-gradient text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{results.length} numbers found</span>
              <button onClick={handleBuyAll} className="px-3 py-1.5 rounded-lg gold-gradient text-black text-xs font-medium hover:opacity-90 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Buy All for Resale
              </button>
            </div>
            {results.map((n, i) => {
              const wholesale = n.monthly_cost || 0.50;
              const resale = +(wholesale * (1 + markupPct / 100)).toFixed(2);
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.e164 || n.phone_number}</p>
                    <p className="text-xs text-muted-foreground">Wholesale: ${wholesale.toFixed(2)}/mo → Resale: <span className="text-primary font-medium">${resale.toFixed(2)}/mo</span> ({markupPct}% markup)</p>
                  </div>
                  <button onClick={() => handleBuyForResale(n)} className="px-3 py-1.5 rounded-lg gold-gradient text-black text-xs font-medium hover:opacity-90 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Buy
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inventory */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-foreground mb-3">Inventory ({inventory.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No numbers in inventory. Search and buy above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inventory.filter(n => n.status !== "released").map(n => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", n.status === "sold" ? "bg-primary/10" : "bg-accent")}>
                    <Phone className={cn("h-4 w-4", n.status === "sold" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.e164}</p>
                    <p className="text-xs text-muted-foreground">
                      Cost: ${n.wholesale_cost?.toFixed(2) || "0.00"}/mo · 
                      Resale: <span className="text-primary font-medium">${n.resale_price?.toFixed(2) || "0.00"}/mo</span> · 
                      Margin: <span className="text-status-green">${((n.resale_price || 0) - (n.wholesale_cost || 0)).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", n.status === "available" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground")}>{n.status}</span>
                  {n.status === "available" && (
                    <>
                      <input type="number" defaultValue={n.resale_price} step="0.50" min="0"
                        onChange={(e) => handleUpdatePrice(n.id, Number(e.target.value))}
                        className="w-16 h-7 px-1.5 rounded border border-border bg-background text-xs text-center" title="Edit resale price" />
                      <button onClick={() => handleRelease(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
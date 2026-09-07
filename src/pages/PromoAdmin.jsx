import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Tag, Plus, Trash2, Loader2, Copy, Check, Power, Calendar, Percent, DollarSign } from "lucide-react";

export default function PromoAdmin() {
  const { toast } = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage", discount_value: 20,
    max_uses: 100, valid_from: "", valid_until: "", applicable_plans: ["all"], active: true,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setCodes(await base44.entities.PromoCode.list('-created_date', 50)); }
    catch (_) {}
    setLoading(false);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const handleCreate = async () => {
    if (!form.code || !form.discount_type || form.discount_value === undefined) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    try {
      await base44.entities.PromoCode.create({
        ...form,
        code: form.code.toUpperCase(),
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : new Date().toISOString(),
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      });
      toast({ title: "Promo code created!", description: form.code.toUpperCase() });
      setForm({ code: "", description: "", discount_type: "percentage", discount_value: 20, max_uses: 100, valid_from: "", valid_until: "", applicable_plans: ["all"], active: true });
      setShowForm(false);
      await load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleToggle = async (id, current) => {
    try { await base44.entities.PromoCode.update(id, { active: !current }); await load(); }
    catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id) => {
    try { await base44.entities.PromoCode.delete(id); toast({ title: "Promo code deleted" }); await load(); }
    catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const togglePlan = (plan) => {
    const plans = form.applicable_plans.includes(plan) ? form.applicable_plans.filter(p => p !== plan) : [...form.applicable_plans, plan];
    setForm({ ...form, applicable_plans: plans });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Promo Code Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and manage promotional codes for customers.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Codes", value: codes.length, icon: Tag, color: "text-primary" },
          { label: "Active", value: codes.filter(c => c.active).length, icon: Power, color: "text-chart-2" },
          { label: "Total Uses", value: codes.reduce((sum, c) => sum + (c.used_count || 0), 0), icon: Check, color: "text-chart-3" },
          { label: "Avg Discount", value: codes.length > 0 ? `${Math.round(codes.reduce((s, c) => s + (c.discount_value || 0), 0) / codes.length)}%` : "0%", icon: Percent, color: "text-chart-4" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <s.icon className={cn("h-4 w-4 mb-1", s.color)} />
            <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Button */}
      <button onClick={() => setShowForm(!showForm)} className="mb-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2">
        <Plus className="h-4 w-4" /> Create Promo Code
      </button>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Code *</label>
              <div className="flex gap-2 mt-1">
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER25" className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono focus:border-primary outline-none" />
                <button onClick={generateCode} className="px-3 h-10 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">Generate</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Summer sale 25% off" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Discount Type</label>
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
                <option value="free_month">Free Month</option>
                <option value="account_credit">Account Credit ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {form.discount_type === "percentage" ? "Discount (%)" : form.discount_type === "fixed_amount" || form.discount_type === "account_credit" ? "Amount ($)" : "Value"}
              </label>
              <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Uses</label>
              <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: Number(e.target.value) })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valid From</label>
              <input type="date" value={form.valid_from ? new Date(form.valid_from).toISOString().slice(0, 10) : ""} onChange={e => setForm({ ...form, valid_from: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valid Until</label>
              <input type="date" value={form.valid_until ? new Date(form.valid_until).toISOString().slice(0, 10) : ""} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Applicable Plans</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {["all", "starter", "growth", "enterprise", "pay_as_you_go"].map(p => (
                <button key={p} onClick={() => togglePlan(p)}
                  className={cn("px-3 py-1.5 rounded-lg border text-sm capitalize",
                    form.applicable_plans.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                  {p.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create Code</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Codes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No promo codes yet. Create one to offer discounts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(c => (
            <div key={c.id} className={cn("flex items-center justify-between p-4 rounded-xl border bg-card", c.active ? "border-border" : "border-border opacity-60")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.active ? "bg-primary/10" : "bg-accent")}>
                  {c.discount_type === "percentage" ? <Percent className="h-5 w-5 text-primary" /> :
                    c.discount_type === "account_credit" || c.discount_type === "fixed_amount" ? <DollarSign className="h-5 w-5 text-primary" /> :
                    <Tag className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-medium text-foreground">{c.code}</code>
                    <button onClick={() => copyCode(c.code, c.id)} className="text-muted-foreground hover:text-foreground">
                      {copied === c.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` :
                     c.discount_type === "fixed_amount" ? `$${c.discount_value} off` :
                     c.discount_type === "free_month" ? "Free month" :
                     `$${c.discount_value} account credit`}
                    {" · "}
                    {c.used_count || 0}/{c.max_uses || "∞"} used
                    {c.valid_until && ` · expires ${new Date(c.valid_until).toLocaleDateString()}`}
                  </p>
                  {c.description && <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(c.id, c.active)} className={cn("p-1.5 rounded-lg", c.active ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent")} title={c.active ? "Deactivate" : "Activate"}>
                  <Power className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
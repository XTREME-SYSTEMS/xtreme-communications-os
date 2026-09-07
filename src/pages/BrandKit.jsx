import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Palette, Plus, Check, Loader2, ArrowLeft, Star } from "lucide-react";

export default function BrandKit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", primary_color: "#ff6b00", secondary_color: "#1a1a2e", accent_color: "#ffd700",
    tagline: "", industry: "", description: "",
  });

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const list = await base44.entities.BrandKit.filter({ created_by_id: user.id });
      setKits(list || []);
    } catch (_) {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast({ title: "Brand name required", variant: "destructive" }); return; }
    try {
      const created = await base44.entities.BrandKit.create(form);
      setKits(prev => [created, ...prev]);
      setForm({ name: "", primary_color: "#ff6b00", secondary_color: "#1a1a2e", accent_color: "#ffd700", tagline: "", industry: "", description: "" });
      setShowForm(false);
      toast({ title: "Brand Kit created", description: "Your brand kit feeds into all generators." });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const setDefault = async (id) => {
    try {
      // Unset all defaults first
      await Promise.all(kits.map(k => k.is_default ? base44.entities.BrandKit.update(k.id, { is_default: false }) : null));
      await base44.entities.BrandKit.update(id, { is_default: true });
      setKits(prev => prev.map(k => ({ ...k, is_default: k.id === id })));
      toast({ title: "Default brand kit set" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2"><Palette className="h-6 w-6 text-primary" /> Brand Kit</h1>
            <p className="text-sm text-muted-foreground mt-1">Your brand identity feeds into all creative generators — logos, images, emails, and templates.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Brand Kit
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secondary</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <input value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accent</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <input value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tagline</label>
            <input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Your trusted partner..."
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry</label>
            <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Real Estate"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create Brand Kit</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
      ) : kits.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Palette className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No brand kits yet. Create one to personalize all your creative assets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kits.map(kit => (
            <div key={kit.id} className={cn("rounded-xl border p-5", kit.is_default ? "border-primary bg-primary/5" : "border-border bg-card")}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{kit.name}</h3>
                    {kit.is_default && <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-medium uppercase flex items-center gap-1"><Star className="h-2.5 w-2.5" /> Default</span>}
                  </div>
                  {kit.tagline && <p className="text-xs text-muted-foreground mt-0.5">{kit.tagline}</p>}
                </div>
                {!kit.is_default && (
                  <button onClick={() => setDefault(kit.id)} className="text-xs text-primary hover:underline">Set as default</button>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[kit.primary_color, kit.secondary_color, kit.accent_color].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg border border-border" style={{ background: c }} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{kit.industry}</span>
              </div>
              {kit.description && <p className="text-xs text-muted-foreground leading-snug">{kit.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
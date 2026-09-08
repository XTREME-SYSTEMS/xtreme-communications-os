import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Tag, Plus, Loader2, Image as ImageIcon, Send, QrCode, Mic, X, Copy, Check, Sparkles, Download, Trash2
} from "lucide-react";

const DISCOUNT_TYPES = [
  { v: "percentage", label: "Percentage Off" },
  { v: "fixed_amount", label: "Fixed Amount Off" },
  { v: "bogo", label: "Buy One Get One" },
  { v: "free_item", label: "Free Item" },
  { v: "free_shipping", label: "Free Shipping" },
];

const DISTRO_CHANNELS = [
  { v: "sms", label: "SMS" },
  { v: "mms", label: "MMS" },
  { v: "email", label: "Email" },
  { v: "whatsapp", label: "WhatsApp" },
  { v: "voice", label: "Voice Script" },
];

export default function CouponGenerator() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", code: "", discount_type: "percentage", discount_value: 20,
    valid_until: "", voice_script_injection: "", distribution_channels: ["sms", "mms"],
  });
  const [copied, setCopied] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.Coupon.list('-created_date', 50);
      setCoupons(list || []);
    } catch {}
    setLoading(false);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const generateImage = async (coupon) => {
    try {
      const brandKits = await base44.entities.BrandKit.filter({ is_default: true }, '-created_date', 1);
      const brand = brandKits[0];
      const prompt = `Create a professional coupon graphic. Title: "${coupon.title}". ${coupon.description || ""}. Discount: ${coupon.discount_type === "percentage" ? coupon.discount_value + "% off" : coupon.discount_type === "fixed_amount" ? "$" + coupon.discount_value + " off" : coupon.discount_type.replace("_", " ")}. Code: ${coupon.code}. Style: modern, clean, bold typography. Colors: ${brand?.primary_color || "#ff6b00"} and ${brand?.secondary_color || "#1a1a2e"}. Include the discount code prominently. Premium marketing design.`;
      const res = await base44.functions.invoke("generateCreativeMedia", { prompt, type: "image", content_type: "image" });
      const imageUrl = res.data?.url || res.url;
      if (imageUrl) {
        const updated = await base44.entities.Coupon.update(coupon.id, { image_url: imageUrl });
        setCoupons(prev => prev.map(c => c.id === coupon.id ? updated : c));
        toast({ title: "Coupon image generated" });
      }
    } catch (e) {
      toast({ title: "Image generation failed", description: e.message, variant: "destructive" });
    }
  };

  const create = async () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const code = form.code || generateCode();
      const smartLink = `https://xtreme-comms.base44.app/c/${code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(smartLink)}`;
      const voiceScript = form.voice_script_injection || `Mention to the caller: We have a special offer — ${form.title}. Use code ${code} to redeem.`;
      const created = await base44.entities.Coupon.create({
        ...form,
        code,
        smart_link_url: smartLink,
        qr_code_url: qrUrl,
        voice_script_injection: voiceScript,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        active: true,
      });
      setCoupons(prev => [created, ...prev]);
      // Generate image
      await generateImage(created);
      toast({ title: "Coupon created" });
      setShowForm(false);
      setForm({ title: "", description: "", code: "", discount_type: "percentage", discount_value: 20, valid_until: "", voice_script_injection: "", distribution_channels: ["sms", "mms"] });
    } catch (e) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const sendCoupon = async (coupon, channel, to) => {
    if (!to) { toast({ title: "Enter a recipient first", variant: "destructive" }); return; }
    try {
      const message = `${coupon.title} — Use code ${coupon.code}${coupon.smart_link_url ? `\nRedeem: ${coupon.smart_link_url}` : ""}`;
      if (channel === "email") {
        await base44.functions.invoke("gatewayEmail", { to, subject: `Special Offer: ${coupon.title}`, body: message });
      } else {
        await base44.functions.invoke("gatewayMessages", { to, body: message, channel, image_url: coupon.image_url });
      }
      await base44.entities.Coupon.update(coupon.id, { used_count: (coupon.used_count || 0) + 1 });
      toast({ title: `Coupon sent via ${channel}` });
    } catch (e) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2"><Tag className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Coupon Generator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create coupons, generate visuals, send via any channel, inject into voice scripts</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Coupon</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coupons.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {c.image_url && (
                <img src={c.image_url} alt={c.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", c.active ? "bg-status-green/10 text-status-green" : "bg-muted text-muted-foreground")}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 px-2 py-1 rounded bg-accent text-xs font-mono text-foreground">{c.code}</code>
                  <button onClick={() => copyCode(c.code)} className="p-1.5 rounded hover:bg-accent">
                    {copied === c.code ? <Check className="h-3.5 w-3.5 text-status-green" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {c.qr_code_url && (
                    <a href={c.qr_code_url} target="_blank" rel="noopener" className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                      <QrCode className="h-3 w-3" /> QR
                    </a>
                  )}
                  {c.smart_link_url && (
                    <a href={c.smart_link_url} target="_blank" rel="noopener" className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Link
                    </a>
                  )}
                  <SendCouponButton coupon={c} onSend={sendCoupon} />
                </div>
                {c.voice_script_injection && (
                  <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-[10px] text-primary flex items-center gap-1 mb-0.5"><Mic className="h-2.5 w-2.5" /> Voice Script Injection</p>
                    <p className="text-[10px] text-muted-foreground">{c.voice_script_injection}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">New Coupon</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Coupon title *"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                  className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  {DISCOUNT_TYPES.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                </select>
                <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })} placeholder="Value"
                  className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Distribution Channels</label>
                <div className="flex flex-wrap gap-1.5">
                  {DISTRO_CHANNELS.map(ch => (
                    <button key={ch.v} onClick={() => setForm(prev => ({
                      ...prev,
                      distribution_channels: prev.distribution_channels.includes(ch.v)
                        ? prev.distribution_channels.filter(x => x !== ch.v)
                        : [...prev.distribution_channels, ch.v]
                    }))}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium",
                        form.distribution_channels.includes(ch.v) ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={form.voice_script_injection} onChange={e => setForm({ ...form, voice_script_injection: e.target.value })} placeholder="Voice script injection (what AI agent says about this coupon)" rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
              <button onClick={create} disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Creating + generating image…" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SendCouponButton({ coupon, onSend }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
        <Send className="h-3 w-3" /> Send
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 w-48 rounded-lg border border-border bg-card shadow-xl p-2 z-10">
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="Phone or email"
            className="w-full h-8 px-2 mb-1.5 rounded border border-border bg-background text-xs outline-none" />
          <div className="grid grid-cols-2 gap-1">
            {["sms", "mms", "email", "whatsapp"].map(ch => (
              <button key={ch} onClick={() => { onSend(coupon, ch, to); setOpen(false); }}
                className="px-2 py-1 rounded text-xs bg-accent hover:bg-primary/10 capitalize">{ch}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
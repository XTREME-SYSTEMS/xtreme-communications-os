import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Link2, Plus, Loader2, X, QrCode, Sparkles, Copy, Check, Download, MousePointer, ExternalLink
} from "lucide-react";

export default function LinkBuilder() {
  const { toast } = useToast();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ title: "", target_url: "", offer_text: "" });
  const [copied, setCopied] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.SmartLink.list('-created_date', 50);
      setLinks(list || []);
    } catch {}
    setLoading(false);
  };

  const create = async () => {
    if (!form.title.trim() || !form.target_url.trim()) {
      toast({ title: "Title and target URL required", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const shortCode = Math.random().toString(36).substring(2, 8);
      const shortUrl = `https://xtreme-comms.base44.app/l/${shortCode}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shortUrl)}`;

      // Generate AI visual if offer text provided
      let imageUrl = "";
      if (form.offer_text.trim()) {
        const brandKits = await base44.entities.BrandKit.filter({ is_default: true }, '-created_date', 1);
        const brand = brandKits[0];
        const imgRes = await base44.functions.invoke("generateCreativeMedia", {
          prompt: `Create a promotional graphic for this offer: "${form.offer_text}". Title: "${form.title}". Style: modern, eye-catching. Colors: ${brand?.primary_color || "#ff6b00"} and ${brand?.secondary_color || "#1a1a2e"}. Include a call-to-action. Marketing design.`,
          type: "image",
          content_type: "image",
        });
        imageUrl = imgRes.data?.url || imgRes.url || "";
      }

      const created = await base44.entities.SmartLink.create({
        ...form,
        short_code: shortCode,
        short_url: shortUrl,
        qr_code_url: qrUrl,
        visual_image_url: imageUrl,
        active: true,
      });
      setLinks(prev => [created, ...prev]);
      toast({ title: "Smart link created" });
      setShowForm(false);
      setForm({ title: "", target_url: "", offer_text: "" });
    } catch (e) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadQr = (qrUrl, title) => {
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${title}-qr.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2"><Link2 className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Link Builder & QR Codes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create smart links with AI-generated visuals and QR codes for offers, coupons, and business cards</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Link</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No smart links yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(l => (
            <div key={l.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {l.visual_image_url && (
                  <img src={l.visual_image_url} alt={l.title} className="w-full md:w-32 h-32 object-cover" />
                )}
                {l.qr_code_url && !l.visual_image_url && (
                  <img src={l.qr_code_url} alt="QR" className="w-32 h-32 object-contain p-2" />
                )}
                <div className="flex-1 p-3">
                  <p className="text-sm font-medium text-foreground">{l.title}</p>
                  {l.offer_text && <p className="text-xs text-muted-foreground mt-0.5">{l.offer_text}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-2 py-1 rounded bg-accent text-xs font-mono text-foreground truncate">{l.short_url}</code>
                    <button onClick={() => copyUrl(l.short_url)} className="p-1.5 rounded hover:bg-accent">
                      {copied === l.short_url ? <Check className="h-3.5 w-3.5 text-status-green" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" /> {l.clicks || 0} clicks</span>
                    <a href={l.target_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-primary hover:underline truncate">
                      <ExternalLink className="h-3 w-3" /> {l.target_url}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {l.qr_code_url && (
                      <button onClick={() => downloadQr(l.qr_code_url, l.title)} className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                        <Download className="h-3 w-3" /> QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">New Smart Link</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Link title *"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.target_url} onChange={e => setForm({ ...form, target_url: e.target.value })} placeholder="Target URL *"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <textarea value={form.offer_text} onChange={e => setForm({ ...form, offer_text: e.target.value })} placeholder="Offer text (optional — generates AI visual)" rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
              <button onClick={create} disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Creating…" : "Create Smart Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
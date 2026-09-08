import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2, Plus, Loader2, X, Star, Send, Share2, Sparkles, Download, QrCode, Globe, Check, Copy
} from "lucide-react";

export default function CompanyShowcase() {
  const { toast } = useToast();
  const [showcases, setShowcases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ company_name: "", website_url: "" });
  const [copied, setCopied] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.CompanyShowcase.list('-created_date', 50);
      setShowcases(list || []);
    } catch {}
    setLoading(false);
  };

  const generate = async () => {
    if (!form.company_name.trim()) { toast({ title: "Company name required", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      // 1. Scrape company intelligence + reviews
      const intelRes = await base44.functions.invoke("scrapeCompanyIntelligence", {
        company_name: form.company_name,
        website: form.website_url,
      });
      const intel = intelRes.data || {};

      // 2. Generate highlights using LLM
      const highlightRes = await base44.functions.invoke("generateContent", {
        prompt: `Create a company highlights package for ${form.company_name}${form.website_url ? ` (website: ${form.website_url})` : ""}.
Based on this intelligence data: ${JSON.stringify(intel)}.

Generate:
1. A 2-sentence company summary
2. 5 key highlights (selling points) as an array of strings
3. Format the Google reviews nicely

Return JSON with: { summary: string, highlights: string[], reviews: [{author, rating, text}] }`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
            reviews: { type: "array", items: { type: "object", properties: { author: { type: "string" }, rating: { type: "number" }, text: { type: "string" } } } },
          }
        }
      });
      const data = highlightRes.data?.output || highlightRes.output || {};
      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      // 3. Generate showcase image
      const brandKits = await base44.entities.BrandKit.filter({ is_default: true }, '-created_date', 1);
      const brand = brandKits[0];
      const imgRes = await base44.functions.invoke("generateCreativeMedia", {
        prompt: `Create a professional company showcase graphic for ${form.company_name}. Style: modern, premium, bold. Colors: ${brand?.primary_color || "#ff6b00"} and ${brand?.secondary_color || "#1a1a2e"}. Include the company name prominently with a "Company Highlights" header. Marketing brochure style.`,
        type: "image",
        content_type: "image",
      });
      const imageUrl = imgRes.data?.url || imgRes.url;

      const shareUrl = `https://xtreme-comms.base44.app/showcase/${Date.now().toString(36)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

      const created = await base44.entities.CompanyShowcase.create({
        company_name: form.company_name,
        website_url: form.website_url,
        intelligence_summary: parsed.summary || intel.summary || "",
        highlights: parsed.highlights || [],
        reviews: parsed.reviews || intel.reviews || [],
        avg_rating: (parsed.reviews || []).reduce((s, r) => s + (r.rating || 0), 0) / Math.max((parsed.reviews || []).length, 1),
        generated_image_url: imageUrl,
        showcase_url: shareUrl,
        qr_code_url: qrUrl,
        distribution_channels: ["sms", "mms", "email"],
        brand_kit_id: brand?.id,
        active: true,
      });
      setShowcases(prev => [created, ...prev]);
      toast({ title: "Showcase generated" });
      setForm({ company_name: "", website_url: "" });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const sendShowcase = async (showcase, channel, to) => {
    if (!to) { toast({ title: "Enter a recipient", variant: "destructive" }); return; }
    try {
      const message = `Check out ${showcase.company_name}!\n${showcase.highlights?.[0] || ""}\n${showcase.showcase_url}`;
      if (channel === "email") {
        await base44.functions.invoke("gatewayEmail", { to, subject: `${showcase.company_name} — Company Highlights`, body: message });
      } else {
        await base44.functions.invoke("gatewayMessages", { to, body: message, channel, image_url: showcase.generated_image_url });
      }
      toast({ title: `Showcase sent via ${channel}` });
    } catch (e) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
  };

  const copyShare = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2"><Building2 className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Company Showcase</h1>
        <p className="text-xs text-muted-foreground mt-0.5">AI-generated highlights from company intelligence + Google reviews · Shareable via SMS, MMS, Email</p>
      </div>

      {/* Generate form */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Company name *"
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="Website URL (optional)"
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
        </div>
        <button onClick={generate} disabled={generating}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating showcase…" : "Generate Company Showcase"}
        </button>
      </div>

      {/* Showcases */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : showcases.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No showcases yet. Generate one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {showcases.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {s.generated_image_url && <img src={s.generated_image_url} alt={s.company_name} className="w-full h-32 object-cover" />}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-foreground">{s.company_name}</h3>
                  {s.avg_rating > 0 && (
                    <span className="flex items-center gap-1 text-sm text-chart-4"><Star className="h-4 w-4 fill-current" /> {s.avg_rating.toFixed(1)}</span>
                  )}
                </div>
                {s.intelligence_summary && <p className="text-sm text-muted-foreground mb-3">{s.intelligence_summary}</p>}
                {s.highlights?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Highlights</p>
                    <ul className="space-y-1">
                      {s.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-status-green mt-0.5 shrink-0" /> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {s.reviews?.length > 0 && (
                  <details className="mb-3">
                    <summary className="text-xs text-primary cursor-pointer">View {s.reviews.length} Google reviews</summary>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                      {s.reviews.map((r, i) => (
                        <div key={i} className="p-2 rounded-lg bg-accent/30">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">{r.author}</p>
                            <span className="flex items-center gap-0.5 text-xs text-chart-4"><Star className="h-3 w-3 fill-current" /> {r.rating}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {s.qr_code_url && (
                    <a href={s.qr_code_url} target="_blank" rel="noopener" className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                      <QrCode className="h-3 w-3" /> QR
                    </a>
                  )}
                  <button onClick={() => copyShare(s.showcase_url)} className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                    {copied === s.showcase_url ? <Check className="h-3 w-3 text-status-green" /> : <Copy className="h-3 w-3" />} Share
                  </button>
                  <SendShowcaseButton showcase={s} onSend={sendShowcase} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SendShowcaseButton({ showcase, onSend }) {
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
              <button key={ch} onClick={() => { onSend(showcase, ch, to); setOpen(false); }}
                className="px-2 py-1 rounded text-xs bg-accent hover:bg-primary/10 capitalize">{ch}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  CreditCard, Plus, Loader2, X, Download, Share2, QrCode, Sparkles, Check, Copy
} from "lucide-react";

const CARD_STYLES = [
  { id: 1, name: "Modern Orange", bg: "linear-gradient(135deg, #ff6b00, #ff9500)", text: "#fff" },
  { id: 2, name: "Dark Executive", bg: "linear-gradient(135deg, #1a1a2e, #16213e)", text: "#fff" },
  { id: 3, name: "Gold Premium", bg: "linear-gradient(135deg, #FFD700, #C5A000)", text: "#1a1a2e" },
  { id: 4, name: "Clean White", bg: "#fff", text: "#1a1a2e", border: "border-2 border-primary" },
  { id: 5, name: "Ocean Blue", bg: "linear-gradient(135deg, #0066ff, #003d99)", text: "#fff" },
  { id: 6, name: "Emerald", bg: "linear-gradient(135deg, #00b894, #008975)", text: "#fff" },
  { id: 7, name: "Sunset", bg: "linear-gradient(135deg, #ff6b6b, #ee5a6f)", text: "#fff" },
  { id: 8, name: "Minimal", bg: "#f8f9fa", text: "#1a1a2e", border: "border border-border" },
  { id: 9, name: "Royal Purple", bg: "linear-gradient(135deg, #6c5ce7, #4834d4)", text: "#fff" },
  { id: 10, name: "Carbon", bg: "linear-gradient(135deg, #2d2d2d, #1a1a1a)", text: "#fff" },
];

export default function BusinessCardGenerator() {
  const { toast } = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", title: "", company: "", phone: "", email: "", website: "", logo_url: "", card_style: 1 });
  const [copied, setCopied] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.DigitalBusinessCard.list('-created_date', 50);
      setCards(list || []);
    } catch {}
    setLoading(false);
  };

  const create = async () => {
    if (!form.full_name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      const brandKits = await base44.entities.BrandKit.filter({ is_default: true }, '-created_date', 1);
      const brand = brandKits[0];
      const shareUrl = `https://xtreme-comms.base44.app/card/${Date.now().toString(36)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${form.full_name}\nORG:${form.company}\nTITLE:${form.title}\nTEL:${form.phone}\nEMAIL:${form.email}\nURL:${form.website}\nEND:VCARD`;
      const vcardBlob = new Blob([vcard], { type: "text/vcard" });
      const vcardUrl = URL.createObjectURL(vcardBlob);
      const created = await base44.entities.DigitalBusinessCard.create({
        ...form,
        primary_color: brand?.primary_color || "#ff6b00",
        secondary_color: brand?.secondary_color || "#1a1a2e",
        card_style: form.card_style,
        vcard_url: vcardUrl,
        qr_code_url: qrUrl,
        share_url: shareUrl,
        active: true,
      });
      setCards(prev => [created, ...prev]);
      toast({ title: "Business card created" });
      setShowForm(false);
      setForm({ full_name: "", title: "", company: "", phone: "", email: "", website: "", logo_url: "", card_style: 1 });
    } catch (e) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
  };

  const downloadVcard = (card) => {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${card.full_name}\nORG:${card.company}\nTITLE:${card.title}\nTEL:${card.phone}\nEMAIL:${card.email}\nURL:${card.website}\nEND:VCARD`;
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${card.full_name}.vcf`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyShare = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2"><CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Digital Business Cards</h1>
          <p className="text-xs text-muted-foreground mt-0.5">10 styles · Brand assets · vCard download · QR code · Shareable link</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Card</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No cards yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map(card => {
            const style = CARD_STYLES.find(s => s.id === card.card_style) || CARD_STYLES[0];
            return (
              <div key={card.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Card preview */}
                <div className="p-5" style={{ background: style.bg, color: style.text }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-display font-bold">{card.full_name}</p>
                      <p className="text-sm opacity-90">{card.title}</p>
                      <p className="text-xs opacity-75 mt-1">{card.company}</p>
                    </div>
                    {card.logo_url && <img src={card.logo_url} className="h-10 w-10 rounded object-contain" alt="logo" />}
                  </div>
                  <div className="mt-3 space-y-0.5 text-xs opacity-85">
                    {card.phone && <p>{card.phone}</p>}
                    {card.email && <p>{card.email}</p>}
                    {card.website && <p>{card.website}</p>}
                  </div>
                </div>
                {/* Actions */}
                <div className="p-3 flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => downloadVcard(card)} className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                    <Download className="h-3 w-3" /> vCard
                  </button>
                  {card.qr_code_url && (
                    <a href={card.qr_code_url} target="_blank" rel="noopener" className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                      <QrCode className="h-3 w-3" /> QR
                    </a>
                  )}
                  <button onClick={() => copyShare(card.share_url)} className="p-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1">
                    {copied === card.share_url ? <Check className="h-3 w-3 text-status-green" /> : <Copy className="h-3 w-3" />} Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">New Business Card</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name *"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Job title"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="Website"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="Logo URL (optional)"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Card Style (10 options)</label>
                <div className="grid grid-cols-5 gap-2">
                  {CARD_STYLES.map(s => (
                    <button key={s.id} onClick={() => setForm({ ...form, card_style: s.id })}
                      className={cn("h-12 rounded-lg border-2 flex items-center justify-center text-[10px] font-medium",
                        form.card_style === s.id ? "border-primary ring-2 ring-primary/30" : "border-border")}
                      style={{ background: s.bg, color: s.text }}>
                      {s.id}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{CARD_STYLES.find(s => s.id === form.card_style)?.name}</p>
              </div>
              <button onClick={create}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <Sparkles className="h-4 w-4" /> Create Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
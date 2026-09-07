import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, Image, Palette, Anchor, Flag, FileText, DollarSign, Megaphone, Quote, Loader2, Copy, Check, Download, Save, Sparkles, Trash2 } from "lucide-react";

const GENERATORS = [
  { id: "image", label: "Branded Image", icon: Image, desc: "Marketing image for MMS", contentType: "image" },
  { id: "logo", label: "Logo", icon: Palette, desc: "Brand logo design", contentType: "image" },
  { id: "hook", label: "Hook", icon: Anchor, desc: "Attention-grabbing openers", contentType: "text" },
  { id: "close", label: "Close", icon: Flag, desc: "Action-driving closers", contentType: "text" },
  { id: "bid", label: "Bid / Quote", icon: FileText, desc: "Proposal ready to send", contentType: "text" },
  { id: "pricing", label: "Pricing Sheet", icon: DollarSign, desc: "3-tier pricing table", contentType: "text" },
  { id: "promo", label: "Promo Graphic", icon: Megaphone, desc: "Promotional visual", contentType: "image" },
  { id: "testimonial", label: "Testimonial Card", icon: Quote, desc: "Social proof graphic", contentType: "image" },
];

const INDUSTRIES = ["Real Estate", "Healthcare", "Legal", "Insurance", "Financial Services", "Home Services", "E-Commerce", "Automotive", "Construction", "Technology", "Hospitality", "Education", "Fitness", "Beauty", "Other"];

export default function MmsStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeGen, setActiveGen] = useState("image");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Real Estate");
  const [brandColors, setBrandColors] = useState(["#FF6B00", "#1A1A2E"]);
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState([]);

  useEffect(() => { loadSaved(); }, [user]);

  const loadSaved = async () => {
    try {
      const items = await base44.entities.CreativeAsset.filter({ created_by_id: user?.id || "default" }, "-created_date", 20);
      setSaved(items);
    } catch (_) {}
  };

  const handleGenerate = async () => {
    const gen = GENERATORS.find(g => g.id === activeGen);
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("generateMmsCreative", {
        type: activeGen,
        company_name: companyName,
        industry,
        brand_colors: brandColors,
        context,
        target_audience: audience,
      });
      const data = res.data || res;
      setResult({ ...data, generator: gen });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!result) return;
    const gen = GENERATORS.find(g => g.id === activeGen);
    try {
      await base44.entities.CreativeAsset.create({
        type: activeGen,
        title: `${gen.label} — ${companyName || industry}`,
        content: result.content || result.image_url,
        content_type: gen.contentType,
        company_name: companyName,
        industry,
        brand_colors: brandColors,
        context,
        target_audience: audience,
      });
      toast({ title: "Saved to your creatives" });
      loadSaved();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.CreativeAsset.delete(id);
      loadSaved();
    } catch (_) {}
  };

  const activeGenerator = GENERATORS.find(g => g.id === activeGen);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-foreground">MMS Creative Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate branded images, logos, hooks, closes, bids, and pricing sheets for your MMS campaigns.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Generator picker */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Generators</h2>
          <div className="grid grid-cols-2 gap-2">
            {GENERATORS.map(g => {
              const Icon = g.icon;
              const active = activeGen === g.id;
              return (
                <button key={g.id} onClick={() => { setActiveGen(g.id); setResult(null); }}
                  className={cn("p-3 rounded-lg border text-left transition-colors",
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}>
                  <Icon className={cn("h-4 w-4 mb-1.5", active ? "text-primary" : "text-muted-foreground")} />
                  <p className={cn("text-xs font-medium", active ? "text-primary" : "text-foreground")}>{g.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{g.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Form + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Context Form */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <activeGenerator.icon className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold text-foreground">{activeGenerator.label} Generator</h2>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Corp" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Audience</label>
                <input value={audience} onChange={e => setAudience(e.target.value)}
                  placeholder="Homeowners, SMB owners..." className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Colors</label>
              <div className="flex gap-2 mt-1">
                {brandColors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="color" value={c} onChange={e => {
                      const next = [...brandColors]; next[i] = e.target.value; setBrandColors(next);
                    }} className="h-9 w-9 rounded border border-border cursor-pointer" />
                  </div>
                ))}
                <button onClick={() => setBrandColors([...brandColors, "#FFFFFF"])}
                  className="h-9 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">+ Add</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {activeGenerator.contentType === "image" ? "Description / Context" : "Product / Service Context"}
              </label>
              <textarea value={context} onChange={e => setContext(e.target.value)}
                placeholder={activeGenerator.contentType === "image" ? "e.g. Summer sale announcement, new service launch..." : "e.g. Roof replacement, 30-year warranty, free inspection..."}
                className="w-full h-20 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            </div>

            <button onClick={handleGenerate} disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : `Generate ${activeGenerator.label}`}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-xl border border-primary bg-primary/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">Result</h3>
                <div className="flex gap-2">
                  {result.content_type === "text" && (
                    <button onClick={handleCopy} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent flex items-center gap-1.5">
                      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                  {result.content_type === "image" && result.image_url && (
                    <a href={result.image_url} download className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent flex items-center gap-1.5">
                      <Download className="h-3 w-3" /> Download
                    </a>
                  )}
                  <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1.5">
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
              </div>

              {result.content_type === "image" && result.image_url ? (
                <div className="rounded-lg overflow-hidden border border-border bg-background">
                  <img src={result.image_url} alt="Generated creative" className="w-full max-h-96 object-contain" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono bg-background rounded-lg p-4 border border-border max-h-96 overflow-y-auto">{result.content}</pre>
              )}
            </div>
          )}

          {/* Saved Creatives */}
          {saved.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-medium text-foreground mb-3">Saved Creatives ({saved.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {saved.map(s => {
                  const gen = GENERATORS.find(g => g.id === s.type);
                  return (
                    <div key={s.id} className="rounded-lg border border-border bg-accent/30 p-3 relative group">
                      {s.content_type === "image" ? (
                        <img src={s.content} alt={s.title} className="w-full h-24 object-cover rounded mb-2" />
                      ) : (
                        <div className="w-full h-24 bg-background rounded border border-border p-2 mb-2 overflow-hidden">
                          <p className="text-[10px] text-muted-foreground line-clamp-4">{s.content}</p>
                        </div>
                      )}
                      <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">{gen?.label || s.type}</p>
                      <button onClick={() => handleDelete(s.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-background/80 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
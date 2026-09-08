import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Image as ImageIcon, Smile, Film, Laugh, Share2, Video, User, Upload, Loader2, Search, Sparkles, Copy } from "lucide-react";
import { Image } from "@/components/ui/image";

const GENERATORS = [
  { id: "image", label: "AI Image", icon: ImageIcon, type: "image", content_type: "image" },
  { id: "human", label: "Human Image", icon: User, type: "human_image", content_type: "image" },
  { id: "emoji", label: "Emoji Set", icon: Smile, type: "emoji", content_type: "text" },
  { id: "gif", label: "GIF Style", icon: Film, type: "gif", content_type: "image" },
  { id: "joke", label: "Jokes", icon: Laugh, type: "joke", content_type: "text" },
  { id: "social", label: "Social Media", icon: Share2, type: "social_media", content_type: "text" },
  { id: "video", label: "Video", icon: Video, type: "video", content_type: "video" },
  { id: "upload", label: "Upload", icon: Upload, type: "uploaded", content_type: "image" },
];

export default function ContentLibrary() {
  const { toast } = useToast();
  const [activeGen, setActiveGen] = useState("image");
  const [context, setContext] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [search, setSearch] = useState("");
  const [refImageUrl, setRefImageUrl] = useState("");
  const fileRef = useRef(null);
  const refImageRef = useRef(null);

  useEffect(() => { loadLibrary(); }, []);
  const loadLibrary = async () => { const a = await base44.entities.CreativeAsset.list("-created_date", 60).catch(() => []); setLibrary(a || []); };

  const generate = async () => {
    if (!context.trim()) { toast({ title: "Enter context first", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const gen = GENERATORS.find((g) => g.id === activeGen);
      if (gen.content_type === "image" || gen.content_type === "video") {
        const prompt = buildPrompt(gen.type, context, industry, audience);
        const params = { type: gen.content_type, prompt };
        if (refImageUrl) {
          params.existing_image_urls = [refImageUrl];
        }
        const res = await base44.functions.invoke("generateCreativeMedia", params);
        const url = res.data?.url || res.url;
        const asset = await base44.entities.CreativeAsset.create({ type: gen.type, title: context.slice(0, 50), content: url, content_type: gen.content_type, context, industry, target_audience: audience, prompt_used: prompt });
        setResults((prev) => [{ id: asset.id, content: url, title: asset.title, type: gen.type, content_type: gen.content_type }, ...prev]);
      } else {
        const prompt = buildPrompt(gen.type, context, industry, audience);
        const res = await base44.functions.invoke("generateContent", { prompt });
        const text = res.data?.output || res.output || "";
        const asset = await base44.entities.CreativeAsset.create({ type: gen.type, title: context.slice(0, 50), content: text, content_type: "text", context, industry, target_audience: audience, prompt_used: prompt });
        setResults((prev) => [{ id: asset.id, content: text, title: asset.title, type: gen.type, content_type: "text" }, ...prev]);
      }
      loadLibrary();
      toast({ title: "Content generated" });
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    setGenerating(false);
  };

  const handleRefUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGenerating(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setRefImageUrl(file_url);
      toast({ title: "Reference photo uploaded", description: "Now generate to create a new version based on this photo." });
    } catch (err) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    setGenerating(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGenerating(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const asset = await base44.entities.CreativeAsset.create({ type: "uploaded", title: file.name, content: file_url, content_type: "image" });
      setResults((prev) => [{ id: asset.id, content: file_url, title: file.name, type: "uploaded", content_type: "image" }, ...prev]);
      loadLibrary();
      toast({ title: "File uploaded" });
    } catch (err) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    setGenerating(false);
  };

  const filtered = library.filter((a) => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.type?.includes(search.toLowerCase()));
  const gen = GENERATORS.find((g) => g.id === activeGen);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="font-display text-sm font-bold text-foreground">Content Library</h1>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search library..." className="h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-sm w-56" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Generator tabs */}
        <div className="w-48 shrink-0 border-r border-border bg-card p-2 space-y-1">
          {GENERATORS.map((g) => (
            <button key={g.id} onClick={() => { setActiveGen(g.id); setResults([]); setRefImageUrl(""); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeGen === g.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
              <g.icon className="h-4 w-4" /> {g.label}
            </button>
          ))}
        </div>

        {/* Generator panel */}
        <div className="w-80 shrink-0 border-r border-border bg-card p-4 overflow-y-auto">
          <h2 className="font-display font-bold text-foreground mb-3">{gen.label} Generator</h2>
          {activeGen === "upload" ? (
            <div className="text-center py-8">
              <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <button onClick={() => fileRef.current?.click()} disabled={generating} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Choose File"}
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
              <p className="text-xs text-muted-foreground mt-3">Upload images or videos to your library</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Context / Topic</label><textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="What is this content about?" className="w-full p-2.5 rounded-lg border border-border bg-background text-sm resize-none" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Industry (optional)</label><input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Real Estate" className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Target Audience (optional)</label><input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Home buyers" className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-sm" /></div>
              {activeGen === "human" && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Reference Photo (optional)</p>
                  <p className="text-[10px] text-muted-foreground mb-2">Upload a photo of yourself to generate a new AI version based on your likeness.</p>
                  {refImageUrl ? (
                    <div className="flex items-center gap-2">
                      <img src={refImageUrl} alt="ref" className="h-12 w-12 rounded-lg object-cover" />
                      <button onClick={() => setRefImageUrl("")} className="text-xs text-destructive hover:underline">Remove</button>
                    </div>
                  ) : (
                    <button onClick={() => refImageRef.current?.click()} disabled={generating} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-accent">
                      <Upload className="h-3.5 w-3.5" /> Upload your photo
                    </button>
                  )}
                  <input ref={refImageRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                </div>
              )}
              <button onClick={generate} disabled={generating} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate</>}
              </button>
            </div>
          )}
          {results.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Latest Results</h3>
              <div className="space-y-2">
                {results.map((r) => <ResultCard key={r.id} item={r} />)}
              </div>
            </div>
          )}
        </div>

        {/* Library grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3">All Assets ({filtered.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((a) => <ResultCard key={a.id} item={a} showType />)}
          </div>
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center mt-12">No assets yet. Generate or upload content to build your library.</p>}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ item, showType }) {
  const { toast } = useToast();
  const copy = () => { navigator.clipboard.writeText(item.content); toast({ title: "Copied" }); };
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group">
      {item.content_type === "image" && <div className="aspect-square bg-accent"><Image src={item.content} fittingType="fill" className="w-full h-full" /></div>}
      {item.content_type === "video" && <video src={item.content} className="w-full aspect-square object-cover" controls muted />}
      {item.content_type === "text" && <div className="p-3 h-32 overflow-y-auto"><p className="text-xs text-foreground whitespace-pre-wrap">{item.content}</p></div>}
      <div className="p-2 flex items-center justify-between">
        <p className="text-xs font-medium text-foreground truncate flex-1">{item.title}</p>
        {showType && <span className="text-[9px] text-muted-foreground capitalize ml-1">{item.type}</span>}
        <button onClick={copy} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function buildPrompt(type, context, industry, audience) {
  const ctx = `Context: ${context}${industry ? ` | Industry: ${industry}` : ""}${audience ? ` | Audience: ${audience}` : ""}`;
  switch (type) {
    case "image": return `Generate a high-quality marketing image. ${ctx}. Professional, eye-catching, suitable for MMS or social media.`;
    case "human_image": return `Generate an ultra-realistic, photorealistic portrait of a person. ${ctx}. Natural lighting, professional appearance, lifelike skin texture.`;
    case "gif": return `Generate a vibrant, eye-catching animated-style image suitable for a GIF. ${ctx}. Bold colors, dynamic composition.`;
    case "emoji": return `Suggest 10 emoji combinations that represent this topic for use in messages. ${ctx}. Return as a comma-separated list of emoji sequences with brief descriptions.`;
    case "joke": return `Write 3 clean, funny jokes related to this topic suitable for business messaging. ${ctx}. Keep them light and professional.`;
    case "social_media": return `Write 3 social media posts (one for Instagram, one for Facebook, one for TikTok) about this topic. ${ctx}. Include hashtags and emojis. Make them engaging and shareable.`;
    default: return ctx;
  }
}
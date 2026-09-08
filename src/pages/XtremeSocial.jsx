import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Share2, Instagram, Facebook, Twitter, Video, MessageCircle, Loader2, Sparkles, Calendar, Image as ImageIcon, Send, BarChart3, Plus, CheckCircle2, Clock, Heart, MessageSquare, Repeat2 } from "lucide-react";

const PLATFORMS = [
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-500", bgColor: "bg-blue-500/10", desc: "Pages & business posts" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500", bgColor: "bg-pink-500/10", desc: "Business account posts & stories" },
  { id: "tiktok", name: "TikTok", icon: Video, color: "text-white", bgColor: "bg-white/10", desc: "Short-form video content" },
  { id: "twitter", name: "X / Twitter", icon: Twitter, color: "text-white", bgColor: "bg-white/10", desc: "Tweets & threads" },
  { id: "snapchat", name: "Snapchat", icon: MessageCircle, color: "text-yellow-400", bgColor: "bg-yellow-400/10", desc: "Snap content & stories" },
  { id: "linkedin", name: "LinkedIn", icon: Share2, color: "text-blue-600", bgColor: "bg-blue-600/10", desc: "Professional content" },
];

const CONTENT_TYPES = [
  { id: "post", label: "Social Post", icon: ImageIcon },
  { id: "caption", label: "Caption", icon: MessageSquare },
  { id: "hashtags", label: "Hashtags", icon: Hash },
  { id: "video_script", label: "Video Script", icon: Video },
];

function Hash({ className }) { return <span className={cn("font-bold", className)}>#</span>; }

export default function XtremeSocial() {
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState("post");
  const [platform, setPlatform] = useState("instagram");
  const [prompt, setPrompt] = useState("");
  const [scheduledPosts, setScheduledPosts] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const list = await base44.entities.CreativeAsset.filter({ type: "social_media" }).catch(() => []);
      setAssets(list || []);
    } catch { setAssets([]); }
    setLoading(false);
  };

  const generate = async () => {
    if (!prompt.trim()) { toast({ title: "Enter a prompt", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const p = PLATFORMS.find(p => p.id === platform);
      const fullPrompt = genType === "post"
        ? `Generate a social media post for ${p.name}. Context: ${prompt}. Include an engaging hook, body content, and call to action. Include 5-10 relevant hashtags.`
        : genType === "caption"
        ? `Generate a caption for a ${p.name} post about: ${prompt}. Keep it engaging and under 150 characters.`
        : genType === "hashtags"
        ? `Generate 15 relevant hashtags for a ${p.name} post about: ${prompt}. Format as comma-separated.`
        : `Generate a 30-second video script for ${p.name} about: ${prompt}. Include visual cues and voiceover text.`;

      const res = await base44.functions.invoke("generateContent", { prompt: fullPrompt });
      const content = res.data?.output || res.output || "";

      const asset = await base44.entities.CreativeAsset.create({
        type: "social_media",
        title: `${p.name} ${genType}: ${prompt.slice(0, 40)}`,
        content,
        content_type: "text",
        tags: [platform, genType, "social_media"],
        context: prompt,
      });
      setAssets(prev => [asset, ...prev]);
      toast({ title: "Content generated!", description: `${p.name} ${genType} created` });
      setPrompt("");
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    setGenerating(false);
  };

  const schedulePost = async (asset) => {
    setScheduledPosts(prev => [...prev, { id: asset.id, asset, scheduledFor: new Date(Date.now() + 3600000).toISOString(), status: "scheduled" }]);
    toast({ title: "Post scheduled", description: `Scheduled for ${new Date(Date.now() + 3600000).toLocaleTimeString()}` });
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1 flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" /> Xtreme Social
        </h1>
        <p className="text-sm text-muted-foreground">AI-powered social media content generation and scheduling across all major platforms.</p>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setPlatform(p.id)}
            className={cn("rounded-xl border p-4 text-center transition-all",
              platform === p.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/30")}>
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2", p.bgColor)}>
              <p.icon className={cn("h-5 w-5", p.color)} />
            </div>
            <p className="text-xs font-medium text-foreground">{p.name}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-display font-bold text-foreground mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Content Generator</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {CONTENT_TYPES.map(c => (
            <button key={c.id} onClick={() => setGenType(c.id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm",
                genType === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          ))}
        </div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder={`Describe your ${PLATFORMS.find(p => p.id === platform)?.name} post... (e.g., "Promote our new AI voice agent service for real estate agents")`}
          className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none mb-3" />
        <button onClick={generate} disabled={generating || !prompt.trim()}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Content</>}
        </button>
      </div>

      {/* Scheduled posts */}
      {scheduledPosts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="font-display font-bold text-foreground mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Scheduled Posts ({scheduledPosts.length})</h2>
          <div className="space-y-2">
            {scheduledPosts.map(sp => (
              <div key={sp.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/30">
                <Clock className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{sp.asset.title}</p>
                  <p className="text-xs text-muted-foreground">Scheduled for {new Date(sp.scheduledFor).toLocaleString()}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">{sp.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content library */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display font-bold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Generated Content ({assets.length})</h2>
        {assets.length === 0 ? (
          <div className="text-center py-8">
            <Share2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No social content yet. Generate your first post above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assets.map(a => (
              <div key={a.id} className="rounded-lg border border-border bg-accent/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">{(a.tags || [])[0] || "social"}</span>
                  <button onClick={() => schedulePost(a)} className="text-xs text-primary hover:underline flex items-center gap-1"><Send className="h-3 w-3" /> Schedule</button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{a.content}</p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Heart className="h-3 w-3" /> Like</button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><MessageSquare className="h-3 w-3" /> Comment</button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Repeat2 className="h-3 w-3" /> Share</button>
                  <button onClick={() => { navigator.clipboard.writeText(a.content); toast({ title: "Copied!" }); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
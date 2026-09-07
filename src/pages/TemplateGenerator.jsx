import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, Save, ArrowLeft, Mail, MessageSquare, Phone, Copy, Check } from "lucide-react";

const INDUSTRIES = ["Real Estate", "Healthcare", "E-Commerce", "Financial Services", "Legal", "Insurance", "Home Services", "Education", "Technology", "Hospitality", "Automotive", "Construction", "Other"];
const CHANNELS = ["sms", "email", "voice", "whatsapp"];
const SITUATIONS = ["Sales Outreach", "Follow-Up", "Appointment Reminder", "Customer Support", "Re-engagement", "Nurture Sequence", "Objection Handling", "Closing"];
const TONES = ["Professional", "Friendly", "Casual", "Urgent", "Empathetic", "Persuasive", "Consultative", "Energetic"];

export default function TemplateGenerator() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    industry: "Real Estate",
    channel: "sms",
    situation: "Sales Outreach",
    tone: "Professional",
    target_audience: "",
    company_name: "",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setTemplates(await base44.entities.CommunicationTemplate.list('-created_date', 20)); }
    catch (_) {}
  };

  const generate = async () => {
    setGenerating(true);
    setGenerated(null);
    try {
      const res = await base44.functions.invoke('generateContent', {
        prompt: `Generate a ${form.channel} communication template for the ${form.industry} industry.
Situation: ${form.situation}
Tone: ${form.tone}
Company: ${form.company_name || "the company"}
Target audience: ${form.target_audience || "potential customers"}

${form.channel === "sms" ? "Keep under 160 characters. Include a clear call to action." : 
  form.channel === "email" ? "Include a subject line and 2-3 paragraph body." :
  form.channel === "voice" ? "Write as a spoken script under 60 seconds." :
  "Keep under 300 characters. WhatsApp format."}

Also provide:
1. Psychology notes: Why this template works (psychological triggers)
2. High-response words: 3-5 words that drive engagement
3. Words to avoid: 2-3 words that reduce response rates

Format as:
TEMPLATE_BODY: [the template]
PSYCHOLOGY_NOTES: [why it works]
HIGH_RESPONSE_WORDS: [word1, word2, word3]
WORDS_TO_AVOID: [word1, word2]`,
      });
      const output = res.data?.output;
      const text = typeof output === "string" ? output : JSON.stringify(output);
      const bodyMatch = text.match(/TEMPLATE_BODY:\s*(.+?)(?=PSYCHOLOGY_NOTES:|$)/s);
      const psychMatch = text.match(/PSYCHOLOGY_NOTES:\s*(.+?)(?=HIGH_RESPONSE_WORDS:|$)/s);
      const hrwMatch = text.match(/HIGH_RESPONSE_WORDS:\s*(.+?)(?=WORDS_TO_AVOID:|$)/s);
      const wtaMatch = text.match(/WORDS_TO_AVOID:\s*(.+)/s);
      setGenerated({
        template_body: bodyMatch?.[1]?.trim() || text,
        psychology_notes: psychMatch?.[1]?.trim() || "",
        high_response_words: hrwMatch?.[1]?.split(",").map(w => w.trim()).filter(Boolean) || [],
        words_to_avoid: wtaMatch?.[1]?.split(",").map(w => w.trim()).filter(Boolean) || [],
      });
      toast({ title: "Template generated!", description: `${form.channel} · ${form.industry} · ${form.situation}` });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const save = async () => {
    if (!generated) return;
    try {
      await base44.entities.CommunicationTemplate.create({
        industry: form.industry,
        channel: form.channel,
        situation: form.situation.toLowerCase().replace(/\s+/g, '_'),
        tone: form.tone.toLowerCase(),
        template_body: generated.template_body,
        psychology_notes: generated.psychology_notes,
        high_response_words: generated.high_response_words,
        words_to_avoid: generated.words_to_avoid,
        target_audience: form.target_audience,
        active: true,
      });
      toast({ title: "Template saved!", description: "Added to your template library" });
      await load();
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };

  const copy = () => {
    navigator.clipboard.writeText(generated.template_body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
      <h1 className="text-2xl font-display font-bold text-foreground mb-1">Template Generator</h1>
      <p className="text-sm text-muted-foreground mb-6">Generate high-converting communication templates for any industry, channel, and situation.</p>

      {/* Config */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry</label>
            <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel</label>
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {CHANNELS.map(c => <option key={c} value={c} className="capitalize">{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Situation</label>
            <select value={form.situation} onChange={e => setForm({ ...form, situation: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {SITUATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</label>
            <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name</label>
            <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
              placeholder="Acme Corp" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Audience</label>
            <input value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
              placeholder="Homeowners in South Florida" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={generate} disabled={generating}
          className="w-full py-2.5 rounded-lg gold-gradient text-black font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating..." : "Generate Template"}
        </button>
      </div>

      {/* Generated Template */}
      {generated && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-foreground flex items-center gap-2">
              {form.channel === "email" ? <Mail className="h-4 w-4 text-primary" /> : form.channel === "voice" ? <Phone className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
              Generated Template
            </h2>
            <div className="flex gap-2">
              <button onClick={copy} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent flex items-center gap-1">
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />} {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={save} className="px-3 py-1.5 rounded-lg gold-gradient text-black text-xs font-medium hover:opacity-90 flex items-center gap-1">
                <Save className="h-3 w-3" /> Save to Library
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-body">{generated.template_body}</pre>
          </div>
          {generated.psychology_notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Psychology Notes</p>
              <p className="text-sm text-foreground">{generated.psychology_notes}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {generated.high_response_words.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">High-Response Words</p>
                <div className="flex flex-wrap gap-1.5">
                  {generated.high_response_words.map(w => <span key={w} className="px-2 py-0.5 rounded bg-status-green/10 text-status-green text-xs">{w}</span>)}
                </div>
              </div>
            )}
            {generated.words_to_avoid.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Words to Avoid</p>
                <div className="flex flex-wrap gap-1.5">
                  {generated.words_to_avoid.map(w => <span key={w} className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs">{w}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Templates */}
      {templates.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium text-foreground mb-3">Saved Templates ({templates.length})</h2>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="p-3 rounded-lg border border-border bg-accent/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary uppercase">{t.channel}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{t.industry}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground capitalize">{t.situation?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground capitalize">{t.tone}</span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">{t.template_body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
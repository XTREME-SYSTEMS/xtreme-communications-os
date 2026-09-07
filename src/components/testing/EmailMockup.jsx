import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Send, Sparkles, Loader2, Mail } from "lucide-react";

export default function EmailMockup({ agents }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sentEmails, setSentEmails] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const t = await base44.entities.CommunicationTemplate.filter({ channel: "email" });
      setTemplates(t || []);
    } catch (_) { setTemplates([]); }
  };

  const applyTemplate = (id) => {
    setSelectedTemplate(id);
    const t = templates.find(t => t.id === id);
    if (t) {
      setBody(t.template_body);
      setSubject(`${t.situation} - ${t.tone}`);
    }
  };

  const generateWithAI = async () => {
    if (!toEmail.trim()) { toast({ title: "Enter a recipient email first", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateContent", {
        prompt: `Write a professional outreach email. Subject line on the first line, then a blank line, then the email body (3 short paragraphs). Tone: professional and friendly. The email should feel personalized and human, not robotic. Keep it concise.`,
      });
      const output = res.data?.output || "";
      const lines = output.split("\n");
      setSubject(lines[0]?.replace(/^Subject:\s*/i, "").trim() || "Quick follow-up");
      setBody(lines.slice(1).join("\n").trim());
      toast({ title: "Email generated with AI" });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSend = async () => {
    if (!body.trim()) { toast({ title: "Email body required", variant: "destructive" }); return; }
    if (!toEmail.trim()) { toast({ title: "Recipient email required", variant: "destructive" }); return; }
    setSending(true);
    const email = {
      from: fromEmail || "your-agent@xtreme-comms.com",
      to: toEmail,
      subject: subject || "(no subject)",
      body,
      timestamp: new Date().toISOString(),
    };
    setSentEmails(prev => [email, ...prev]);
    try {
      await base44.entities.TestSession.create({
        test_type: "email",
        to_email: toEmail,
        template_body: body,
        messages: [{ direction: "outbound", channel: "email", body, timestamp: email.timestamp }],
        result: "pass",
      });
      toast({ title: "Test email sent", description: `To: ${toEmail}` });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
    setBody(""); setSubject(""); setSelectedTemplate("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Desktop Mockup */}
      <div className="flex justify-center">
        <div className="w-full max-w-[440px]">
          {/* Monitor frame */}
          <div className="rounded-xl border-[4px] border-foreground/20 bg-background shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="h-8 bg-accent flex items-center gap-1.5 px-3 border-b border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-status-green/60" />
              <div className="flex-1 ml-3 h-4 rounded bg-background border border-border flex items-center px-2">
                <span className="text-[8px] text-muted-foreground">mail.google.com / inbox</span>
              </div>
            </div>
            {/* Email client */}
            <div className="h-[460px] flex flex-col">
              {/* Sidebar */}
              <div className="flex flex-1 overflow-hidden">
                <div className="w-12 bg-accent/50 border-r border-border p-2 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-accent" />
                  <div className="w-8 h-8 rounded-lg bg-accent" />
                </div>
                {/* Email list / preview */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
                  {sentEmails.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center px-4">
                      <div>
                        <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Sent emails will appear here in the desktop email mockup</p>
                      </div>
                    </div>
                  ) : sentEmails.map((email, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                          {email.from[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-foreground truncate">To: {email.to}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(email.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{email.subject}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug whitespace-pre-wrap line-clamp-4">{email.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Monitor stand */}
          <div className="w-20 h-3 bg-foreground/20 mx-auto rounded-b-lg" />
          <div className="w-32 h-1 bg-foreground/10 mx-auto rounded-full" />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Template</label>
          <select value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}
            className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
            <option value="">Custom email (no template)</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.situation} · {t.tone}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From (Your Email)</label>
            <input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="agent@yourcompany.com"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To (Receiving)</label>
            <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="prospect@example.com"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line"
            className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email or generate with AI..."
            className="w-full h-40 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
          <button onClick={generateWithAI} disabled={generating}
            className="mt-2 px-4 py-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/10 flex items-center gap-1.5">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? "Generating..." : "Generate with AI"}
          </button>
        </div>
        <button onClick={handleSend} disabled={sending}
          className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Sending..." : "Send Test Email"}
        </button>
      </div>
    </div>
  );
}
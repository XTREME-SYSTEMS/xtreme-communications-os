import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Send, Image as ImageIcon, Loader2, Phone, X } from "lucide-react";

export default function SmsMockup({ agents, numbers }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [conversation, setConversation] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTemplates();
    if (numbers.length > 0 && !fromNumber) setFromNumber(numbers[0].e164);
  }, [numbers]);

  const loadTemplates = async () => {
    try {
      const t = await base44.entities.CommunicationTemplate.filter({ channel: "sms" });
      setTemplates(t || []);
    } catch (_) { setTemplates([]); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast({ title: "Image attached" });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSend = async () => {
    if (!message.trim() && !imageUrl) { toast({ title: "Message or image required", variant: "destructive" }); return; }
    if (!toNumber.trim()) { toast({ title: "Receiving number required", variant: "destructive" }); return; }
    setSending(true);
    const msg = {
      direction: "outbound",
      channel: imageUrl ? "mms" : "sms",
      body: message,
      image_url: imageUrl,
      timestamp: new Date().toISOString(),
    };
    setConversation(prev => [...prev, msg]);

    try {
      await base44.entities.TestSession.create({
        test_type: imageUrl ? "mms" : "sms",
        from_number: fromNumber,
        to_number: toNumber,
        template_body: selectedTemplate,
        image_url: imageUrl,
        messages: [...conversation, msg],
        result: "pass",
      });

      // Simulate inbound reply using AI
      const res = await base44.functions.invoke("generateContent", {
        prompt: `You are a prospect receiving this ${imageUrl ? "MMS" : "SMS"} message from a business: "${message}". Reply naturally as the prospect would — short, casual, realistic. Max 160 chars. Just the reply text, no quotes.`,
      });
      const reply = (res.data?.output || "Thanks, got it!").trim();
      setTimeout(() => {
        setConversation(prev => [...prev, {
          direction: "inbound",
          channel: "sms",
          body: reply,
          timestamp: new Date().toISOString(),
        }]);
        setSending(false);
      }, 1500);
    } catch (e) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
      setSending(false);
    }
    setMessage("");
    setImageUrl(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Phone Mockup */}
      <div className="flex justify-center">
        <div className="w-[300px] bg-background rounded-[2.5rem] border-[3px] border-foreground/20 shadow-2xl p-3">
          {/* Notch */}
          <div className="w-24 h-5 bg-foreground/20 rounded-full mx-auto mb-2" />
          {/* Screen */}
          <div className="rounded-[2rem] bg-gradient-to-b from-accent to-background h-[520px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">
                {fromNumber?.slice(-2) || "??"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{fromNumber || "Your Number"}</p>
                <p className="text-[9px] opacity-80">to {toNumber || "Recipient"}</p>
              </div>
              <Phone className="h-3.5 w-3.5 opacity-70" />
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {conversation.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center px-4">Send a test message to see it appear here</p>
                </div>
              ) : conversation.map((m, i) => (
                <div key={i} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-2xl px-3 py-2",
                    m.direction === "outbound" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm")}>
                    {m.image_url && (
                      <img src={m.image_url} alt="MMS" className="rounded-lg mb-1 max-h-32 w-full object-cover" />
                    )}
                    {m.body && <p className="text-xs leading-snug">{m.body}</p>}
                    <p className="text-[8px] opacity-60 mt-0.5">{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Input bar */}
            <div className="p-2 border-t border-border bg-card flex items-center gap-2">
              <div className="flex-1 h-8 rounded-full bg-accent flex items-center px-3">
                <span className="text-[10px] text-muted-foreground">Type a message...</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Template</label>
          <select value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); const t = templates.find(t => t.id === e.target.value); if (t) setMessage(t.template_body); }}
            className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
            <option value="">Custom message (no template)</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.situation} · {t.tone}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your SMS/MMS message..."
            className="w-full h-24 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attach Image (MMS)</label>
          {imageUrl ? (
            <div className="relative mt-1 rounded-lg border border-border overflow-hidden">
              <img src={imageUrl} alt="Attachment" className="max-h-32 w-full object-cover" />
              <button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="mt-1 flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
              {uploading ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">Click to upload an image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From (Your Number)</label>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              {numbers.length === 0 ? <option value="">No numbers</option> : numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To (Receiving)</label>
            <input value={toNumber} onChange={e => setToNumber(e.target.value)} placeholder="+1 555 0100"
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={handleSend} disabled={sending}
          className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Sending..." : "Send Test Message"}
        </button>
      </div>
    </div>
  );
}
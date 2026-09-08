import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { X, Loader2, Send, Users } from "lucide-react";

// Bulk action bar for selected CRM contacts — send SMS, email, MMS, WhatsApp, or call.
export default function BulkActionBar({ selectedIds, contacts, onClear, onDone }) {
  const { toast } = useToast();
  const [action, setAction] = useState(null); // null | 'sms' | 'email' | 'mms' | 'whatsapp' | 'call'
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));
  const validContacts = selectedContacts.filter(c => {
    if (action === "email") return c.email;
    return c.phone;
  });

  const execute = async () => {
    if (!action) return;
    if (action !== "call" && !message.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    setSending(true);
    let success = 0;
    let failed = 0;

    for (const contact of validContacts) {
      try {
        if (action === "email") {
          await base44.functions.invoke("gatewayEmail", {
            to: contact.email,
            subject: subject || "Following up",
            body: message,
          });
        } else {
          await base44.functions.invoke("gatewayMessages", {
            to: contact.phone,
            body: message,
            channel: action,
          });
        }
        // Update last contacted
        await base44.entities.XtremeCrmContact.update(contact.id, {
          last_contacted_at: new Date().toISOString(),
          last_contact_channel: action,
          follow_up_count: (contact.follow_up_count || 0) + 1,
        });
        success++;
      } catch {
        failed++;
      }
    }

    toast({
      title: `Bulk ${action} complete`,
      description: `${success} sent${failed > 0 ? `, ${failed} failed` : ""}`,
      variant: failed > success ? "destructive" : "default",
    });
    setSending(false);
    setAction(null);
    setMessage("");
    setSubject("");
    onDone();
  };

  if (selectedIds.length === 0) return null;

  const ACTIONS = [
    { v: "sms", label: "SMS", icon: "💬" },
    { v: "mms", label: "MMS", icon: "🖼️" },
    { v: "email", label: "Email", icon: "📧" },
    { v: "whatsapp", label: "WhatsApp", icon: "🟢" },
    { v: "call", label: "Call", icon: "📞" },
  ];

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-2xl">
      <div className="rounded-xl border border-primary bg-card shadow-2xl p-3">
        {!action ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground shrink-0">
              <Users className="h-4 w-4 text-primary" /> {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {ACTIONS.map(a => (
                <button key={a.v} onClick={() => setAction(a.v)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1.5">
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
            <button onClick={onClear} className="text-muted-foreground hover:text-foreground px-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground capitalize">Bulk {action} → {validContacts.length} contacts</span>
              <button onClick={() => setAction(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {action === "email" && (
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            )}
            {action !== "call" && (
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
            )}
            {action === "call" && (
              <p className="text-xs text-muted-foreground p-2">AI agents will call {validContacts.length} contacts sequentially using your configured voice agent.</p>
            )}
            <div className="flex gap-2">
              <button onClick={execute} disabled={sending || validContacts.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending…" : `Send to ${validContacts.length}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
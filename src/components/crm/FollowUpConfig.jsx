import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Phone, Mail, MessageSquare, MessageCircle, Image, X, Loader2, Calendar, Clock, Repeat, Send } from "lucide-react";

// Follow-up configuration for a CRM contact.
export default function FollowUpConfig({ contact, onUpdate, onClose }) {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    follow_up_enabled: contact.follow_up_enabled || false,
    follow_up_frequency_days: contact.follow_up_frequency_days || 3,
    follow_up_method: contact.follow_up_method || "sms",
    follow_up_automated: contact.follow_up_automated || false,
    next_follow_up_at: contact.next_follow_up_at ? contact.next_follow_up_at.slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const nextDate = config.follow_up_enabled && config.next_follow_up_at
        ? new Date(config.next_follow_up_at).toISOString()
        : null;
      const updated = await base44.entities.XtremeCrmContact.update(contact.id, {
        follow_up_enabled: config.follow_up_enabled,
        follow_up_frequency_days: parseInt(config.follow_up_frequency_days) || 3,
        follow_up_method: config.follow_up_method,
        follow_up_automated: config.follow_up_automated,
        next_follow_up_at: nextDate,
      });
      onUpdate(updated);
      toast({ title: "Follow-up saved" });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> Follow-Up Automation</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          {/* Enable */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Follow-Ups</p>
              <p className="text-xs text-muted-foreground">Automatically remind you to follow up</p>
            </div>
            <input type="checkbox" checked={config.follow_up_enabled}
              onChange={e => setConfig({ ...config, follow_up_enabled: e.target.checked })}
              className="h-5 w-5 accent-primary" />
          </label>

          {config.follow_up_enabled && (
            <>
              {/* Frequency */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3 w-3" /> Frequency (days between follow-ups)
                </label>
                <input type="number" min="1" max="90" value={config.follow_up_frequency_days}
                  onChange={e => setConfig({ ...config, follow_up_frequency_days: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>

              {/* Method */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Communication Method</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { v: "voice", icon: Phone, label: "Voice" },
                    { v: "sms", icon: MessageSquare, label: "SMS" },
                    { v: "mms", icon: Image, label: "MMS" },
                    { v: "email", icon: Mail, label: "Email" },
                    { v: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
                  ].map(m => (
                    <button key={m.v} onClick={() => setConfig({ ...config, follow_up_method: m.v })}
                      className={cn("flex flex-col items-center gap-1 py-2 rounded-lg border text-xs",
                        config.follow_up_method === m.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                      <m.icon className="h-4 w-4" /> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next follow-up date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Calendar className="h-3 w-3" /> Next Follow-Up Date
                </label>
                <input type="datetime-local" value={config.next_follow_up_at}
                  onChange={e => setConfig({ ...config, next_follow_up_at: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
              </div>

              {/* Automate */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Send className="h-3.5 w-3.5 text-primary" /> Auto-Send Follow-Ups</p>
                  <p className="text-xs text-muted-foreground">AI agent sends automatically on schedule</p>
                </div>
                <input type="checkbox" checked={config.follow_up_automated}
                  onChange={e => setConfig({ ...config, follow_up_automated: e.target.checked })}
                  className="h-5 w-5 accent-primary" />
              </label>
            </>
          )}

          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />} Save Follow-Up
          </button>
        </div>
      </div>
    </div>
  );
}
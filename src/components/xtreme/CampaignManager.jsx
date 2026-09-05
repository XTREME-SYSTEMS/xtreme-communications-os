import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Megaphone, Play, Square, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_DOT = {
  draft: "bg-text-muted", scheduled: "bg-chart-4", running: "bg-accent-orange animate-pulse",
  completed: "bg-status-green", cancelled: "bg-destructive",
};
const CHANNEL_DOT = { sms: "bg-chart-3", voice: "bg-chart-2", mms: "bg-chart-4", whatsapp: "bg-status-green", rcs: "bg-chart-5" };

export default function CampaignManager({ campaigns, segments, tenants, onMutate }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", channel: "sms", message_template: "", throttle_per_sec: 10, rate_limit_per_sec: 25, segment_id: "" });
  const [launching, setLaunching] = useState(null);

  const create = async () => {
    if (!form.name) return toast({ title: "Name required", variant: "destructive" });
    try {
      await base44.entities.Campaign.create({ ...form, tenant_id: tenants[0]?.id || "demo", status: "draft", schedule_type: "immediate", classification: "SANDBOX", total_recipients: 0, sent_count: 0, delivered_count: 0, failed_count: 0, opt_out_count: 0 });
      setForm({ name: "", channel: "sms", message_template: "", throttle_per_sec: 10, rate_limit_per_sec: 25, segment_id: "" });
      onMutate();
      toast({ title: "Campaign created" });
    } catch (e) { toast({ title: "Create failed", description: String(e.message || e), variant: "destructive" }); }
  };

  const launch = async (id) => {
    setLaunching(id);
    try {
      await base44.entities.Campaign.update(id, { status: "running", started_at: new Date().toISOString() });
      onMutate();
      toast({ title: "Campaign launched", description: "Blast dispatching with throttle + rate-limit guards" });
    } catch (e) { toast({ title: "Launch failed", description: String(e.message || e), variant: "destructive" }); }
    finally { setLaunching(null); }
  };

  const cancel = async (id) => {
    await base44.entities.Campaign.update(id, { status: "cancelled" });
    onMutate();
    toast({ title: "Campaign cancelled" });
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface">
      <div className="px-4 h-11 flex items-center gap-2 border-b border-surface-border">
        <Megaphone className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase">Campaign Engine</span>
        <span className="ml-auto text-[10px] text-text-muted font-display">{campaigns.length} total</span>
      </div>
      <div className="p-4 space-y-3 border-b border-surface-border">
        <div className="grid grid-cols-2 gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name"
            className="col-span-2 h-9 px-3 rounded bg-base border border-surface-border text-[12px] placeholder:text-text-muted focus:outline-none focus:border-accent-orange" />
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="h-9 px-2 rounded bg-base border border-surface-border text-[12px] focus:outline-none focus:border-accent-orange">
            {["sms", "voice", "mms", "whatsapp", "rcs"].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <select value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })}
            className="h-9 px-2 rounded bg-base border border-surface-border text-[12px] focus:outline-none focus:border-accent-orange">
            <option value="">No segment</option>
            {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })} placeholder="Message template"
            className="col-span-2 h-9 px-3 rounded bg-base border border-surface-border text-[12px] placeholder:text-text-muted focus:outline-none focus:border-accent-orange" />
          <input type="number" value={form.throttle_per_sec} onChange={(e) => setForm({ ...form, throttle_per_sec: +e.target.value })} placeholder="Throttle/s"
            className="h-9 px-3 rounded bg-base border border-surface-border text-[12px] focus:outline-none focus:border-accent-orange" />
          <input type="number" value={form.rate_limit_per_sec} onChange={(e) => setForm({ ...form, rate_limit_per_sec: +e.target.value })} placeholder="Rate limit/s"
            className="h-9 px-3 rounded bg-base border border-surface-border text-[12px] focus:outline-none focus:border-accent-orange" />
        </div>
        <button onClick={create} className="w-full h-9 flex items-center justify-center gap-1.5 rounded bg-accent-orange/10 border border-accent-orange/40 text-accent-orange text-[11px] font-display uppercase tracking-wider hover:bg-accent-orange/20">
          <Plus className="h-3.5 w-3.5" /> Create Campaign
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {campaigns.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-text-muted">No campaigns yet</div>
        ) : campaigns.map((c) => (
          <div key={c.id} className="px-4 py-3 border-b border-surface-border hover:bg-base/50">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[c.status] || "bg-text-muted")} />
              <span className={cn("h-1.5 w-1.5 rounded-full", CHANNEL_DOT[c.channel])} />
              <span className="text-[12px] text-text-primary truncate flex-1">{c.name}</span>
              <span className="text-[9px] font-display uppercase text-text-muted">{c.channel}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] font-display text-text-muted">
              <span className="text-status-green">DLV {c.delivered_count || 0}</span>
              <span className="text-chart-3">SNT {c.sent_count || 0}</span>
              <span className="text-destructive">FLD {c.failed_count || 0}</span>
              <span className="text-text-muted">OPT {c.opt_out_count || 0}</span>
              <span className="text-text-muted">/ {c.total_recipients || 0}</span>
              <span className="ml-auto">THR {c.throttle_per_sec}/s</span>
            </div>
            {(c.status === "draft" || c.status === "running") && (
              <div className="mt-2 flex gap-2">
                {c.status === "draft" && (
                  <button onClick={() => launch(c.id)} disabled={launching === c.id}
                    className="flex items-center gap-1 h-7 px-2.5 rounded border border-status-green/40 text-status-green text-[10px] font-display uppercase hover:bg-status-green/10 disabled:opacity-50">
                    <Play className="h-3 w-3" /> {launching === c.id ? "..." : "Launch"}
                  </button>
                )}
                {c.status === "running" && (
                  <button onClick={() => cancel(c.id)}
                    className="flex items-center gap-1 h-7 px-2.5 rounded border border-destructive/40 text-destructive text-[10px] font-display uppercase hover:bg-destructive/10">
                    <Square className="h-3 w-3" /> Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
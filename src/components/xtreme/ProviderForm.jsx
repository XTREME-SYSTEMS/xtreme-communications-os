import { useState } from "react";
import { cn } from "@/lib/utils";

const TYPES = ["twilio", "telnyx", "plivo", "vonage", "bandwidth", "custom"];
const CHANNELS = ["sms", "mms", "voice", "whatsapp", "sip", "verify", "lookup"];
const SECRET_HINT = {
  twilio: "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in Secrets",
  telnyx: "Set TELNYX_API_KEY in Secrets",
  plivo: "Set PLIVO_AUTH_ID + PLIVO_AUTH_TOKEN in Secrets",
  vonage: "Set VONAGE_API_KEY + VONAGE_API_SECRET in Secrets",
  bandwidth: "Set BANDWIDTH_* credentials in Secrets",
  custom: "Configure adapter credentials in Secrets",
};

export default function ProviderForm({ value, onSave, onCancel }) {
  const [form, setForm] = useState(value || {
    name: "", type: "twilio", channels: ["sms"], priority: 100,
    failover_group: "", base_url: "", credentials_secret: "", enabled: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleChannel = (ch) => setForm(f => ({
    ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
  }));

  const submit = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim(), priority: Number(form.priority) || 100 });
  };

  const inputCls = "w-full h-9 bg-base border border-surface-border rounded px-2.5 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/50";

  return (
    <div className="rounded-lg border border-accent-orange/30 bg-surface p-4 flex flex-col gap-3">
      <div className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">{value ? "Edit Provider" : "New Provider"}</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-display uppercase tracking-wider text-text-muted">Name</label>
          <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Primary SMS Carrier" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-display uppercase tracking-wider text-text-muted">Type</label>
          <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-display uppercase tracking-wider text-text-muted">Channels</label>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map(ch => (
            <button key={ch} type="button" onClick={() => toggleChannel(ch)}
              className={cn("px-2 h-7 rounded text-[10px] font-display uppercase tracking-wider border",
                form.channels.includes(ch) ? "border-accent-orange/50 text-accent-orange bg-accent-orange/10" : "border-surface-border text-text-muted")}>
              {ch}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-display uppercase tracking-wider text-text-muted">Priority</label>
          <input type="number" className={inputCls} value={form.priority} onChange={e => set("priority", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-display uppercase tracking-wider text-text-muted">Failover Group</label>
          <input className={inputCls} value={form.failover_group} onChange={e => set("failover_group", e.target.value)} placeholder="sms-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-display uppercase tracking-wider text-text-muted">Base URL</label>
          <input className={inputCls} value={form.base_url} onChange={e => set("base_url", e.target.value)} placeholder="auto" />
        </div>
      </div>
      <div className="text-[10px] text-text-muted font-display tracking-wider">{SECRET_HINT[form.type]}</div>
      <label className="flex items-center gap-2 text-[11px] text-text-muted">
        <input type="checkbox" checked={form.enabled} onChange={e => set("enabled", e.target.checked)} className="accent-accent-orange h-4 w-4" />
        Enabled
      </label>
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 h-9 rounded bg-accent-orange text-base text-[11px] font-display uppercase tracking-wider">Save</button>
        <button onClick={onCancel} className="h-9 px-4 rounded border border-surface-border text-text-muted text-[11px] font-display uppercase tracking-wider hover:text-text-primary">Cancel</button>
      </div>
    </div>
  );
}
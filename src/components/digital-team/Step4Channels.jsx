import React from 'react';
import { MessageSquare, Image, MessageCircle, Phone, Mail, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHANNELS = [
  { id: 'sms', label: 'SMS', icon: MessageSquare, desc: 'Text message outreach' },
  { id: 'mms', label: 'MMS', icon: Image, desc: 'Media-rich messaging' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, desc: 'WhatsApp Business messaging' },
  { id: 'voice', label: 'Voice', icon: Phone, desc: 'AI voice calls' },
  { id: 'email', label: 'Email', icon: Mail, desc: 'Email campaigns' },
  { id: 'social_media', label: 'Social Media', icon: Share2, desc: 'Social posting & DMs' },
];

export default function Step4Channels({ data, update }) {
  const toggle = (id) => {
    const current = data.channels || [];
    update({ channels: current.includes(id) ? current.filter(c => c !== id) : [...current, id] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Communication Channels</h2>
        <p className="text-sm text-muted-foreground mt-1">Which channels will your AI team use? Select all that apply.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CHANNELS.map(c => {
          const selected = (data.channels || []).includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
            >
              <c.icon className={cn("w-8 h-8 mx-auto mb-2", selected ? "text-primary" : "text-muted-foreground")} />
              <h3 className="font-semibold text-sm">{c.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <input type="checkbox" id="all-channels" checked={(data.channels || []).length === 6} onChange={e => update({ channels: e.target.checked ? CHANNELS.map(c => c.id) : ['sms'] })} className="w-4 h-4" />
        <label htmlFor="all-channels" className="text-sm font-medium cursor-pointer">Select all channels (omnichannel team)</label>
      </div>
    </div>
  );
}
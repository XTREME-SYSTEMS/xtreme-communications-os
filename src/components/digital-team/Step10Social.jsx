import React from 'react';
import { cn } from '@/lib/utils';
import { Facebook, Instagram, Linkedin, Twitter, Music2, Share2 } from 'lucide-react';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter },
  { id: 'tiktok', label: 'TikTok', icon: Music2 },
];

export default function Step10Social({ data, update }) {
  const togglePlatform = (id) => {
    const current = data.social_platforms || [];
    update({ social_platforms: current.includes(id) ? current.filter(p => p !== id) : [...current, id] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Social Media Automation</h2>
        <p className="text-sm text-muted-foreground mt-1">Enable automated social media management: scheduled posting, content creation, and engagement.</p>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-border">
        <input type="checkbox" id="social-enabled" checked={data.social_media_enabled || false}
          onChange={e => update({ social_media_enabled: e.target.checked })} className="w-5 h-5" />
        <label htmlFor="social-enabled" className="flex items-center gap-2 cursor-pointer">
          <Share2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Enable Social Media Automation</span>
        </label>
      </div>
      {data.social_media_enabled && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Select platforms to automate:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PLATFORMS.map(p => {
              const selected = (data.social_platforms || []).includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <p.icon className={cn("w-8 h-8", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              );
            })}
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Your AI team will automatically create content, schedule posts, and manage engagement across selected platforms during work hours.
          </div>
        </div>
      )}
    </div>
  );
}
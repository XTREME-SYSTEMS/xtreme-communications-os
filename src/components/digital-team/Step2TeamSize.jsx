import React from 'react';
import { Users, UserCircle, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIERS = [
  { tier: 'small', count: 3, label: 'Starter Team', range: '1-3 AI Employees', icon: UserCircle, desc: 'Perfect for solo founders or small businesses testing AI automation' },
  { tier: 'medium', count: 7, label: 'Growth Team', range: '4-10 AI Employees', icon: Users, desc: 'Ideal for growing companies that need multi-channel coverage' },
  { tier: 'large', count: 15, label: 'Enterprise Team', range: '10-20 AI Employees', icon: Building, desc: 'Full-scale digital workforce for aggressive outbound campaigns' },
];

export default function Step2TeamSize({ data, update }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Choose Your Team Size</h2>
        <p className="text-sm text-muted-foreground mt-1">Select the size of your digital AI team. You can adjust this later.</p>
      </div>
      <div className="space-y-3">
        {TIERS.map(t => (
          <button
            key={t.tier}
            onClick={() => update({ team_size_tier: t.tier, team_size_count: t.count })}
            className={cn(
              "w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4",
              data.team_size_tier === t.tier ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn("p-3 rounded-lg", data.team_size_tier === t.tier ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <t.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t.label}</h3>
                <span className="text-xs text-muted-foreground">({t.range})</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
            <div className="text-2xl font-bold text-primary">{t.count}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
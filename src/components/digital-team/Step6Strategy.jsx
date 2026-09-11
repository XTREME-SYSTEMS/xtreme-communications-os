import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

const GOAL_TEMPLATES = [
  'Book 50+ qualified appointments per month',
  'Generate 100+ leads per week from cold outreach',
  'Close 10+ deals per month via outbound calling',
  'Build a pipeline of 500+ prospects in 90 days',
  'Re-engage 200+ past customers and recover lost revenue',
  'Launch a new product and get 1000 signups',
];

export default function Step6Strategy({ data, update }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Strategy & End Goal</h2>
        <p className="text-sm text-muted-foreground mt-1">What is the desired end result? Your AI team will be built around this goal.</p>
      </div>
      <div>
        <Label className="flex items-center gap-2"><Target className="w-4 h-4" /> Desired End Result</Label>
        <Textarea rows={3} value={data.strategy_goal || ''} onChange={e => update({ strategy_goal: e.target.value })}
          placeholder="e.g. Book 50+ qualified appointments per month for our roofing division..." />
      </div>
      <div>
        <Label>Quick Select Goals</Label>
        <div className="space-y-2 mt-2">
          {GOAL_TEMPLATES.map(g => (
            <button key={g} onClick={() => update({ strategy_goal: g })}
              className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${data.strategy_goal === g ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
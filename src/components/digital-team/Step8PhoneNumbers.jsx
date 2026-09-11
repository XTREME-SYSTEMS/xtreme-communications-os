import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Info } from 'lucide-react';

export default function Step8PhoneNumbers({ data, update }) {
  const count = data.phone_numbers_count || 1;
  const teamSize = data.team_size_count || 3;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Phone Numbers</h2>
        <p className="text-sm text-muted-foreground mt-1">How many phone numbers does your team need? Each AI agent can have their own number.</p>
      </div>
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <Phone className="w-8 h-8 text-primary" />
        <div className="flex-1">
          <Label>Number of Phone Numbers</Label>
          <Input type="number" min={1} max={50} value={count} onChange={e => update({ phone_numbers_count: Math.max(1, Number(e.target.value)) })} className="max-w-24" />
        </div>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Recommendation</p>
          <p>For a team of {teamSize}, we recommend {Math.min(teamSize, 5)} phone numbers. Each number costs ~$1-3/month. Numbers will be provisioned during launch.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, Math.min(teamSize, 5), teamSize].map(n => (
          <button key={n} onClick={() => update({ phone_numbers_count: n })}
            className={`p-3 rounded-lg border-2 text-center ${count === n ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <p className="text-2xl font-bold">{n}</p>
            <p className="text-xs text-muted-foreground">{n === 1 ? 'Shared' : n === teamSize ? 'One per agent' : 'Recommended'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
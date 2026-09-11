import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'UTC'];
const DAYS = [
  { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' },
];

export default function Step5Schedule({ data, update }) {
  const toggleDay = (id) => {
    const current = data.work_days || [];
    update({ work_days: current.includes(id) ? current.filter(d => d !== id) : [...current, id] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Work Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">When will your AI team be active? This mimics human employee work hours.</p>
      </div>
      <div>
        <Label>Time Zone</Label>
        <Select value={data.timezone || 'America/New_York'} onValueChange={v => update({ timezone: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Work Days</Label>
        <div className="flex gap-2 mt-2">
          {DAYS.map(d => {
            const selected = (data.work_days || []).includes(d.id);
            return (
              <button key={d.id} onClick={() => toggleDay(d.id)}
                className={cn("px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50")}>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Hour</Label>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Input type="number" min={0} max={23} value={data.work_start_hour ?? 9} onChange={e => update({ work_start_hour: Number(e.target.value) })} />
            <span className="text-sm text-muted-foreground">:00</span>
          </div>
        </div>
        <div>
          <Label>End Hour</Label>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Input type="number" min={0} max={23} value={data.work_end_hour ?? 17} onChange={e => update({ work_end_hour: Number(e.target.value) })} />
            <span className="text-sm text-muted-foreground">:00</span>
          </div>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        Your AI team will be active from {data.work_start_hour ?? 9}:00 to {data.work_end_hour ?? 17}:00 ({data.timezone?.replace('_', ' ') || 'America/New_York'}) on {(data.work_days || ['mon','tue','wed','thu','fri']).map(d => d.toUpperCase()).join(', ')}.
      </div>
    </div>
  );
}
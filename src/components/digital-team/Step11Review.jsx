import React from 'react';
import { Building2, Users, Phone, Clock, Target, Bot, CheckCircle2, Shield, Share2 } from 'lucide-react';

export default function Step11Review({ data }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Review & Launch</h2>
        <p className="text-sm text-muted-foreground mt-1">Review your team configuration. Click Launch to provision everything.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReviewItem icon={Building2} label="Business" value={`${data.business_type === 'new' ? 'New' : 'Existing'} — ${data.company_name || '—'}`} />
        <ReviewItem icon={Users} label="Team Size" value={`${data.team_size_count || 0} AI Employees (${data.team_size_tier || 'small'})`} />
        <ReviewItem icon={Phone} label="Phone Numbers" value={`${data.phone_numbers_count || 1} numbers`} />
        <ReviewItem icon={Clock} label="Schedule" value={`${data.work_start_hour ?? 9}:00-${data.work_end_hour ?? 17}:00 ${(data.work_days || []).join(', ')}`} />
        <ReviewItem icon={Target} label="Goal" value={data.strategy_goal || '—'} />
        <ReviewItem icon={Bot} label="Team Members" value={`${(data.team_members || []).length} configured`} />
        <ReviewItem icon={Shield} label="Compliance" value={data.compliance_signed ? 'Signed ✓' : 'Not signed'} />
        <ReviewItem icon={Share2} label="Social Media" value={data.social_media_enabled ? `Enabled (${(data.social_platforms || []).join(', ')})` : 'Disabled'} />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Channels:</p>
        <div className="flex flex-wrap gap-2">
          {(data.channels || []).map(c => (
            <span key={c} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium uppercase">{c}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Team Members:</p>
        <div className="space-y-2">
          {(data.team_members || []).map((m, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Bot className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{m.name || `Member ${i + 1}`}</span>
              <span className="text-xs text-muted-foreground">— {m.role || 'Unassigned'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <p className="text-sm font-medium">Ready to launch! Click "Launch Team" to provision your digital AI workforce.</p>
      </div>
    </div>
  );
}

function ReviewItem({ icon: Icon, label, value }) {
  return (
    <div className="p-3 rounded-lg border flex items-center gap-3">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
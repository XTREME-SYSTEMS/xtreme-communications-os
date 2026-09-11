import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';

export default function Step7TeamCreation({ data, update }) {
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoError, setAutoError] = useState(null);

  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    setAutoError(null);
    try {
      const keys = await base44.entities.ApiKey.filter({ status: 'active' }, '-created_date', 1);
      const apiKey = keys[0]?.key_value;
      if (!apiKey) throw new Error('No API key found. Generate one in Portal > API Keys.');
      const res = await base44.functions.invoke('provisionDigitalTeam', {
        action: 'auto_generate_team',
        api_key: apiKey,
        company_name: data.company_name,
        industry: data.industry,
        strategy_goal: data.strategy_goal,
        team_size: data.team_size_count,
        channels: data.channels,
      });
      const result = res.data || res;
      if (result.team_members) update({ team_members: result.team_members });
    } catch (e) {
      setAutoError(e.message);
    }
    setAutoGenerating(false);
  };

  const addManualMember = () => {
    update({ team_members: [...(data.team_members || []), { name: '', role: '', skills: [], personality: '', system_prompt: '', assigned_channel: (data.channels || ['sms'])[0] }] });
  };
  const updateMember = (i, field, value) => {
    const members = [...(data.team_members || [])];
    members[i] = { ...members[i], [field]: value };
    update({ team_members: members });
  };
  const removeMember = (i) => update({ team_members: data.team_members.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Create Your AI Team</h2>
        <p className="text-sm text-muted-foreground mt-1">Build your team manually or let the system auto-generate members based on your industry and goals.</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleAutoGenerate} disabled={autoGenerating} className="flex-1">
          {autoGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Auto-Generate Team</>}
        </Button>
        <Button onClick={addManualMember} variant="outline" className="flex-1">
          <Plus className="w-4 h-4 mr-2" /> Add Manually
        </Button>
      </div>
      {autoError && <p className="text-sm text-red-500">{autoError}</p>}
      <div className="space-y-3">
        {(data.team_members || []).map((m, i) => (
          <div key={i} className="p-4 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /><span className="font-medium">Team Member {i + 1}</span></div>
              <button onClick={() => removeMember(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={m.name || ''} onChange={e => updateMember(i, 'name', e.target.value)} placeholder="e.g. Sarah Mitchell" /></div>
              <div><Label>Role</Label><Input value={m.role || ''} onChange={e => updateMember(i, 'role', e.target.value)} placeholder="e.g. Lead Generator" /></div>
            </div>
            <div><Label>Personality</Label><Input value={m.personality || ''} onChange={e => updateMember(i, 'personality', e.target.value)} placeholder="e.g. Friendly, persistent, data-driven" /></div>
            <div><Label>System Prompt</Label><Textarea rows={2} value={m.system_prompt || ''} onChange={e => updateMember(i, 'system_prompt', e.target.value)} placeholder="Instructions for this AI agent..." /></div>
            <div className="flex flex-wrap gap-1">
              {(m.skills || []).map((s, si) => <Badge key={si} variant="secondary">{s}</Badge>)}
            </div>
          </div>
        ))}
        {(data.team_members || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No team members yet. Auto-generate or add manually above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
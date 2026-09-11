import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

const INDUSTRIES = ['Construction', 'Real Estate', 'Healthcare', 'Legal', 'Insurance', 'Automotive', 'Home Services', 'Financial Services', 'E-commerce', 'SaaS', 'Marketing Agency', 'Restaurants', 'Fitness', 'Beauty', 'Education', 'Other'];

export default function Step3Company({ data, update }) {
  const [projectInput, setProjectInput] = useState('');

  const addProject = () => {
    if (projectInput.trim()) {
      update({ project_names: [...(data.project_names || []), projectInput.trim()] });
      setProjectInput('');
    }
  };
  const removeProject = (i) => update({ project_names: data.project_names.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Company Information</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us about your company and create your project names.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Team Name *</Label>
          <Input value={data.team_name || ''} onChange={e => update({ team_name: e.target.value })} placeholder="e.g. Apex Sales Force" />
        </div>
        <div>
          <Label>Company Name *</Label>
          <Input value={data.company_name || ''} onChange={e => update({ company_name: e.target.value })} placeholder="e.g. Apex Construction" />
        </div>
        <div>
          <Label>Industry</Label>
          <Input list="industries" value={data.industry || ''} onChange={e => update({ industry: e.target.value })} placeholder="Select or type" />
          <datalist id="industries">{INDUSTRIES.map(i => <option key={i} value={i} />)}</datalist>
        </div>
        <div>
          <Label>Website</Label>
          <Input value={data.website || ''} onChange={e => update({ website: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div>
        <Label>Company Description</Label>
        <Textarea rows={2} value={data.description || ''} onChange={e => update({ description: e.target.value })} placeholder="Brief description of what your company does..." />
      </div>
      <div>
        <Label>Project Names</Label>
        <p className="text-xs text-muted-foreground mb-2">Create projects that will be assigned to your team in your dashboard</p>
        <div className="flex gap-2">
          <Input value={projectInput} onChange={e => setProjectInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProject())} placeholder="e.g. Q4 Lead Gen, Roofing Campaign..." />
          <button onClick={addProject} className="px-3 rounded-lg bg-primary text-primary-foreground"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(data.project_names || []).map((p, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1">{p}<X className="w-3 h-3 cursor-pointer" onClick={() => removeProject(i)} /></Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
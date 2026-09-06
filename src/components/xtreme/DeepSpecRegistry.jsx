import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Cpu, GitBranch, Shield, Layers, Zap, Target, CheckCircle2, XCircle, Clock } from 'lucide-react';

const CATEGORY_COLORS = {
  core_engine: 'text-orange-400 border-orange-500/30 bg-orange-500/5',
  self_evolution: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
  build_factory: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  discovery: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
  audit: 'text-red-400 border-red-500/30 bg-red-500/5',
  self_healing: 'text-green-400 border-green-500/30 bg-green-500/5',
  intelligence: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  monetization: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
};

const PHASE_ICON = {
  draft: Clock, architect: GitBranch, implement: Cpu, build: Layers, validate: Shield, live: CheckCircle2,
};

export default function DeepSpecRegistry({ specs, runs }) {
  const [filter, setFilter] = useState('all');
  const categories = ['all', ...Object.keys(CATEGORY_COLORS)];
  const filtered = filter === 'all' ? specs : specs.filter(s => s.category === filter);

  const runCount = (specId) => runs.filter(r => r.spec_id === specId).length;
  const lastRunScore = (specId) => {
    const specRuns = runs.filter(r => r.spec_id === specId);
    return specRuns.length > 0 ? specRuns[0].aggregate_score : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 text-xs font-mono uppercase rounded border transition-colors ${
              filter === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {filtered.map(spec => {
          const PhaseIcon = PHASE_ICON[spec.phase] || Clock;
          const score = lastRunScore(spec.spec_id);
          const count = runCount(spec.spec_id);
          return (
            <div key={spec.id} className={`rounded-lg border p-3 ${CATEGORY_COLORS[spec.category] || 'border-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <PhaseIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-sm font-medium truncate">{spec.spec_id}</span>
                    <span className="text-xs text-muted-foreground">v{spec.version}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{spec.name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                  <span className="text-muted-foreground">{spec.state_count}st</span>
                  <span className="text-muted-foreground">{spec.llm_slot_count}llm</span>
                  <span className="text-muted-foreground">{spec.gate_count}g</span>
                  {spec.credit_budget > 0 && <span className="text-yellow-500">{spec.credit_budget}cr</span>}
                  {count > 0 && (
                    <span className={score === 1 ? 'text-status-green' : 'text-orange-400'}>
                      {score !== null ? `${(score * 100).toFixed(0)}%` : '--'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
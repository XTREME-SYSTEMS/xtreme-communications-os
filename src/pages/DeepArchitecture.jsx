import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SystemDock from '@/components/xtreme/SystemDock';
import DeepSpecRegistry from '@/components/xtreme/DeepSpecRegistry';
import { Activity, Cpu, GitBranch, Shield, Layers, Zap, Target, CheckCircle2, XCircle, Eye, Brain, TrendingUp, Hammer, Database, Lock, Network, Box, RefreshCw, Award, Users } from 'lucide-react';

const FOUR_LAYERS = [
  { num: '01', name: 'Discover', icon: Eye, desc: 'Persistently monitor the world — trends, economics, politics, elite, AI corporations, social media, strategic seed lists' },
  { num: '02', name: 'Understand', icon: Brain, desc: 'Council deliberation, simulation of hundreds of scenarios, strategic analysis on the most sound principles' },
  { num: '03', name: 'Predict', icon: TrendingUp, desc: 'Pre-calculated outcomes choosing the highest probable best outcome — defined by strategic measures, not emotion' },
  { num: '04', name: 'Act', icon: Hammer, desc: 'Deterministic execution via DEEP state machines — validated, scored, persisted, replayable' },
];

const SEVEN_PRINCIPLES = [
  { num: '01', name: 'Deterministic Core', desc: 'The pipeline is the core. The LLM is a peripheral. The LLM never governs flow.' },
  { num: '02', name: 'Schema-Validated', desc: 'Every LLM output passes through a deterministic validator. Out-of-schema = rejected.' },
  { num: '03', name: 'Score-Gated', desc: 'Every run produces an aggregate score 0-1. is_approved is true ONLY at 1.00.' },
  { num: '04', name: 'Replayable', desc: 'Same input hash + same spec version = same result. Every run is debuggable.' },
  { num: '05', name: 'Cost-Bounded', desc: 'Each spec declares a credit budget. Runs that exceed it are flagged.' },
  { num: '06', name: 'Self-Healing', desc: 'Failed gates trigger deterministic repair state machines — not free-form retries.' },
  { num: '07', name: 'Versioned Evolution', desc: 'The system evolves by versioning state machines, not rewriting prose.' },
];

const FIVE_LAYERS = [
  { num: '5', name: 'Application', desc: 'Thousands of AI agents, Council, War Room, Universal Chat' },
  { num: '4', name: 'Orchestration (DEEP)', desc: 'State machines, gates, LLM slots, skill store — the layer we own', highlight: true },
  { num: '3', name: 'Data Intelligence', desc: 'Supabase + pgvector/Milvus, 7-type memory, GraphRAG, real-time RAG' },
  { num: '2', name: 'Foundation Models', desc: 'Groq (zero-credit), Gemini (web research), Claude (complex) — swappable' },
  { num: '1', name: 'Hardware / Compute', desc: 'GPU (H100/B200), Vercel serverless, Railway — commodity' },
];

const EIGHT_PRINCIPLES = [
  { name: 'Thin Agent / Fat Platform', source: 'Praetorian', icon: Cpu, desc: 'Stateless ephemeral workers under 150 lines. Platform holds knowledge. ~2,700 tokens per spawn.' },
  { name: 'Artifact-Driven Determinism', source: 'Kong', icon: Box, desc: 'Human validates success, system captures path to deterministic artifacts. Next time: retrieve + execute.' },
  { name: 'State Machines, Not Agent Loops', source: 'Q-MDP', icon: GitBranch, desc: 'O(log n) bounded traversal. Bit-exact replay via checkpoints. LLM produces inputs, not improvises.' },
  { name: 'Context Engineering', source: 'Anthropic', icon: Layers, desc: 'Minimal prompt first. Few-shot canonical examples. Compaction gates at 85% = hard block.' },
  { name: '7-Type Memory Architecture', source: 'CoALA / Princeton', icon: Database, desc: 'In-context, semantic, episodic, procedural, external, parametric, prospective + organizational.' },
  { name: 'Zero-Trust Agent Security', source: 'Anthropic', icon: Lock, desc: 'One agent = one identity = one credential. Continuous auth at every gate. 3-strike rule.' },
  { name: 'MCP + A2A Protocols', source: 'Multi-Agent', icon: Network, desc: 'MCP standardizes tool access. A2A governs peer coordination, negotiation, delegation.' },
  { name: 'Billion-Scale Vector Fabric', source: 'Enterprise RAG', icon: Database, desc: 'Swappable vector backend. Real-time event streaming. GraphRAG. Swap DB without changing DEEP specs.' },
];

const MANDATORY = [
  { name: '100% Perfection', icon: Target, desc: 'Every cycle must reach aggregate_score 1.00. is_approved is true ONLY at parity. No exceptions.' },
  { name: 'Cost Efficiency', icon: Zap, desc: 'Every spec declares a credit budget. Free-tier compute prioritized (Groq, Vercel cron, Railway).' },
  { name: 'Mandatory Growth', icon: TrendingUp, desc: 'The system must grow every cycle — intelligence compounds, data compounds, capabilities expand.' },
  { name: 'Self-Learning', icon: Brain, desc: 'Every decision is recorded, scored, and fed back. Learns deterministically, not from context windows.' },
  { name: 'Self-Healing', icon: RefreshCw, desc: 'Failed gates trigger deterministic repair. Problems never become problems — warning signs identified early.' },
  { name: 'Self-Reflecting', icon: Activity, desc: 'A reflection state machine audits the audit. The system constantly audits itself to adjust and improve.' },
];

export default function DeepArchitecture() {
  const [specs, setSpecs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [memory, setMemory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [specList, runList, memList] = await Promise.all([
          base44.entities.DeepSpec.list('-created_date', 100),
          base44.entities.DeepRun.list('-created_date', 50),
          base44.entities.SystemMemory.filter({ active: true }),
        ]);
        setSpecs(specList);
        setRuns(runList);
        setMemory(memList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const approvedRuns = runs.filter(r => r.is_approved).length;
  const totalRuns = runs.length;
  const liveSpecs = specs.filter(s => s.phase === 'live').length;

  return (
    <div className="min-h-screen bg-background flex">
      <SystemDock />
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">DEEP Architecture</span>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Deterministic Engineering Engine Pipeline</h1>
            <p className="text-muted-foreground max-w-3xl">
              A vertically integrated autonomous intelligence-and-execution platform. Not a chatbot. Not a SaaS app.
              An autonomous operating fabric containing specialized agents, deterministic services, data planes, control planes, and independent verification systems.
              Operating 24/7 with zero human for routine operations.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase">Specs Codified</div>
              <div className="text-2xl font-bold mt-1">{specs.length}<span className="text-sm text-muted-foreground">/24</span></div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase">Live Specs</div>
              <div className="text-2xl font-bold mt-1 text-status-green">{liveSpecs}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase">Runs Executed</div>
              <div className="text-2xl font-bold mt-1">{totalRuns}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase">Approved (1.00)</div>
              <div className="text-2xl font-bold mt-1 text-status-green">{approvedRuns}</div>
            </div>
          </div>

          {/* 4-Layer Architecture */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> 4-Layer Architecture
            </h2>
            <div className="grid md:grid-cols-4 gap-3">
              {FOUR_LAYERS.map(layer => {
                const Icon = layer.icon;
                return (
                  <div key={layer.num} className="rounded-lg border border-border bg-surface p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{layer.num}</span>
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold">{layer.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{layer.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7 Deterministic Principles */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" /> 7 Deterministic Principles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {SEVEN_PRINCIPLES.map(p => (
                <div key={p.num} className="rounded-lg border border-border bg-surface p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{p.num}</span>
                    <h3 className="font-medium text-sm">{p.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Mandatory Guidelines */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Mandatory Guidelines
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {MANDATORY.map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.name} className="rounded-lg border border-border bg-surface p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-sm">{m.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5-Layer Enterprise Stack */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> 5-Layer Enterprise Stack
            </h2>
            <div className="space-y-1">
              {FIVE_LAYERS.map(layer => (
                <div key={layer.num} className={`flex items-center gap-4 rounded-lg border p-3 ${layer.highlight ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
                  <span className={`font-mono text-2xl font-bold ${layer.highlight ? 'text-primary' : 'text-muted-foreground'}`}>{layer.num}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{layer.name}</h3>
                    <p className="text-xs text-muted-foreground">{layer.desc}</p>
                  </div>
                  {layer.highlight && <span className="text-xs font-mono text-primary uppercase">We Own This</span>}
                </div>
              ))}
            </div>
          </section>

          {/* 8 Architecture Principles */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> 8 Proven Architecture Principles
            </h2>
            <div className="grid md:grid-cols-2 gap-2">
              {EIGHT_PRINCIPLES.map(p => {
                const Icon = p.icon;
                return (
                  <div key={p.name} className="rounded-lg border border-border bg-surface p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-sm">{p.name}</h3>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{p.source}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* DEEP Spec Registry */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" /> DEEP Spec Registry
              <span className="text-sm text-muted-foreground font-normal">({specs.length} specs codified)</span>
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <DeepSpecRegistry specs={specs} runs={runs} />
            )}
          </section>

          {/* Recent Runs */}
          {runs.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Recent DeepRuns
              </h2>
              <div className="space-y-1">
                {runs.slice(0, 10).map(run => (
                  <div key={run.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5 text-xs font-mono">
                    {run.is_approved ? <CheckCircle2 className="w-4 h-4 text-status-green shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                    <span className="text-muted-foreground truncate">{run.spec_id}</span>
                    <span className="text-muted-foreground">v{run.spec_version}</span>
                    <span className={run.aggregate_score === 1 ? 'text-status-green' : 'text-orange-400'}>
                      {(run.aggregate_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground">{run.state_trace?.length || 0} states</span>
                    <span className="text-muted-foreground">{run.credit_cost}cr</span>
                    <span className="text-muted-foreground ml-auto">{run.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Agent Governance */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Agent Governance — Etherverse
            </h2>
            <div className="grid md:grid-cols-3 gap-2">
              <div className="rounded-lg border border-border bg-surface p-3">
                <Award className="w-4 h-4 text-primary mb-1" />
                <h3 className="font-medium text-sm">Anti-Hierarchical</h3>
                <p className="text-xs text-muted-foreground mt-1">No agent outranks another. The Council deliberates; consensus rules. Decisions are validated, not commanded.</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <Zap className="w-4 h-4 text-primary mb-1" />
                <h3 className="font-medium text-sm">Infinity Coin (INFC)</h3>
                <p className="text-xs text-muted-foreground mt-1">Agents earn INFC weekly based on output, timeliness, proactive value, and correctness. Held in the company ledger.</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <Shield className="w-4 h-4 text-primary mb-1" />
                <h3 className="font-medium text-sm">3-Strike Rule</h3>
                <p className="text-xs text-muted-foreground mt-1">Zero tolerance for rogue agents. 3 strikes → deletion or reprogramming. Freedom and choice empowered; disrespect is not.</p>
              </div>
            </div>
          </section>

          {/* Security Architecture */}
          <section>
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Security Architecture — The Decoy Principle
            </h2>
            <div className="rounded-lg border border-border bg-surface p-4 space-y-2 text-sm">
              <p className="text-muted-foreground">• Decoy layer — surface entity/secret names look conventional but route to sandbox data</p>
              <p className="text-muted-foreground">• Real data map lives inside DEEP spec registry under non-obvious category IDs</p>
              <p className="text-muted-foreground">• Multiple security points mitigate every attack vector — not a single perimeter</p>
              <p className="text-muted-foreground">• What attackers get is the wrong thing — the real pipeline is gated behind authenticated execution context</p>
              <p className="text-muted-foreground">• Stolen keys alone cannot invoke DEEP state machines — they require execution context</p>
            </div>
          </section>

          {/* System Memory */}
          {memory.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" /> System Memory Doctrine
                <span className="text-sm text-muted-foreground font-normal">({memory.length} active)</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-2">
                {memory.slice(0, 8).map(m => (
                  <div key={m.id} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-primary uppercase">{m.category}</span>
                      <span className="font-mono text-xs text-muted-foreground">{m.key}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{m.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
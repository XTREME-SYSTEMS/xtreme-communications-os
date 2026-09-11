import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Database, Shield, Coins, Filter, Activity, FileText, Cpu, Zap, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Award, Loader2 } from 'lucide-react';

export default function VisionCortex() {
  const [loading, setLoading] = useState(false);
  const [doctrine, setDoctrine] = useState([]);
  const [intelStats, setIntelStats] = useState(null);
  const [deepSpecs, setDeepSpecs] = useState([]);
  const [deepRuns, setDeepRuns] = useState([]);
  const [rewardLedger, setRewardLedger] = useState([]);
  const [apiKey, setApiKey] = useState('');

  // Ingestion form
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestContent, setIngestContent] = useState('');
  const [ingestSource, setIngestSource] = useState('');
  const [ingestSourceType, setIngestSourceType] = useState('official_site');
  const [ingestCategory, setIngestCategory] = useState('competitive_intel');
  const [ingestTarget, setIngestTarget] = useState('');
  const [ingestResult, setIngestResult] = useState(null);

  // Council deliberation
  const [councilTopic, setCouncilTopic] = useState('');
  const [councilResult, setCouncilResult] = useState(null);
  const [councilSessions, setCouncilSessions] = useState([]);
  const [deliberating, setDeliberating] = useState(false);

  // Simulation
  const [simScenario, setSimScenario] = useState('');
  const [simHorizon, setSimHorizon] = useState('30d');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Vision sweep
  const [sweepResult, setSweepResult] = useState(null);
  const [sweeping, setSweeping] = useState(false);
  const [quests, setQuests] = useState([]);

  const fetchApiKey = useCallback(async () => {
    try {
      const keys = await base44.entities.ApiKey.filter({ status: 'active' }, '-created_date', 1);
      if (keys.length) setApiKey(keys[0].key_value);
    } catch (e) {}
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [doctrineRes, specsRes, runsRes, rewards] = await Promise.all([
        base44.functions.invoke('systemMemory', { action: 'get' }),
        base44.functions.invoke('deepExecutor', { action: 'list_specs', api_key: apiKey || 'skip' }).catch(() => ({ data: { specs: [] } })),
        base44.functions.invoke('deepExecutor', { action: 'list_runs', api_key: apiKey || 'skip', limit: 10 }).catch(() => ({ data: { runs: [] } })),
        base44.entities.AgentRewardLedger.list('-created_date', 20).catch(() => []),
      ]);
      setDoctrine(doctrineRes.data?.doctrine?.split('## ').filter(Boolean).map(s => '## ' + s) || []);
      setDeepSpecs(specsRes.data?.specs || []);
      setDeepRuns(runsRes.data?.runs || []);
      setRewardLedger(rewards || []);
    } catch (e) {
      console.error('Load failed', e);
    }
    setLoading(false);
  }, [apiKey]);

  const loadIntelStats = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await base44.functions.invoke('ingestIntelligence', { action: 'stats', api_key: apiKey });
      setIntelStats(res.data);
    } catch (e) {}
  }, [apiKey]);

  useEffect(() => { fetchApiKey(); }, [fetchApiKey]);
  useEffect(() => { if (apiKey) { loadData(); loadIntelStats(); loadCouncilSessions(); loadQuests(); } }, [apiKey, loadData, loadIntelStats]);

  const loadCouncilSessions = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('councilDeliberation', { action: 'list_sessions', api_key: apiKey });
      setCouncilSessions(res.data?.sessions || []);
    } catch (e) {}
  }, [apiKey]);

  const loadQuests = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('visionSweep', { action: 'list_quests', api_key: apiKey });
      setQuests(res.data?.quests || []);
    } catch (e) {}
  }, [apiKey]);

  const handleDeliberate = async () => {
    if (!apiKey || !councilTopic) return;
    setDeliberating(true); setCouncilResult(null);
    try {
      const res = await base44.functions.invoke('councilDeliberation', { action: 'deliberate', api_key: apiKey, topic: councilTopic, session_type: 'decision' });
      setCouncilResult(res.data);
      loadCouncilSessions();
    } catch (e) { setCouncilResult({ error: e.message }); }
    setDeliberating(false);
  };

  const handleSimulate = async () => {
    if (!apiKey || !simScenario) return;
    setSimulating(true); setSimResult(null);
    try {
      const res = await base44.functions.invoke('simulationEngine', { action: 'simulate', api_key: apiKey, scenario_name: simScenario, time_horizon: simHorizon });
      setSimResult(res.data);
    } catch (e) { setSimResult({ error: e.message }); }
    setSimulating(false);
  };

  const handleSweep = async () => {
    if (!apiKey) return;
    setSweeping(true); setSweepResult(null);
    try {
      const res = await base44.functions.invoke('visionSweep', { action: 'sweep', api_key: apiKey, existing_assets: ['AI communications platform', 'Telnyx phone numbers', 'Vercel AI Gateway', 'Supabase vector DB', '38-agent council'] });
      setSweepResult(res.data);
      loadQuests();
    } catch (e) { setSweepResult({ error: e.message }); }
    setSweeping(false);
  };

  const handleIngest = async () => {
    if (!apiKey) { alert('No API key found. Generate one in Portal > API Keys.'); return; }
    if (!ingestTitle || !ingestContent) { alert('Title and content required.'); return; }
    setLoading(true);
    setIngestResult(null);
    try {
      const res = await base44.functions.invoke('ingestIntelligence', {
        action: 'ingest',
        api_key: apiKey,
        title: ingestTitle,
        content: ingestContent,
        source_url: ingestSource,
        source_type: ingestSourceType,
        category: ingestCategory,
        target_entity: ingestTarget,
      });
      setIngestResult(res.data);
      loadIntelStats();
    } catch (e) {
      setIngestResult({ error: e.message });
    }
    setLoading(false);
  };

  const stageColor = (stage) => {
    const map = {
      approved: 'text-green-500',
      rejected: 'text-red-500',
      stage_1_source_validation: 'text-yellow-500',
      stage_2_content_classification: 'text-blue-500',
      stage_3_quality_scoring: 'text-purple-500',
    };
    return map[stage] || 'text-gray-500';
  };

  const categoryIcon = (cat) => {
    const map = {
      doctrine: FileText, guardrail: Shield, operating_protocol: Cpu,
      ideal_state: Brain, persona: Brain, quality_standard: CheckCircle2,
      memory_anchor: Database,
    };
    return map[cat] || FileText;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Vision Cortex — XPS Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The autonomous intelligence-and-execution fabric — 3-stage ingestion filter, DEEP state machines, Infinity Coin economy
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Activity className="w-3 h-3 mr-1" /> {doctrine.length} doctrine anchors loaded
        </Badge>
      </div>

      {/* System Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Filter className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{intelStats?.approved || 0}</p>
            <p className="text-xs text-muted-foreground">Approved Intel</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold">{intelStats?.rejected || 0}</p>
            <p className="text-xs text-muted-foreground">Rejected by Filter</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Cpu className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold">{deepSpecs.length}</p>
            <p className="text-xs text-muted-foreground">DEEP Specs</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Coins className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold">
              {rewardLedger.reduce((s, r) => s + (r.inf_amount || 0), 0).toFixed(3)}
            </p>
            <p className="text-xs text-muted-foreground">INFC Total</p>
          </div>
        </CardContent></Card>
      </div>

      {/* 3-Stage Ingestion Filter */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            3-Stage Intelligence Ingestion Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="font-semibold text-yellow-600 dark:text-yellow-400">Stage 1 — Source Validation</p>
              <p className="text-muted-foreground mt-1">Validates source credibility. Rejects anonymous, blacklisted, or untrusted sources.</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="font-semibold text-blue-600 dark:text-blue-400">Stage 2 — Content Classification</p>
              <p className="text-muted-foreground mt-1">LLM classifies as FACT/INFERRED/ESTIMATED/etc. Rejects opinion-as-fact, promotional spam, tainted data.</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="font-semibold text-purple-600 dark:text-purple-400">Stage 3 — Quality Scoring & Dedup</p>
              <p className="text-muted-foreground mt-1">Scores across 12 dimensions. Deduplicates. Must score ≥70 to be approved.</p>
            </div>
          </div>

          {/* Ingestion Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input value={ingestTitle} onChange={e => setIngestTitle(e.target.value)} placeholder="Competitor X pricing analysis" />
            </div>
            <div>
              <Label>Source URL</Label>
              <Input value={ingestSource} onChange={e => setIngestSource(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Source Type</Label>
              <Select value={ingestSourceType} onValueChange={setIngestSourceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="official_site">Official Site</SelectItem>
                  <SelectItem value="pricing_page">Pricing Page</SelectItem>
                  <SelectItem value="api_docs">API Docs</SelectItem>
                  <SelectItem value="engineering_blog">Engineering Blog</SelectItem>
                  <SelectItem value="sec_filing">SEC Filing</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="customer_story">Customer Story</SelectItem>
                  <SelectItem value="industry_publication">Industry Publication</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="scraped">Scraped</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={ingestCategory} onValueChange={setIngestCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="competitive_intel">Competitive Intel</SelectItem>
                  <SelectItem value="customer_intel">Customer Intel</SelectItem>
                  <SelectItem value="market_intel">Market Intel</SelectItem>
                  <SelectItem value="technology_intel">Technology Intel</SelectItem>
                  <SelectItem value="revenue_intel">Revenue Intel</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="company_profile">Company Profile</SelectItem>
                  <SelectItem value="pricing_intel">Pricing Intel</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Target Entity (company/competitor)</Label>
              <Input value={ingestTarget} onChange={e => setIngestTarget(e.target.value)} placeholder="Apollo.io" />
            </div>
            <div className="md:col-span-2">
              <Label>Content</Label>
              <Textarea rows={4} value={ingestContent} onChange={e => setIngestContent(e.target.value)} placeholder="Paste the intelligence content here..." />
            </div>
          </div>

          <Button onClick={handleIngest} disabled={loading} className="w-full">
            <Zap className="w-4 h-4 mr-2" />{loading ? 'Processing through 3-stage filter...' : 'Ingest Intelligence'}
          </Button>

          {ingestResult && (
            <Card className={ingestResult.error ? 'border-red-500' : ingestResult.status === 'approved' ? 'border-green-500' : 'border-red-500'}>
              <CardContent className="p-4 text-sm">
                {ingestResult.error ? (
                  <p className="text-red-500">Error: {ingestResult.error}</p>
                ) : ingestResult.status === 'approved' ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> APPROVED — passed all 3 stages
                    </p>
                    <p>Classification: {ingestResult.classification}</p>
                    <p>Confidence: {ingestResult.confidence}</p>
                    <p>Aggregate Score: {ingestResult.aggregate_score}/100</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-semibold text-red-500 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> REJECTED at {ingestResult.stage}
                    </p>
                    <p>Reason: {ingestResult.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {intelStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-muted">
                <p className="text-muted-foreground">Total Ingested</p>
                <p className="font-bold text-lg">{intelStats.total}</p>
              </div>
              <div className="p-2 rounded bg-green-500/10">
                <p className="text-muted-foreground">Approved</p>
                <p className="font-bold text-lg text-green-600">{intelStats.approved}</p>
              </div>
              <div className="p-2 rounded bg-red-500/10">
                <p className="text-muted-foreground">Rejected</p>
                <p className="font-bold text-lg text-red-600">{intelStats.rejected}</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="text-muted-foreground">Rejection Rate</p>
                <p className="font-bold text-lg">{intelStats.rejection_rate}%</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctrine / System Memory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Blueprint Doctrine — System Memory ({doctrine.length} anchors)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {doctrine.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctrine loaded.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {doctrine.map((d, i) => {
                const title = d.replace(/^##\s*/, '').split('\n')[0];
                const Icon = categoryIcon('doctrine');
                return (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <p className="font-medium text-sm">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{d.replace(/^##\s*[^\n]+\n/, '')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DEEP Specs + Runs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5 text-blue-500" />DEEP Spec Registry</CardTitle></CardHeader>
          <CardContent>
            {deepSpecs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No specs registered. The 24 System Codex specs need to be loaded.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {deepSpecs.map((s, i) => (
                  <div key={i} className="p-2 rounded border border-border text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-medium">{s.spec_id}</p>
                      <Badge variant="outline" className="text-xs">{s.phase}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{s.name}</p>
                    <p className="text-muted-foreground">{s.state_count} states · {s.llm_slot_count} LLM slots · {s.gate_count} gates</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-green-500" />Recent DEEP Runs</CardTitle></CardHeader>
          <CardContent>
            {deepRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs executed yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {deepRuns.map((r, i) => (
                  <div key={i} className="p-2 rounded border border-border text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-mono">{r.spec_id}</p>
                      {r.is_approved ? (
                        <Badge className="bg-green-500 text-white text-xs">APPROVED</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{r.status}</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">Score: {r.aggregate_score} · Credits: {r.credit_cost}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Infinity Coin Economy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Infinity Coin Economy — Agent Reward Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewardLedger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rewards issued yet. Agents earn INFC for task completion, timeliness, proactive value, and correctness.</p>
          ) : (
            <div className="space-y-2">
              {rewardLedger.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                  <Award className={`w-4 h-4 ${r.inf_amount >= 0 ? 'text-yellow-500' : 'text-red-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium">{r.agent_name}</p>
                    <p className="text-xs text-muted-foreground">{r.reason || r.reward_type}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{r.reward_type}</Badge>
                  <p className={`font-mono font-bold ${r.inf_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.inf_amount >= 0 ? '+' : ''}{r.inf_amount.toFixed(3)} INFC
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 38-Agent Council Deliberation */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            38-Agent Council Deliberation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Adversarial council — no single agent unilaterally determines critical decisions. Agents produce structured positions. Council debates. Executive Synthesis resolves.</p>
          <div className="flex gap-2">
            <Input value={councilTopic} onChange={e => setCouncilTopic(e.target.value)} placeholder="Enter a topic for the council to debate..." />
            <Button onClick={handleDeliberate} disabled={deliberating || !apiKey}>
              {deliberating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Debating...</> : <Zap className="w-4 h-4 mr-2" />}Deliberate
            </Button>
          </div>
          {councilResult && !councilResult.error && (
            <Card className="border-green-500/30">
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="font-semibold">Consensus: {councilResult.consensus_level}</p>
                  {councilResult.policy_approval_required && <Badge variant="destructive" className="text-xs">Policy Approval Required</Badge>}
                </div>
                <div><p className="font-medium text-xs text-muted-foreground mb-1">SYNTHESIS</p><p className="whitespace-pre-wrap">{councilResult.synthesis}</p></div>
                <div><p className="font-medium text-xs text-muted-foreground mb-1">DECISION</p><p className="whitespace-pre-wrap">{councilResult.decision}</p></div>
                {councilResult.next_actions?.length > 0 && (
                  <div><p className="font-medium text-xs text-muted-foreground mb-1">NEXT ACTIONS</p>
                    <ul className="list-disc list-inside space-y-0.5">{councilResult.next_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                  </div>
                )}
                <details><summary className="cursor-pointer text-xs text-muted-foreground">View {councilResult.positions?.length || 0} agent positions</summary>
                  <div className="space-y-1 mt-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {councilResult.positions?.map((p, i) => (
                      <div key={i} className="p-2 rounded border border-border text-xs">
                        <p className="font-medium">{p.agent_name} <Badge variant="outline" className="ml-1 text-xs">{p.confidence}</Badge></p>
                        <p className="text-muted-foreground">{p.claim}</p>
                        <p className="text-muted-foreground italic">→ {p.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          )}
          {councilResult?.error && <p className="text-sm text-red-500">Error: {councilResult.error}</p>}
          {councilSessions.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              <p className="text-xs font-medium text-muted-foreground">Recent Sessions</p>
              {councilSessions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border border-border text-xs">
                  <span className={`w-2 h-2 rounded-full ${s.status === 'resolved' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="flex-1 truncate">{s.topic}</span>
                  <Badge variant="outline" className="text-xs">{s.consensus_level || s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulation Engine */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />Simulation Engine</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Before implementation, simulate outcomes across time horizons. Models agents, tasks, costs, revenue, failures, and capacity.</p>
          <div className="flex gap-2">
            <Input value={simScenario} onChange={e => setSimScenario(e.target.value)} placeholder="e.g. Launch outbound calling service for roofing contractors" />
            <Select value={simHorizon} onValueChange={setSimHorizon} className="w-32">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour</SelectItem><SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem><SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem><SelectItem value="1y">1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSimulate} disabled={simulating || !apiKey}>
              {simulating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulating...</> : <Zap className="w-4 h-4 mr-2" />}Simulate
            </Button>
          </div>
          {simResult && !simResult.error && simResult.cases && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['base', 'conservative', 'aggressive', 'failure'].map(k => {
                  const c = simResult.cases[k];
                  if (!c) return null;
                  const colors = { base: 'bg-blue-500/10', conservative: 'bg-yellow-500/10', aggressive: 'bg-green-500/10', failure: 'bg-red-500/10' };
                  return (
                    <div key={k} className={`p-3 rounded-lg ${colors[k]}`}>
                      <p className="font-semibold text-xs uppercase">{k}</p>
                      <p className="text-lg font-bold">${(c.revenue || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-sm font-medium mt-1">${(c.profit || 0).toLocaleString()} profit</p>
                      <p className="text-xs text-muted-foreground">{c.customers || 0} customers · {c.failure_rate || 0}% fail</p>
                      {c.failure_mode && <p className="text-xs text-red-500 mt-1">⚠ {c.failure_mode}</p>}
                    </div>
                  );
                })}
              </div>
              {simResult.recommendation && <div className="p-3 rounded-lg bg-muted"><p className="text-xs font-medium text-muted-foreground">RECOMMENDATION</p><p className="text-sm">{simResult.recommendation}</p></div>}
              {simResult.red_team_findings?.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-medium text-red-500">RED TEAM FINDINGS</p>
                  <ul className="list-disc list-inside text-sm mt-1">{simResult.red_team_findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          {simResult?.error && <p className="text-sm text-red-500">Error: {simResult.error}</p>}
        </CardContent>
      </Card>

      {/* Vision Sweep */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5 text-primary" />Vision Sweep — Opportunity Discovery</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Sweeps for niches, problems, and opportunities. Identifies lowest-hanging fruit using existing assets. Creates KnowledgeQuest records for each.</p>
          <Button onClick={handleSweep} disabled={sweeping || !apiKey} className="w-full">
            {sweeping ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sweeping...</> : <Zap className="w-4 h-4 mr-2" />}Run Vision Sweep
          </Button>
          {sweepResult && !sweepResult.error && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium">{sweepResult.executive_summary}</p>
              </div>
              {sweepResult.opportunities?.map((opp, i) => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{opp.title}</p>
                    <div className="flex gap-1">
                      {opp.quick_win && <Badge className="bg-green-500 text-white text-xs">Quick Win</Badge>}
                      <Badge variant="outline" className="text-xs capitalize">{opp.priority}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{opp.description}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span>Rev: ${opp.estimated_revenue || 0}/mo</span>
                    <span>Cost: ${opp.estimated_cost || 0}/mo</span>
                    <span>Category: {opp.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {sweepResult?.error && <p className="text-sm text-red-500">Error: {sweepResult.error}</p>}
          {quests.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              <p className="text-xs font-medium text-muted-foreground">Knowledge Quests ({quests.length})</p>
              {quests.map((q, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border border-border text-xs">
                  <span className={`w-2 h-2 rounded-full ${q.status === 'completed' ? 'bg-green-500' : q.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  <span className="flex-1 truncate">{q.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">{q.priority}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Architecture Status */}
      <Card className="border-primary/20">
        <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />5-Layer Enterprise Stack Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { layer: '5. Application', desc: 'AI agents, Council, War Room', status: 'built', detail: '38 agents defined, council engine live' },
              { layer: '4. Orchestration (DEEP)', desc: 'State machines, gates, skill store — WE OWN THIS', status: 'built', detail: 'deepExecutor + DeepSpec/DeepRun live' },
              { layer: '3. Data Intelligence', desc: 'Supabase + vector, 7-type memory, GraphRAG', status: 'partial', detail: 'IntelligenceNode + SystemMemory live, vector pending' },
              { layer: '2. Foundation Models', desc: 'Groq, Gemini, Claude — swappable', status: 'built', detail: 'Vercel AI Gateway live — bypasses credit limits' },
              { layer: '1. Hardware/Compute', desc: 'GPU, Vercel serverless, Railway — commodity', status: 'built', detail: 'Base44 serverless + Railway connector active' },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded border border-border">
                <div className={`w-2 h-2 rounded-full ${l.status === 'built' ? 'bg-green-500' : l.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{l.layer}</p>
                  <p className="text-xs text-muted-foreground">{l.desc}</p>
                </div>
                <p className="text-xs text-muted-foreground">{l.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
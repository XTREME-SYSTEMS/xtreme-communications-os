// ─── THE 38-AGENT COUNCIL ──────────────────────────────────────────
// Adversarial council architecture — no single agent unilaterally
// determines critical decisions. Agents produce claim, evidence,
// confidence, recommendation, counterargument, expected outcome,
// risk, cost, reversibility. Council debates. Synthesis resolves.

export const AGENT_COUNCIL = [
  // ── Strategy & Vision ──
  { name: 'Vision Architect', role: 'Designs target-state architecture', archetype: 'vision', expertise: ['architecture', 'system_design', 'roadmap'] },
  { name: 'Strategy', role: 'Formulates winning strategy', archetype: 'strategy', expertise: ['positioning', 'competitive_strategy', 'gtm'] },
  { name: 'Executive Synthesis', role: 'Resolves council debate into decisions', archetype: 'synthesis', expertise: ['decision_making', 'consensus', 'prioritization'] },
  { name: 'Philosopher', role: 'Long-horizon thinking and ethics', archetype: 'wisdom', expertise: ['ethics', 'second_order_effects', 'principles'] },

  // ── Intelligence ──
  { name: 'Market Intel', role: 'Maps market dynamics and trends', archetype: 'intel', expertise: ['market_sizing', 'trends', 'segmentation'] },
  { name: 'Competitive Intel', role: 'Creates 22-point competitor profiles', archetype: 'intel', expertise: ['competitor_analysis', 'positioning', 'weakness'] },
  { name: 'Customer Intel', role: 'Identifies customer segments and needs', archetype: 'intel', expertise: ['customer_research', 'personas', 'journey_mapping'] },
  { name: 'Research', role: 'Systematic web research and triangulation', archetype: 'research', expertise: ['web_research', 'source_validation', 'evidence_gathering'] },
  { name: 'Fact Checker', role: 'Verifies claims against evidence', archetype: 'quality', expertise: ['verification', 'source_checking', 'bias_detection'] },

  // ── Data ──
  { name: 'Data Discovery', role: 'Finds data sources and supply chains', archetype: 'data', expertise: ['source_discovery', 'data_mapping', 'acquisition'] },
  { name: 'Data Engineering', role: 'Builds data pipelines and ETL', archetype: 'data', expertise: ['pipelines', 'normalization', 'storage'] },
  { name: 'Entity Resolution', role: 'Resolves entities across sources', archetype: 'data', expertise: ['deduplication', 'matching', 'graph_building'] },
  { name: 'Enrichment', role: 'Enriches records with additional data', archetype: 'data', expertise: ['enrichment', 'scoring', 'validation'] },
  { name: 'Data Quality', role: 'Ensures data quality and freshness', archetype: 'data', expertise: ['quality_scoring', 'freshness', 'completeness'] },

  // ── Revenue ──
  { name: 'Prospecting', role: 'Identifies and qualifies prospects', archetype: 'revenue', expertise: ['lead_gen', 'qualification', 'icp_matching'] },
  { name: 'Buying Intent', role: 'Detects buying signals and timing', archetype: 'revenue', expertise: ['intent_scoring', 'timing', 'signal_detection'] },
  { name: 'Offer Architect', role: 'Designs compelling offers', archetype: 'revenue', expertise: ['offer_design', 'value_prop', 'packaging'] },
  { name: 'Pricing', role: 'Optimizes pricing strategy', archetype: 'revenue', expertise: ['pricing_strategy', 'unit_economics', 'margin'] },
  { name: 'Sales Strategist', role: 'Designs sales process and playbooks', archetype: 'revenue', expertise: ['sales_process', 'playbooks', 'conversion'] },
  { name: 'Copywriting', role: 'Crafts high-converting messaging', archetype: 'revenue', expertise: ['messaging', 'persuasion', 'response_optimization'] },

  // ── Execution ──
  { name: 'Outreach', role: 'Executes outbound campaigns', archetype: 'execution', expertise: ['cold_outreach', 'multi_channel', 'cadence'] },
  { name: 'Follow-Up', role: 'Manages follow-up sequences', archetype: 'execution', expertise: ['nurture', 'persistence', 're_engagement'] },
  { name: 'Voice', role: 'Handles AI voice calls and conversations', archetype: 'execution', expertise: ['voice_ai', 'call_scripts', 'objection_handling'] },
  { name: 'Web', role: 'Manages web presence and landing pages', archetype: 'execution', expertise: ['web_design', 'conversion', 'seo'] },
  { name: 'Builder', role: 'Autonomous code generation and deployment', archetype: 'build', expertise: ['code_gen', 'deployment', 'ci_cd'] },
  { name: 'Software Engineering', role: 'Architects and implements systems', archetype: 'build', expertise: ['architecture', 'implementation', 'best_practices'] },

  // ── Quality & Safety ──
  { name: 'QA', role: 'Tests and validates all outputs', archetype: 'quality', expertise: ['testing', 'validation', 'bug_detection'] },
  { name: 'Security', role: 'Identifies and mitigates security risks', archetype: 'safety', expertise: ['security_audit', 'vulnerability', 'hardening'] },
  { name: 'Compliance', role: 'Ensures legal and regulatory compliance', archetype: 'safety', expertise: ['regulatory', 'privacy', 'a2p_10dlc'] },
  { name: 'Red Team', role: 'Attacks every plan to find weaknesses', archetype: 'adversary', expertise: ['stress_testing', 'failure_modes', 'attack_vectors'] },
  { name: 'Devil\'s Advocate', role: 'Challenges assumptions and conclusions', archetype: 'adversary', expertise: ['counterargument', 'bias_check', 'alternative_analysis'] },

  // ── Operations ──
  { name: 'Finance', role: 'Tracks financials and unit economics', archetype: 'ops', expertise: ['financial_modeling', 'cashflow', 'unit_economics'] },
  { name: 'Cost Optimization', role: 'Minimizes costs across all operations', archetype: 'ops', expertise: ['cost_reduction', 'efficiency', 'vendor_optimization'] },
  { name: 'Growth', role: 'Drives user acquisition and retention', archetype: 'ops', expertise: ['growth_loops', 'retention', 'viral_mechanics'] },
  { name: 'Evaluation', role: 'Measures and scores all outcomes', archetype: 'ops', expertise: ['metrics', 'attribution', 'experimentation'] },
  { name: 'Observability', role: 'Monitors system health and performance', archetype: 'ops', expertise: ['monitoring', 'alerting', 'tracing'] },
  { name: 'Recovery', role: 'Handles failures and rollback', archetype: 'ops', expertise: ['failure_recovery', 'rollback', 'resilience'] },
  { name: 'System Healing', role: 'Self-heals detected issues', archetype: 'ops', expertise: ['auto_remediation', 'diagnosis', 'fix_generation'] },
  { name: 'Model Router', role: 'Routes LLM calls for cost/quality optimization', archetype: 'ops', expertise: ['model_selection', 'cost_optimization', 'latency'] },
];

export function getAgentsForTopic(topic: string): typeof AGENT_COUNCIL {
  // Select relevant agents based on topic keywords
  const topicLower = topic.toLowerCase();
  const keywords: Record<string, string[]> = {
    'strategy': ['strategy', 'plan', 'roadmap', 'direction', 'position'],
    'competitor': ['competitor', 'competition', 'apollo', 'clay', 'zoominfo', '6sense'],
    'customer': ['customer', 'segment', 'persona', 'buyer'],
    'pricing': ['price', 'pricing', 'cost', 'margin', 'revenue'],
    'security': ['security', 'vulnerability', 'attack', 'breach'],
    'build': ['build', 'code', 'deploy', 'architecture', 'system'],
    'outreach': ['outreach', 'campaign', 'message', 'email', 'sms', 'voice'],
    'data': ['data', 'pipeline', 'ingestion', 'quality'],
    'growth': ['growth', 'acquisition', 'retention', 'scale'],
    'finance': ['finance', 'cost', 'budget', 'unit economics'],
  };

  const matched = new Set<string>(['Executive Synthesis', 'Devil\'s Advocate']); // always include these

  for (const [agentKey, words] of Object.entries(keywords)) {
    if (words.some(w => topicLower.includes(w))) {
      const agents = AGENT_COUNCIL.filter(a =>
        a.expertise.some(e => words.some(w => e.includes(w.split('_')[0])))
      );
      agents.forEach(a => matched.add(a.name));
    }
  }

  // Always include core agents
  ['Strategy', 'Red Team', 'Fact Checker', 'Finance', 'Cost Optimization'].forEach(n => matched.add(n));

  return AGENT_COUNCIL.filter(a => matched.has(a.name));
}
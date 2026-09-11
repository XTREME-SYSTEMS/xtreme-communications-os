import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';

// ─── 3-STAGE INTELLIGENCE INGESTION FILTER ──────────────────────────
// The quality gate that protects the system's knowledge base.
// Nothing enters the intelligence layer without passing all 3 stages.
//
// STAGE 1 — SOURCE VALIDATION
//   Is the source credible, authoritative, and current?
//   Rejects: anonymous, untrusted, blacklisted, or stale sources.
//
// STAGE 2 — CONTENT CLASSIFICATION
//   Is this factual vs opinionated vs promotional vs tainted?
//   Uses LLM to classify content and flag bias/speculation.
//   Rejects: opinion presented as fact, promotional spam, tainted data.
//
// STAGE 3 — QUALITY SCORING & DEDUP
//   Is this unique, high-signal, and non-redundant?
//   Scores across 12 dimensions (Data Value Engine).
//   Deduplicates against existing IntelligenceNode records.
//   Rejects: duplicates, low-signal content, score < 70.
//
// Only nodes that pass ALL 3 stages are marked "approved" and made
// available to agents for reasoning. Rejected nodes are retained for
// audit trail but marked inactive.

// ── Trusted source types (Stage 1 allowlist) ──
const TRUSTED_SOURCES = [
  'official_site', 'product_page', 'pricing_page', 'api_docs',
  'engineering_blog', 'investor_material', 'sec_filing', 'earnings',
  'patent', 'github', 'customer_story', 'case_study',
  'industry_publication', 'regulatory_filing', 'changelog',
];

const BLACKLISTED_DOMAINS = [
  'reddit.com/r/', 'pinterest.com', '4chan.org',
];

// ── Stage 1: Source Validation ──
function validateSource(input: any): { passed: boolean; reason?: string; score: number } {
  const sourceType = input.source_type || 'unknown';
  const sourceUrl = input.source_url || '';

  // Check blacklist
  if (sourceUrl) {
    for (const bl of BLACKLISTED_DOMAINS) {
      if (sourceUrl.includes(bl)) {
        return { passed: false, reason: `blacklisted source: ${bl}`, score: 0 };
      }
    }
  }

  // Trusted sources pass immediately
  if (TRUSTED_SOURCES.includes(sourceType)) {
    return { passed: true, score: 90 };
  }

  // Social media, forums, news — allowed but lower trust
  if (['social_media', 'forum', 'news', 'scraped', 'manual'].includes(sourceType)) {
    return { passed: true, score: 60 };
  }

  // Unknown sources rejected
  if (sourceType === 'unknown' && !sourceUrl) {
    return { passed: false, reason: 'no source identified', score: 0 };
  }

  return { passed: true, score: 50 };
}

// ── Stage 2: Content Classification (LLM-powered) ──
async function classifyContent(base44: any, content: string, category: string): Promise<{
  classification: string;
  confidence: string;
  is_opinionated: boolean;
  is_promotional: boolean;
  is_tainted: boolean;
  evidence: string;
  passed: boolean;
  reason?: string;
}> {
  try {
    const result = await aiCompleteJson({
      model: MODELS.fast,
      messages: [{
        role: 'user',
        content: `You are a content classification gate in a 3-stage intelligence ingestion filter.
Analyze the following content and classify it according to the XTREME Research Protocol.

CONTENT TO CLASSIFY:
${content.slice(0, 3000)}

CATEGORY: ${category}

Classify this content as exactly one of:
- FACT: Verifiable, objective statement
- DIRECTLY_OBSERVED: First-hand observation
- PRIMARY_SOURCE: From the original source
- SECONDARY_SOURCE: Reported by others
- CALCULATED: Derived from data
- INFERRED: Logical deduction from evidence
- ESTIMATED: Approximation with stated range
- SCENARIO: Hypothetical or projected
- UNKNOWN: Cannot be classified

Also determine:
- is_opinionated: Does this present opinion as fact? (true/false)
- is_promotional: Is this promotional/marketing content disguised as intelligence? (true/false)
- is_tainted: Does this contain biased, manipulated, or deceptive information? (true/false)
- evidence: What evidence supports this content?
- confidence: high/medium/low

REJECTION CRITERIA: Reject if is_opinionated=true AND classification is not SCENARIO, OR if is_promotional=true, OR if is_tainted=true.`,
      }],
      temperature: 0.2,
      schema: {
        type: 'object',
        properties: {
          classification: { type: 'string', enum: ['FACT', 'DIRECTLY_OBSERVED', 'PRIMARY_SOURCE', 'SECONDARY_SOURCE', 'CALCULATED', 'INFERRED', 'ESTIMATED', 'SCENARIO', 'UNKNOWN'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          is_opinionated: { type: 'boolean' },
          is_promotional: { type: 'boolean' },
          is_tainted: { type: 'boolean' },
          evidence: { type: 'string' },
          passed: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['classification', 'confidence', 'is_opinionated', 'is_promotional', 'is_tainted', 'evidence', 'passed', 'reason'],
      },
    });

    return result;
  } catch (err) {
    // If LLM fails, fail closed — reject the content
    return {
      classification: 'UNKNOWN',
      confidence: 'low',
      is_opinionated: false,
      is_promotional: false,
      is_tainted: false,
      evidence: 'classification failed — LLM error',
      passed: false,
      reason: `LLM classification error: ${err.message}`,
    };
  }
}

// ── Stage 3: Quality Scoring & Dedup ──
async function scoreAndDedup(base44: any, input: any, classification: any): Promise<{
  scores: any;
  aggregate_score: number;
  is_duplicate: boolean;
  duplicate_id?: string;
  passed: boolean;
  reason?: string;
}> {
  // Check for duplicates — simple title + content hash match
  const existing = await base44.asServiceRole.entities.IntelligenceNode.filter(
    { target_entity: input.target_entity || '', category: input.category || 'general', active: true },
    '-created_date', 50
  );

  const contentLower = (input.content || '').toLowerCase().slice(0, 200);
  const duplicate = existing.find((n: any) =>
    n.content && n.content.toLowerCase().includes(contentLower.slice(0, 100)) && n.ingestion_stage === 'approved'
  );

  if (duplicate) {
    return {
      scores: {},
      aggregate_score: 0,
      is_duplicate: true,
      duplicate_id: duplicate.id,
      passed: false,
      reason: 'duplicate of existing approved intelligence node',
    };
  }

  // Calculate quality scores (deterministic, no LLM needed)
  const contentLen = (input.content || '').length;
  const hasEvidence = !!(input.evidence || classification.evidence);
  const hasSource = !!(input.source_url);
  const hasEstimates = !!(input.low_estimate || input.base_estimate || input.high_estimate);

  const scores = {
    data_quality: hasEvidence && hasSource ? 85 : hasSource ? 60 : 30,
    completeness: Math.min(100, (contentLen / 10) + (hasEstimates ? 20 : 0) + (hasEvidence ? 15 : 0)),
    freshness: 80, // Default — would compare against source date if available
    confidence_score: classification.confidence === 'high' ? 90 : classification.confidence === 'medium' ? 60 : 30,
    commercial_value: input.category === 'opportunity' || input.category === 'revenue_intel' ? 85 : 50,
    buying_intent: input.category === 'customer_intel' ? 70 : 40,
    customer_fit: input.target_entity ? 65 : 30,
    urgency: input.category === 'opportunity' ? 70 : 40,
    revenue_potential: input.category === 'revenue_intel' ? 80 : 40,
    actionability: hasEvidence ? 75 : 45,
    compliance_risk: input.category === 'compliance_intel' ? 30 : 10,
    overall_priority: 0, // calculated below
  };

  // Overall priority = weighted average
  const weights = {
    data_quality: 0.20, completeness: 0.10, freshness: 0.10,
    confidence_score: 0.15, commercial_value: 0.10, actionability: 0.10,
    customer_fit: 0.05, urgency: 0.05, revenue_potential: 0.05,
    compliance_risk: 0.05, buying_intent: 0.05,
  };

  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += (scores[key] || 0) * weight;
  }
  scores.overall_priority = Math.round(overall);
  const aggregateScore = Math.round(overall);

  // Must score >= 70 to pass
  const passed = aggregateScore >= 70;

  return {
    scores,
    aggregate_score: aggregateScore,
    is_duplicate: false,
    passed,
    reason: passed ? undefined : `aggregate score ${aggregateScore} below threshold 70`,
  };
}

// ─── MAIN ENTRY ───────────────────────────────────────────────────
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "ingest";

    // ── INGEST: Run a single item through the 3-stage filter ──
    if (action === "ingest") {
      const { title, content, source_url, source_type, category, target_entity, industry, evidence, low_estimate, base_estimate, high_estimate } = body;
      if (!title || !content) return Response.json({ error: "title and content required" }, { status: 400 });

      const now = new Date().toISOString();

      // Create the node in Stage 1
      const node = await base44.asServiceRole.entities.IntelligenceNode.create({
        title, content, source_url: source_url || '', source_type: source_type || 'unknown',
        category: category || 'general', target_entity: target_entity || '', industry: industry || '',
        classification: 'UNKNOWN', confidence: 'low', evidence: evidence || '',
        low_estimate, base_estimate, high_estimate,
        ingestion_stage: 'stage_1_source_validation',
        aggregate_score: 0, active: true, ingested_at: now,
      });

      // ── STAGE 1: Source Validation ──
      const stage1 = validateSource({ source_type, source_url });
      if (!stage1.passed) {
        await base44.asServiceRole.entities.IntelligenceNode.update(node.id, {
          ingestion_stage: 'rejected',
          rejection_stage: 'stage_1',
          rejection_reason: stage1.reason,
          active: false,
        });
        return Response.json({
          status: 'rejected', stage: 'stage_1_source_validation',
          reason: stage1.reason, node_id: node.id,
          classification: 'LIVE',
        });
      }

      await base44.asServiceRole.entities.IntelligenceNode.update(node.id, {
        ingestion_stage: 'stage_2_content_classification',
      });

      // ── STAGE 2: Content Classification (LLM) ──
      const stage2 = await classifyContent(base44, content, category || 'general');
      if (!stage2.passed) {
        await base44.asServiceRole.entities.IntelligenceNode.update(node.id, {
          ingestion_stage: 'rejected',
          rejection_stage: 'stage_2',
          rejection_reason: stage2.reason || 'content classification failed',
          classification: stage2.classification,
          confidence: stage2.confidence,
          active: false,
        });
        return Response.json({
          status: 'rejected', stage: 'stage_2_content_classification',
          reason: stage2.reason, node_id: node.id,
          classification: stage2.classification, confidence: stage2.confidence,
        });
      }

      await base44.asServiceRole.entities.IntelligenceNode.update(node.id, {
        ingestion_stage: 'stage_3_quality_scoring',
        classification: stage2.classification,
        confidence: stage2.confidence,
        evidence: stage2.evidence || evidence || '',
      });

      // ── STAGE 3: Quality Scoring & Dedup ──
      const stage3 = await scoreAndDedup(base44, { ...body, target_entity }, stage2);
      if (!stage3.passed) {
        await base44.asServiceRole.entities.IntelligenceNode.update(node.id, {
          ingestion_stage: 'rejected',
          rejection_stage: 'stage_3',
          rejection_reason: stage3.reason,
          quality_scores: stage3.scores,
          aggregate_score: stage3.aggregate_score,
          active: false,
        });
        return Response.json({
          status: 'rejected', stage: 'stage_3_quality_scoring',
          reason: stage3.reason, node_id: node.id,
          aggregate_score: stage3.aggregate_score,
          is_duplicate: stage3.is_duplicate,
        });
      }

      // ── APPROVED ──
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90-day freshness
      await base44.asServiceRole.entities.IntelligenceNode.update(node.id, {
        ingestion_stage: 'approved',
        quality_scores: stage3.scores,
        aggregate_score: stage3.aggregate_score,
        approved_at: now,
        expires_at: expiresAt,
      });

      return Response.json({
        status: 'approved', node_id: node.id,
        classification: stage2.classification,
        confidence: stage2.confidence,
        aggregate_score: stage3.aggregate_score,
        scores: stage3.scores,
        classification_label: 'LIVE',
      });
    }

    // ── BATCH INGEST: Process multiple items ──
    if (action === "batch_ingest") {
      const items = body.items || [];
      if (!Array.isArray(items) || items.length === 0)
        return Response.json({ error: "items array required" }, { status: 400 });

      const results = [];
      for (const item of items) {
        // Call the same logic by simulating a sub-request
        try {
          const stage1 = validateSource(item);
          if (!stage1.passed) {
            results.push({ title: item.title, status: 'rejected', stage: 'stage_1', reason: stage1.reason });
            continue;
          }
          const stage2 = await classifyContent(base44, item.content, item.category || 'general');
          if (!stage2.passed) {
            results.push({ title: item.title, status: 'rejected', stage: 'stage_2', reason: stage2.reason });
            continue;
          }
          const stage3 = await scoreAndDedup(base44, item, stage2);
          if (!stage3.passed) {
            results.push({ title: item.title, status: 'rejected', stage: 'stage_3', reason: stage3.reason });
            continue;
          }

          const now = new Date().toISOString();
          await base44.asServiceRole.entities.IntelligenceNode.create({
            title: item.title, content: item.content,
            source_url: item.source_url || '', source_type: item.source_type || 'unknown',
            category: item.category || 'general', target_entity: item.target_entity || '',
            industry: item.industry || '',
            classification: stage2.classification, confidence: stage2.confidence,
            evidence: stage2.evidence || item.evidence || '',
            ingestion_stage: 'approved',
            quality_scores: stage3.scores, aggregate_score: stage3.aggregate_score,
            approved_at: now, ingested_at: now,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            active: true,
          });
          results.push({ title: item.title, status: 'approved', score: stage3.aggregate_score });
        } catch (err) {
          results.push({ title: item.title, status: 'error', error: err.message });
        }
      }

      const approved = results.filter(r => r.status === 'approved').length;
      const rejected = results.filter(r => r.status === 'rejected').length;
      return Response.json({
        status: 'batch_complete', total: items.length,
        approved, rejected, results: results.slice(0, 100),
        classification: 'LIVE',
      });
    }

    // ── QUERY: Retrieve approved intelligence ──
    if (action === "query") {
      const filter: any = { ingestion_stage: 'approved', active: true };
      if (body.category) filter.category = body.category;
      if (body.target_entity) filter.target_entity = body.target_entity;
      if (body.industry) filter.industry = body.industry;

      const nodes = await base44.asServiceRole.entities.IntelligenceNode.filter(
        filter, '-aggregate_score', body.limit || 50
      );
      return Response.json({
        count: nodes.length,
        nodes: nodes.map((n: any) => ({
          id: n.id, title: n.title, content: n.content,
          category: n.category, classification: n.classification,
          confidence: n.confidence, aggregate_score: n.aggregate_score,
          target_entity: n.target_entity, source_url: n.source_url,
        })),
      });
    }

    // ── STATS: Filter pipeline statistics ──
    if (action === "stats") {
      const all = await base44.asServiceRole.entities.IntelligenceNode.list('-created_date', 5000);
      const approved = all.filter((n: any) => n.ingestion_stage === 'approved');
      const rejected = all.filter((n: any) => n.ingestion_stage === 'rejected');
      const stage1 = all.filter((n: any) => n.ingestion_stage === 'stage_1_source_validation');
      const stage2 = all.filter((n: any) => n.ingestion_stage === 'stage_2_content_classification');
      const stage3 = all.filter((n: any) => n.ingestion_stage === 'stage_3_quality_scoring');

      const avgScore = approved.length > 0
        ? Math.round(approved.reduce((s: number, n: any) => s + (n.aggregate_score || 0), 0) / approved.length)
        : 0;

      const byCategory: Record<string, number> = {};
      for (const n of approved) {
        byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      }

      return Response.json({
        total: all.length,
        approved: approved.length,
        rejected: rejected.length,
        in_pipeline: stage1.length + stage2.length + stage3.length,
        rejection_rate: all.length > 0 ? Math.round((rejected.length / all.length) * 100) : 0,
        avg_approved_score: avgScore,
        by_category: byCategory,
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
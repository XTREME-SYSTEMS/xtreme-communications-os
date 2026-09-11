import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';
import { AGENT_COUNCIL, getAgentsForTopic } from '../../shared/agentCouncil.ts';

// ─── COUNCIL DELIBERATION ENGINE ───────────────────────────────────
// The adversarial agent council. No single agent unilaterally
// determines critical decisions. Agents produce structured positions.
// Council debates. Executive Synthesis resolves.
//
// Protocol per agent:
//   claim, evidence, confidence, recommendation, counterargument,
//   expected_outcome, risk, cost_estimate, reversibility
//
// Critical actions require policy approval.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "deliberate";

    // ── LIST AGENTS: Return the 38-agent council roster ──
    if (action === "list_agents") {
      return Response.json({
        total: AGENT_COUNCIL.length,
        agents: AGENT_COUNCIL.map(a => ({ name: a.name, role: a.role, archetype: a.archetype, expertise: a.expertise })),
      });
    }

    // ── DELIBERATE: Run a council session on a topic ──
    if (action === "deliberate") {
      const { topic, session_type, context, force_all_agents } = body;
      if (!topic) return Response.json({ error: "topic required" }, { status: 400 });

      const now = new Date().toISOString();
      const relevantAgents = force_all_agents ? AGENT_COUNCIL : getAgentsForTopic(topic);

      // Create the session record
      const session = await base44.asServiceRole.entities.CouncilSession.create({
        topic,
        session_type: session_type || 'decision',
        status: 'debating',
        participants: relevantAgents.map(a => a.name),
        positions: [],
        started_at: now,
      });

      // Generate positions from each agent (batched to avoid timeout)
      const positions: any[] = [];
      const batchSize = 5;
      for (let i = 0; i < relevantAgents.length; i += batchSize) {
        const batch = relevantAgents.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (agent) => {
          try {
            const result = await aiCompleteJson({
              model: MODELS.fast,
              messages: [{
                role: 'user',
                content: `You are ${agent.name}, the ${agent.role} in an autonomous AI council.
Your expertise: ${agent.expertise.join(', ')}.

COUNCIL TOPIC: ${topic}
${context ? `CONTEXT: ${context}` : ''}

Provide your position as a JSON object with:
- claim: Your main claim or finding
- evidence: What evidence supports this
- confidence: high/medium/low
- recommendation: What you recommend doing
- counterargument: The strongest argument AGAINST your position
- expected_outcome: What you expect to happen if your recommendation is followed
- risk: Key risk to consider
- cost_estimate: Rough cost to implement (low/medium/high)
- reversibility: reversible/partially_reversible/irreversible

Be specific and evidence-based. Do not fabricate.`,
              }],
              temperature: 0.4,
              schema: {
                type: 'object',
                properties: {
                  claim: { type: 'string' },
                  evidence: { type: 'string' },
                  confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                  recommendation: { type: 'string' },
                  counterargument: { type: 'string' },
                  expected_outcome: { type: 'string' },
                  risk: { type: 'string' },
                  cost_estimate: { type: 'string', enum: ['low', 'medium', 'high'] },
                  reversibility: { type: 'string', enum: ['reversible', 'partially_reversible', 'irreversible'] },
                },
                required: ['claim', 'evidence', 'confidence', 'recommendation', 'counterargument', 'expected_outcome', 'risk', 'cost_estimate', 'reversibility'],
              },
            });
            return { agent_name: agent.name, ...result };
          } catch (err: any) {
            return { agent_name: agent.name, claim: `Error: ${err.message}`, evidence: '', confidence: 'low', recommendation: '', counterargument: '', expected_outcome: '', risk: 'unknown', cost_estimate: 'low', reversibility: 'reversible' };
          }
        }));
        positions.push(...batchResults);

        // Update session with positions so far
        await base44.asServiceRole.entities.CouncilSession.update(session.id, { positions });
      }

      // ── SYNTHESIS: Executive Synthesis resolves the debate ──
      await base44.asServiceRole.entities.CouncilSession.update(session.id, { status: 'synthesizing' });

      let synthesisResult: any;
      try {
        synthesisResult = await aiCompleteJson({
          model: MODELS.best,
          messages: [{
            role: 'user',
            content: `You are the Executive Synthesis agent. ${positions.length} council members have debated the following topic:

TOPIC: ${topic}

POSITIONS:
${positions.map(p => `[${p.agent_name}] Claim: ${p.claim} | Recommendation: ${p.recommendation} | Confidence: ${p.confidence} | Risk: ${p.risk} | Counter: ${p.counterargument}`).join('\n')}

Synthesize these positions into a final decision. Provide:
- synthesis: Executive summary of the debate and resolution
- decision: The specific action to take
- consensus_level: unanimous/strong/moderate/split/none
- dissenting_views: Key dissenting opinions to preserve
- policy_approval_required: true if this is irreversible, high-risk, legally sensitive, or financially material
- next_actions: 3-5 concrete next steps`,
          }],
          temperature: 0.3,
          schema: {
            type: 'object',
            properties: {
              synthesis: { type: 'string' },
              decision: { type: 'string' },
              consensus_level: { type: 'string', enum: ['unanimous', 'strong', 'moderate', 'split', 'none'] },
              dissenting_views: { type: 'array', items: { type: 'string' } },
              policy_approval_required: { type: 'boolean' },
              next_actions: { type: 'array', items: { type: 'string' } },
            },
            required: ['synthesis', 'decision', 'consensus_level', 'policy_approval_required'],
          },
        });
      } catch (err: any) {
        synthesisResult = { synthesis: `Synthesis failed: ${err.message}`, decision: 'Manual review required', consensus_level: 'none', dissenting_views: [], policy_approval_required: true, next_actions: [] };
      }

      // Update session with synthesis
      await base44.asServiceRole.entities.CouncilSession.update(session.id, {
        status: 'resolved',
        synthesis: synthesisResult.synthesis,
        decision: synthesisResult.decision,
        consensus_level: synthesisResult.consensus_level,
        dissenting_views: synthesisResult.dissenting_views || [],
        policy_approval_required: synthesisResult.policy_approval_required,
        resolved_at: new Date().toISOString(),
      });

      return Response.json({
        status: 'resolved',
        session_id: session.id,
        topic,
        participants: relevantAgents.map(a => a.name),
        positions,
        synthesis: synthesisResult.synthesis,
        decision: synthesisResult.decision,
        consensus_level: synthesisResult.consensus_level,
        dissenting_views: synthesisResult.dissenting_views || [],
        policy_approval_required: synthesisResult.policy_approval_required,
        next_actions: synthesisResult.next_actions || [],
      });
    }

    // ── LIST SESSIONS: Return recent council sessions ──
    if (action === "list_sessions") {
      const sessions = await base44.asServiceRole.entities.CouncilSession.list('-created_date', body.limit || 20);
      return Response.json({ sessions });
    }

    // ── GET SESSION: Return a specific session with full positions ──
    if (action === "get_session") {
      const session = await base44.asServiceRole.entities.CouncilSession.get(body.session_id);
      return Response.json({ session });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
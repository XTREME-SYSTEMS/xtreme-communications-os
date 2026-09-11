import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';

// ─── VISION SWEEP ──────────────────────────────────────────────────
// Sweeps forums, social, and web for niches, problems, opportunities.
// Identifies the lowest-hanging fruit using existing assets and
// industry intelligence. Creates KnowledgeQuest records for each
// opportunity found.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "sweep";

    // ── SWEEP: Identify opportunities ──
    if (action === "sweep") {
      const { existing_assets, industry, goals, max_opportunities } = body;

      const result = await aiCompleteJson({
        model: MODELS.best,
        messages: [{
          role: 'user',
          content: `You are the Vision Sweep agent in an autonomous intelligence platform.
Your job is to identify the lowest-hanging fruit opportunities.

EXISTING ASSETS: ${JSON.stringify(existing_assets || ['AI communications platform', 'Telnyx phone numbers', 'Vercel AI Gateway', 'Supabase vector DB'])}
INDUSTRY FOCUS: ${industry || 'construction, home services, SaaS'}
GOALS: ${JSON.stringify(goals || ['maximize autonomous economic output per dollar of infrastructure'])}

Identify ${max_opportunities || 5} opportunities ranked by:
- revenue_potential (0-100)
- time_to_revenue (days)
- cac_difficulty (1-10, lower is easier)
- data_availability (0-100)
- competition (1-10, lower is better)
- technical_complexity (1-10, lower is easier)
- automation_potential (0-100)
- strategic_defensibility (0-100)

For each opportunity provide:
- title: Short name
- description: What it is
- category: competitive_intel, customer_intel, market_intel, opportunity, business_strategy
- target_entity: Who/what to research first
- research_questions: 3-5 specific questions to answer
- priority: critical/high/medium/low
- estimated_revenue: Monthly revenue potential in USD
- estimated_cost: Monthly cost in USD
- quick_win: true if achievable in 90 days

Also provide:
- executive_summary: 2-3 sentence overview
- next_actions: 3-5 concrete steps to start`,
        }],
        temperature: 0.5,
        schema: {
          type: 'object',
          properties: {
            opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  target_entity: { type: 'string' },
                  research_questions: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  estimated_revenue: { type: 'number' },
                  estimated_cost: { type: 'number' },
                  quick_win: { type: 'boolean' },
                  scores: { type: 'object', properties: {
                    revenue_potential: { type: 'number' },
                    time_to_revenue_days: { type: 'number' },
                    cac_difficulty: { type: 'number' },
                    data_availability: { type: 'number' },
                    competition: { type: 'number' },
                    technical_complexity: { type: 'number' },
                    automation_potential: { type: 'number' },
                    strategic_defensibility: { type: 'number' },
                  } },
                },
                required: ['title', 'description', 'category', 'priority', 'quick_win'],
              },
            },
            executive_summary: { type: 'string' },
            next_actions: { type: 'array', items: { type: 'string' } },
          },
          required: ['opportunities', 'executive_summary', 'next_actions'],
        },
      });

      // Create KnowledgeQuest records for each opportunity
      const questsCreated: any[] = [];
      for (const opp of (result.opportunities || [])) {
        try {
          const quest = await base44.asServiceRole.entities.KnowledgeQuest.create({
            title: opp.title,
            category: opp.category || 'opportunity',
            target_entity: opp.target_entity || '',
            depth: 'exhaustive',
            status: 'pending',
            priority: opp.priority || 'medium',
            research_questions: opp.research_questions || [],
            summary: opp.description,
            created_by: 'vision_sweep',
          });
          questsCreated.push({ id: quest.id, title: opp.title, priority: opp.priority });
        } catch (err: any) {
          console.error(`Failed to create quest for ${opp.title}: ${err.message}`);
        }
      }

      return Response.json({
        status: 'completed',
        opportunities: result.opportunities || [],
        quests_created: questsCreated,
        executive_summary: result.executive_summary,
        next_actions: result.next_actions || [],
      });
    }

    // ── LIST QUESTS: Return knowledge quests ──
    if (action === "list_quests") {
      const quests = await base44.asServiceRole.entities.KnowledgeQuest.list('-created_date', body.limit || 50);
      return Response.json({ quests });
    }

    // ── ACTIVATE MISSION: Start a knowledge quest ──
    if (action === "activate_mission") {
      const { quest_id } = body;
      if (!quest_id) return Response.json({ error: "quest_id required" }, { status: 400 });

      await base44.asServiceRole.entities.KnowledgeQuest.update(quest_id, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });

      return Response.json({ status: 'activated', quest_id });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
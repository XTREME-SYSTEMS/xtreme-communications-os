import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';

// ─── SIMULATION ENGINE ─────────────────────────────────────────────
// Before implementation, simulate outcomes across time horizons.
// Models: agents, tasks, records, customers, API calls, browser
// sessions, LLM calls, costs, revenue, failures, retries, human
// interventions, conversion, capacity, bottlenecks, security events,
// data quality.
//
// Produces: base / conservative / aggressive / failure cases.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "simulate";

    // ── SIMULATE: Run a simulation for a scenario ──
    if (action === "simulate") {
      const { scenario_name, description, time_horizon, assumptions } = body;
      if (!scenario_name) return Response.json({ error: "scenario_name required" }, { status: 400 });

      const now = new Date().toISOString();
      const horizon = time_horizon || '30d';

      // Create the simulation record
      const simRecord = await base44.asServiceRole.entities.SimulationResult.create({
        scenario_name,
        description: description || '',
        time_horizon: horizon,
        status: 'running',
        cases: {},
        created_at: now,
      });

      // Run the simulation through AI Gateway
      let simResult: any;
      try {
        simResult = await aiCompleteJson({
          model: MODELS.best,
          messages: [{
            role: 'user',
            content: `You are a simulation engine for an autonomous AI business platform.
Simulate the following scenario over a ${horizon} time horizon.

SCENARIO: ${scenario_name}
DESCRIPTION: ${description || 'N/A'}
ASSUMPTIONS: ${JSON.stringify(assumptions || {})}

Model the following for 4 cases (base, conservative, aggressive, failure):
- revenue: Expected revenue in USD
- cost: Total cost in USD (LLM, API, infrastructure, data)
- profit: revenue - cost
- customers: Number of customers acquired
- tasks_completed: Number of tasks the AI agents complete
- failure_rate: Percentage of tasks that fail (0-100)
- human_interventions: Number of times human review is needed

For the failure case, also provide:
- failure_mode: What breaks first

Also provide:
- bottlenecks: Array of capacity bottlenecks
- cost_breakdown: Object with cost categories (llm_tokens, api_calls, browser_minutes, infrastructure, data)
- recommendation: Whether to proceed and how
- red_team_findings: Array of attack vectors and failure modes

Be realistic and evidence-based. Use your knowledge of SaaS economics, AI costs, and conversion rates.`,
          }],
          temperature: 0.3,
          schema: {
            type: 'object',
            properties: {
              cases: {
                type: 'object',
                properties: {
                  base: { type: 'object', properties: { revenue: { type: 'number' }, cost: { type: 'number' }, profit: { type: 'number' }, customers: { type: 'number' }, tasks_completed: { type: 'number' }, failure_rate: { type: 'number' }, human_interventions: { type: 'number' } } },
                  conservative: { type: 'object', properties: { revenue: { type: 'number' }, cost: { type: 'number' }, profit: { type: 'number' }, customers: { type: 'number' }, tasks_completed: { type: 'number' }, failure_rate: { type: 'number' }, human_interventions: { type: 'number' } } },
                  aggressive: { type: 'object', properties: { revenue: { type: 'number' }, cost: { type: 'number' }, profit: { type: 'number' }, customers: { type: 'number' }, tasks_completed: { type: 'number' }, failure_rate: { type: 'number' }, human_interventions: { type: 'number' } } },
                  failure: { type: 'object', properties: { revenue: { type: 'number' }, cost: { type: 'number' }, profit: { type: 'number' }, customers: { type: 'number' }, tasks_completed: { type: 'number' }, failure_rate: { type: 'number' }, human_interventions: { type: 'number' }, failure_mode: { type: 'string' } } },
                },
              },
              bottlenecks: { type: 'array', items: { type: 'string' } },
              cost_breakdown: { type: 'object' },
              recommendation: { type: 'string' },
              red_team_findings: { type: 'array', items: { type: 'string' } },
            },
            required: ['cases', 'bottlenecks', 'recommendation', 'red_team_findings'],
          },
        });
      } catch (err: any) {
        simResult = { cases: {}, bottlenecks: [`Simulation failed: ${err.message}`], cost_breakdown: {}, recommendation: 'Manual analysis required', red_team_findings: ['Simulation engine failure'] };
      }

      await base44.asServiceRole.entities.SimulationResult.update(simRecord.id, {
        status: 'completed',
        cases: simResult.cases || {},
        bottlenecks: simResult.bottlenecks || [],
        cost_breakdown: simResult.cost_breakdown || {},
        recommendation: simResult.recommendation || '',
        red_team_findings: simResult.red_team_findings || [],
        completed_at: new Date().toISOString(),
      });

      return Response.json({
        status: 'completed',
        simulation_id: simRecord.id,
        scenario_name,
        time_horizon: horizon,
        ...simResult,
      });
    }

    // ── LIST: Return recent simulations ──
    if (action === "list") {
      const sims = await base44.asServiceRole.entities.SimulationResult.list('-created_date', body.limit || 20);
      return Response.json({ simulations: sims });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
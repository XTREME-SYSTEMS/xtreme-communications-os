import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action;

    // ── PARSE INTENT: convert operator language to deterministic OperatorIntent ──
    if (action === 'parse_intent') {
      const { text } = body;
      if (!text) return Response.json({ error: 'text required' }, { status: 400 });

      // Gather fleet context for the LLM
      const [systems, recentRepairs, pendingApprovals, recentIncidents] = await Promise.all([
        base44.asServiceRole.entities.XtremeSystem.list('-updated_date', 50).catch(() => []),
        base44.asServiceRole.entities.RepairPacket.filter({ status: 'pending' }).catch(() => []),
        base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' }).catch(() => []),
        base44.asServiceRole.entities.IncidentRecord.filter({ status: 'active' }).catch(() => []),
      ]);

      const fleetContext = {
        systems: systems.map((s: any) => ({
          system_id: s.system_id, name: s.name, mode: s.lifecycle_mode,
          score: s.verified_score, distance: s.distance_to_100,
          p0: s.p0_count, p1: s.p1_count,
        })),
        pending_repairs: recentRepairs.length,
        pending_approvals: pendingApprovals.length,
        active_incidents: recentIncidents.length,
      };

      const prompt = `You are Shadow Vision Cortex, the conversational command interface for the XTREME Universal Autonomous Operating Fabric.

FLEET CONTEXT:
${JSON.stringify(fleetContext, null, 2)}

OPERATOR INPUT: "${text}"

Your job:
1. Parse the operator's intent into a deterministic OperatorIntent record.
2. If the operator is asking a question about fleet/system status, answer it using ONLY the fleet context above.
3. If the operator is giving a command (finish, repair, release, register), extract the system_id, objective, scope, priority, and risk.

Respond as JSON with this schema:
{
  "parsed_intent": "finish_system|audit_system|repair_system|release_system|query_status|query_fleet|query_failure|query_cost|query_approval|compare|prepare_release|register_system|governance_change|general_query",
  "system_id": "target system id or null",
  "objective": "deterministic objective statement",
  "scope": "what's in scope",
  "priority": "critical|high|medium|low",
  "risk_level": "low|medium|high|critical",
  "approval_policy": "auto|operator_required|protected",
  "response": "your response to the operator — be specific, cite evidence, never invent state"
}`;

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            parsed_intent: { type: 'string' },
            system_id: { type: 'string' },
            objective: { type: 'string' },
            scope: { type: 'string' },
            priority: { type: 'string' },
            risk_level: { type: 'string' },
            approval_policy: { type: 'string' },
            response: { type: 'string' },
          },
          required: ['parsed_intent', 'response'],
        },
      });

      const parsed = llmRes as any;

      // Persist the intent
      const intent = await base44.asServiceRole.entities.OperatorIntent.create({
        raw_text: text,
        parsed_intent: parsed.parsed_intent || 'general_query',
        system_id: parsed.system_id || '',
        objective: parsed.objective || '',
        scope: parsed.scope || '',
        priority: parsed.priority || 'medium',
        risk_level: parsed.risk_level || 'medium',
        approval_policy: parsed.approval_policy || 'auto',
        vision_cortex_response: parsed.response || '',
        status: 'parsed',
        created_by: user.id,
      });

      return Response.json({
        action: 'parse_intent',
        intent_id: intent.id,
        parsed_intent: parsed.parsed_intent,
        response: parsed.response,
        system_id: parsed.system_id,
      });
    }

    // ── QUERY FLEET STATUS: answer "what's the fleet status?" ──
    if (action === 'fleet_status') {
      const systems = await base44.asServiceRole.entities.XtremeSystem.list('-updated_date', 100).catch(() => []);
      const [repairs, approvals, incidents, heartbeats] = await Promise.all([
        base44.asServiceRole.entities.RepairPacket.filter({ status: 'in_progress' }).catch(() => []),
        base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' }).catch(() => []),
        base44.asServiceRole.entities.IncidentRecord.filter({ status: 'active' }).catch(() => []),
        base44.asServiceRole.entities.FleetHeartbeat.list('-created_date', 1).catch(() => []),
      ]);

      const fleet = {
        systems_total: systems.length,
        systems_verified_100: systems.filter((s: any) => s.lifecycle_mode === 'preservation').length,
        systems_in_sprint: systems.filter((s: any) => s.lifecycle_mode === 'completion_sprint').length,
        systems_degraded: systems.filter((s: any) => s.lifecycle_mode === 'degraded').length,
        systems_blocked: systems.filter((s: any) => s.lifecycle_mode === 'blocked').length,
        active_repairs: repairs.length,
        pending_approvals: approvals.length,
        active_incidents: incidents.length,
        last_heartbeat: heartbeats[0] || null,
        systems: systems.map((s: any) => ({
          system_id: s.system_id,
          name: s.name,
          mode: s.lifecycle_mode,
          score: s.verified_score,
          distance: s.distance_to_100,
          p0: s.p0_count,
          p1: s.p1_count,
        })),
      };

      return Response.json({ action: 'fleet_status', fleet });
    }

    // ── QUERY SYSTEM: answer "why is X blocked?" ──
    if (action === 'query_system') {
      const { system_id } = body;
      if (!system_id) return Response.json({ error: 'system_id required' }, { status: 400 });

      const [system, benchmarks, repairs, incidents] = await Promise.all([
        base44.asServiceRole.entities.XtremeSystem.filter({ system_id }).catch(() => []),
        base44.asServiceRole.entities.BenchmarkResult.filter({ system_id, status: 'fail' }).catch(() => []),
        base44.asServiceRole.entities.RepairPacket.filter({ system_id, status: 'pending' }).catch(() => []),
        base44.asServiceRole.entities.IncidentRecord.filter({ system_id, status: 'active' }).catch(() => []),
      ]);

      return Response.json({
        action: 'query_system',
        system: system[0] || null,
        failed_benchmarks: benchmarks,
        pending_repairs: repairs,
        active_incidents: incidents,
      });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
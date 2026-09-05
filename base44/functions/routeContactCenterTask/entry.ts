import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Contact center routing engine. Assigns inbound communication tasks to available
// agents based on skill weights and SLA parameters. Escalates to supervisors when
// no agent is available.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const key = keys[0];
    const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    if (!tenant || tenant.status !== "active") return Response.json({ error: "tenant not active" }, { status: 403 });

    const conversation_id = body.conversation_id;
    if (!conversation_id) return Response.json({ error: "conversation_id required" }, { status: 400 });

    // Resolve queue (default to highest-priority enabled queue)
    let queue = null;
    if (body.queue_id) {
      try { queue = await base44.asServiceRole.entities.RoutingQueue.get(body.queue_id); } catch (_) {}
    }
    if (!queue) {
      const queues = await base44.asServiceRole.entities.RoutingQueue.filter({ tenant_id: tenant.id, enabled: true });
      queue = queues.sort((a, b) => (a.priority || 100) - (b.priority || 100))[0];
    }
    if (!queue) return Response.json({ error: "no enabled queue", status: "unrouted" }, { status: 404 });

    const slaDueAt = new Date(Date.now() + (queue.sla_seconds || 30) * 1000).toISOString();
    const task = await base44.asServiceRole.entities.TaskAssignment.create({
      tenant_id: tenant.id, conversation_id, queue_id: queue.id,
      status: "queued", priority: queue.priority || 100, sla_due_at: slaDueAt,
    });

    // Candidate agents: online + under capacity
    const agents = await base44.asServiceRole.entities.Agent.filter({ tenant_id: tenant.id, status: "online" });
    const required = new Set(queue.skills_required || []);
    let candidates = agents.filter(a => (a.current_load || 0) < (a.max_concurrent || 5));

    // Score by skill weight match + lowest load
    let best = null, bestScore = -Infinity;
    for (const a of candidates) {
      let score = -(a.current_load || 0) * 0.5;
      if (a.skill_profile_id && required.size) {
        try {
          const profile = await base44.asServiceRole.entities.SkillProfile.get(a.skill_profile_id);
          const weights = profile.weights || {};
          for (const s of required) {
            if ((profile.skills || []).includes(s)) score += (weights[s] || 1);
          }
        } catch (_) {}
      }
      if (score > bestScore) { bestScore = score; best = a; }
    }

    if (!best) {
      const supervisors = agents.filter(a => a.supervisor);
      await base44.asServiceRole.entities.TaskAssignment.update(task.id, { status: "escalated" });
      return Response.json({
        task_id: task.id, status: "escalated", reason: "no_available_agent",
        sla_due_at: slaDueAt, supervisors: supervisors.map(s => s.id),
      });
    }

    await base44.asServiceRole.entities.TaskAssignment.update(task.id, {
      status: "assigned", agent_id: best.id, assigned_at: new Date().toISOString(),
    });
    await base44.asServiceRole.entities.Agent.update(best.id, {
      current_load: (best.current_load || 0) + 1, last_assigned_at: new Date().toISOString(),
    });

    return Response.json({
      task_id: task.id, status: "assigned", agent_id: best.id, agent_name: best.name,
      queue: queue.name, sla_due_at: slaDueAt, score: bestScore,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
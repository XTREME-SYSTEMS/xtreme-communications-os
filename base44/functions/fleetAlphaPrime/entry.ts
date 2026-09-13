import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action;

    // ── FLEET CYCLE: the 5-minute heartbeat ──
    if (action === 'fleet_cycle') {
      const cycleStart = new Date().toISOString();

      // 1. Inspect all systems
      const systems = await base44.asServiceRole.entities.XtremeSystem.list('-updated_date', 100).catch(() => []);
      const [pendingRepairs, activeIncidents, pendingApprovals, recentBenchmarks] = await Promise.all([
        base44.asServiceRole.entities.RepairPacket.filter({ status: 'pending' }).catch(() => []),
        base44.asServiceRole.entities.IncidentRecord.filter({ status: 'active' }).catch(() => []),
        base44.asServiceRole.entities.ApprovalRequest.filter({ status: 'pending' }).catch(() => []),
        base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 50).catch(() => []),
      ]);

      // 2. Calculate fleet status
      const p0Count = systems.reduce((sum: number, s: any) => sum + (s.p0_count || 0), 0);
      const p1Count = systems.reduce((sum: number, s: any) => sum + (s.p1_count || 0), 0);
      const verified100 = systems.filter((s: any) => s.lifecycle_mode === 'preservation').length;
      const inSprint = systems.filter((s: any) => s.lifecycle_mode === 'completion_sprint').length;
      const degraded = systems.filter((s: any) => s.lifecycle_mode === 'degraded').length;
      const blocked = systems.filter((s: any) => s.lifecycle_mode === 'blocked').length;

      let fleetStatus = 'healthy';
      if (p0Count > 0 || activeIncidents.length > 0) fleetStatus = 'critical';
      else if (degraded > 0 || p1Count > 5) fleetStatus = 'degraded';

      // 3. Determine priority actions
      const actions: string[] = [];

      // Auto-escalate degraded systems back to completion_sprint
      for (const sys of systems) {
        if (sys.lifecycle_mode === 'degraded') {
          await base44.asServiceRole.entities.XtremeSystem.update(sys.id, { lifecycle_mode: 'completion_sprint' });
          actions.push(`Escalated ${sys.system_id} from DEGRADED → COMPLETION_SPRINT`);
        }
        // Promote to preservation after 3 consecutive passes
        if (sys.lifecycle_mode === 'completion_sprint' && (sys.consecutive_passes || 0) >= 3) {
          await base44.asServiceRole.entities.XtremeSystem.update(sys.id, { lifecycle_mode: 'preservation' });
          actions.push(`Promoted ${sys.system_id} → PRESERVATION (3 consecutive passes)`);
        }
      }

      // 4. Prioritize pending repairs by severity
      const sortedRepairs = pendingRepairs.sort((a: any, b: any) => {
        const order = { p0: 0, p1: 1, p2: 2, p3: 3 };
        return (order[a.priority] || 2) - (order[b.priority] || 2);
      });

      // 5. Identify systems closest to launch
      const closestToLaunch = systems
        .filter((s: any) => s.distance_to_100 < 20 && s.lifecycle_mode !== 'preservation')
        .sort((a: any, b: any) => a.distance_to_100 - b.distance_to_100);

      if (closestToLaunch.length > 0) {
        actions.push(`Prioritizing ${closestToLaunch[0].system_id} (distance: ${closestToLaunch[0].distance_to_100})`);
      }

      // 6. Record heartbeat
      const heartbeat = await base44.asServiceRole.entities.FleetHeartbeat.create({
        clock_type: 'primary',
        fleet_status: fleetStatus,
        systems_total: systems.length,
        systems_verified_100: verified100,
        systems_in_sprint: inSprint,
        systems_degraded: degraded,
        systems_blocked: blocked,
        active_jobs: sortedRepairs.length,
        active_agents: 0,
        active_repairs: pendingRepairs.length,
        pending_validations: 0,
        pending_approvals: pendingApprovals.length,
        p0_count: p0Count,
        p1_count: p1Count,
        queue_depth: pendingRepairs.length,
        worker_health: 'healthy',
        cost_this_cycle: 0,
        lease_held: true,
        actions_taken: actions,
        next_action: sortedRepairs.length > 0
          ? `Process ${sortedRepairs.length} pending repairs (next: ${sortedRepairs[0].repair_id})`
          : 'No pending repairs — fleet stable',
      });

      return Response.json({
        action: 'fleet_cycle',
        cycle_start: cycleStart,
        fleet_status: fleetStatus,
        systems_total: systems.length,
        systems_verified_100: verified100,
        systems_in_sprint: inSprint,
        systems_degraded: degraded,
        systems_blocked: blocked,
        p0: p0Count,
        p1: p1Count,
        active_repairs: pendingRepairs.length,
        pending_approvals: pendingApprovals.length,
        active_incidents: activeIncidents.length,
        closest_to_launch: closestToLaunch.slice(0, 3).map((s: any) => ({
          system_id: s.system_id,
          distance: s.distance_to_100,
          mode: s.lifecycle_mode,
        })),
        actions_taken: actions,
        next_action: heartbeat.next_action,
      });
    }

    // ── PRIORITIZE: calculate repair priority for a system ──
    if (action === 'prioritize') {
      const { system_id } = body;
      const repairs = await base44.asServiceRole.entities.RepairPacket.filter({
        system_id, status: 'pending',
      }).catch(() => []);

      const prioritized = repairs.map((r: any) => {
        const severityWeight = { p0: 1000, p1: 100, p2: 10, p3: 1 };
        const weight = severityWeight[r.priority] || 10;
        return { ...r, priority_weight: weight };
      }).sort((a: any, b: any) => b.priority_weight - a.priority_weight);

      return Response.json({
        action: 'prioritize',
        system_id,
        prioritized_repairs: prioritized.map((r: any) => ({
          repair_id: r.repair_id,
          finding: r.finding,
          priority: r.priority,
          weight: r.priority_weight,
        })),
      });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
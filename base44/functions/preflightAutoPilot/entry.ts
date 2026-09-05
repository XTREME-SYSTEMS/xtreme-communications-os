import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Autonomous self-healing autopilot — the closed-loop engine that drives the system to 100%.
// Sweeps all sub-100% capabilities, diagnoses the top-N critical gaps via LLM, queues targeted
// build tasks for AutoBuilder, and returns a scored report with the projected score after fixes.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const maxGaps = Math.min(body.max_gaps || 5, 10);

    const caps = await base44.asServiceRole.entities.Capability.list("-created_date", 300);
    const tests = await base44.asServiceRole.entities.TestResult.list("-created_date", 200);

    const liveCount = caps.filter((c) => c.status === "LIVE" || c.status === "PROVIDER-BACKED").length;
    const coverageScore = caps.length ? Math.round(caps.reduce((s, c) => s + (c.coverage_pct ?? 0), 0) / caps.length) : 0;
    const mandatory = tests.filter((t) => t.mandatory !== false);
    const testScore = mandatory.length ? Math.round(mandatory.filter((t) => t.status === "pass").length / mandatory.length * 100) : 0;
    const parityPct = caps.length ? Math.round(liveCount / caps.length * 100) : 0;
    const currentScore = Math.max(0, Math.round(coverageScore * 0.5 + testScore * 0.4 + parityPct * 0.1));

    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const gaps = caps
      .filter((c) => (c.status !== "LIVE" && c.status !== "PROVIDER-BACKED") || (c.coverage_pct ?? 0) < 100)
      .sort((a, b) => ((a.coverage_pct ?? 0) - (b.coverage_pct ?? 0)) || ((priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)))
      .slice(0, maxGaps);

    const diagnoses = await Promise.all(gaps.map(async (cap) => {
      try {
        const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are the autonomous healer for XTREME COMMUNICATIONS, a Twilio clone. CAPABILITY: ${cap.name}. CATEGORY: ${cap.category || ""}. STATUS: ${cap.status}. COVERAGE: ${cap.coverage_pct ?? 0}%. TWILIO BENCHMARK: LIVE 100%. Diagnose the gap vs Twilio and return JSON. fix_prompt must be a complete, copy-pasteable prompt that fixes AND hardens this capability to 100% parity.`,
          response_json_schema: {
            type: "object",
            properties: {
              diagnosis: { type: "string" },
              gap_severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
              fix_prompt: { type: "string" },
              projected_score: { type: "number" },
            },
            required: ["diagnosis", "fix_prompt", "projected_score"],
          },
        });
        return { cap, ...res };
      } catch (e) {
        return { cap, error: String(e.message || e), projected_score: cap.coverage_pct ?? 0 };
      }
    }));

    const tasks = diagnoses.filter((d) => d.fix_prompt).map((d) => ({
      title: `Heal: ${d.cap.name}`,
      capability: d.cap.name,
      status: "queued",
      priority: d.gap_severity === "critical" ? "critical" : "high",
      assigned_engine: "AutoBuilder",
      notes: d.fix_prompt.slice(0, 500),
    }));
    if (tasks.length) await base44.asServiceRole.entities.BuildQueueTask.bulkCreate(tasks);

    const projectedMap = new Map(diagnoses.map((d) => [d.cap.id, d.projected_score ?? 100]));
    const projectedCaps = caps.map((c) => projectedMap.has(c.id)
      ? { ...c, coverage_pct: projectedMap.get(c.id), status: "LIVE" } : c);
    const projCoverage = projectedCaps.length ? Math.round(projectedCaps.reduce((s, c) => s + (c.coverage_pct ?? 0), 0) / projectedCaps.length) : 0;
    const projLive = projectedCaps.filter((c) => c.status === "LIVE" || c.status === "PROVIDER-BACKED").length;
    const projParity = projectedCaps.length ? Math.round(projLive / projectedCaps.length * 100) : 0;
    const projectedScore = Math.max(0, Math.round(projCoverage * 0.5 + testScore * 0.4 + projParity * 0.1));

    return Response.json({
      current_score: currentScore,
      projected_score: projectedScore,
      total_capabilities: caps.length,
      gaps_found: gaps.length,
      tasks_queued: tasks.length,
      diagnoses: diagnoses.map((d) => ({
        capability: d.cap.name, severity: d.gap_severity, projected: d.projected_score,
        diagnosis: (d.diagnosis || "").slice(0, 200),
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
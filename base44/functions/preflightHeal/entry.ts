import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Autonomous intelligent prompt creator for the Preflight system.
// Attached to every pipeline stage (discover → audit → test → score → fix → heal → harden → validate → launch).
// For a given capability + action, diagnoses the gap against the Twilio benchmark and generates
// a targeted, copy-pasteable prompt that identifies the problem and fixes AND hardens it at every level.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const action = body.action || "heal";
    const capability = body.capability_name || body.capability || "SYSTEM-WIDE";
    const category = body.category || "all";
    const currentStatus = body.current_status || "NOT-YET-IMPLEMENTED";
    const coverage = body.coverage_pct ?? 0;
    const twilioBenchmark = body.twilio_benchmark || "LIVE · 100%";
    const evidence = body.evidence || "";

    const STAGES = {
      discover: "DISCOVER stage: enumerate and fully specify this capability — every dependent system, process, entity, endpoint, and data flow end-to-end. Produce a complete inventory.",
      audit: "AUDIT stage: compare this capability against the Twilio benchmark. Identify every gap, missing test, parity delta, and vulnerability class.",
      test: "TEST stage: define the exact verifiable tests (unit, integration, e2e, visual, auditory) that prove this capability works end-to-end and produces verifiable results.",
      score: "SCORE stage: rate this capability 0-100 against Twilio and justify the score with concrete evidence.",
      fix: "FIX stage: generate a specific, actionable prompt that identifies the problem and implements the fix to reach LIVE parity with Twilio.",
      heal: "HEAL stage: generate a prompt that diagnoses the root cause and restores full functionality.",
      harden: "HARDEN stage: generate a prompt that hardens this capability against failure, edge cases, security gaps, and abuse.",
      validate: "VALIDATE stage: generate a prompt that runs a triple-pass 100% verification sweep and confirms production readiness.",
      launch: "LAUNCH stage: generate a final go/no-go launch prompt confirming 100% parity and production cutover.",
    };
    const directive = STAGES[action] || STAGES.heal;

    const prompt = `You are the autonomous intelligent prompt creator for XTREME COMMUNICATIONS, a multi-tenant CaaS platform benchmarked end-to-end against Twilio.

CAPABILITY: ${capability}
CATEGORY: ${category}
CURRENT STATUS: ${currentStatus}
COVERAGE: ${coverage}%
TWILIO BENCHMARK: ${twilioBenchmark}
EVIDENCE: ${evidence || "none provided"}

${directive}

Return JSON with:
- diagnosis: root-cause gap analysis vs Twilio (2-3 sentences)
- gap_severity: critical | high | medium | low
- fix_prompt: a complete, copy-pasteable prompt that identifies the problem AND fixes AND hardens this capability at every level. Specific, actionable, self-contained.
- fix_steps: array of 3-6 concrete ordered steps to reach 100% parity
- hardening: array of 2-4 hardening measures (security, resilience, edge cases)
- verification: the exact verifiable test that proves it works (visual or auditory where possible)
- projected_score: the coverage_pct this capability will reach after the fix (0-100)`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          diagnosis: { type: "string" },
          gap_severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          fix_prompt: { type: "string" },
          fix_steps: { type: "array", items: { type: "string" } },
          hardening: { type: "array", items: { type: "string" } },
          verification: { type: "string" },
          projected_score: { type: "number" },
        },
        required: ["diagnosis", "fix_prompt", "fix_steps", "projected_score"],
      },
    });

    return Response.json({ action, capability, stage: action, current_status: currentStatus, ...res });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
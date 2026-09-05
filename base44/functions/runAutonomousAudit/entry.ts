import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const capabilities = Array.isArray(body.capabilities) && body.capabilities.length
      ? body.capabilities
      : await base44.asServiceRole.entities.Capability.list("-created_date", 200);

    const summary = capabilities.map(c => `- ${c.name} [${c.category || "uncategorized"}]: ${c.status} (${c.coverage_pct || 0}% coverage)`).join("\n");

    const prompt = `You are the Vision Cortex of XTREME Communications OS, a platform targeting Twilio capability parity.
You are performing an autonomous forensic audit of the current capability registry.
Classify honestly: never mark a capability LIVE unless it is genuinely production-ready with provider backing.

CURRENT CAPABILITY REGISTRY:
${summary}

Produce a JSON audit result with:
- parity_assessment: one-paragraph honest assessment of overall Twilio parity status.
- findings: array of {severity (critical|high|medium|low|info), area, finding, recommendation} for gaps, risks, and missing capabilities.
- tasks: array of {title, capability, priority (critical|high|medium|low), assigned_engine (Vision Cortex|AutoBuilder|Faultline|Cloud Browser|Shadow), notes} — the highest-value build queue tasks to close gaps.
- next_actions: array of short next-action strings in execution order.

Be specific and actionable. Prioritize real telecom capabilities (SMS, voice, WhatsApp, phone numbers, verify) and cross-cutting systems (RLS, webhooks, provider abstraction). Limit findings to 6 and tasks to 6.`;

    const schema = {
      type: "object",
      properties: {
        parity_assessment: { type: "string" },
        findings: { type: "array", items: { type: "object", properties: {
          severity: { type: "string" }, area: { type: "string" }, finding: { type: "string" }, recommendation: { type: "string" },
        }, required: ["area", "finding"] } },
        tasks: { type: "array", items: { type: "object", properties: {
          title: { type: "string" }, capability: { type: "string" }, priority: { type: "string" }, assigned_engine: { type: "string" }, notes: { type: "string" },
        }, required: ["title"] } },
        next_actions: { type: "array", items: { type: "string" } },
      },
      required: ["parity_assessment", "findings", "tasks", "next_actions"],
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      model: "automatic",
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
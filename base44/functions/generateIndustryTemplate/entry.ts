import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Intelligent industry template generator — researches an industry (live web context) and
// produces a complete, production-grade conversation/template set for the requested channel.
// Persists every generated template as a PromptLibrary record and returns the set.
// Real Estate is the primary industry; any of the top 20 industries can be requested.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const industry = body.industry || "Real Estate";
    const channel = body.channel || "voice";
    const context = body.context || "";

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the industry intelligence engine for XTREME COMMUNICATIONS, an ultra-humanistic AI communications assistant (Twilio-class, enterprise grade). Generate a COMPLETE, production-grade ${channel} template set for the ${industry} industry. ${context ? "Context: " + context : ""} Research current best practices, common objections, qualification criteria, compliance rules (TCPA for US calling/SMS, opt-out handling), and closing techniques for this industry. Return JSON with: greeting, qualification_questions (array), objection_handling (array of {objection, response}), value_proposition, follow_up, closing, compliance_note. Every template must sound natural and human — contractions, empathy, conversational rhythm — never robotic.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          greeting: { type: "string" },
          qualification_questions: { type: "array", items: { type: "string" } },
          objection_handling: {
            type: "array",
            items: {
              type: "object",
              properties: { objection: { type: "string" }, response: { type: "string" } }
            }
          },
          value_proposition: { type: "string" },
          follow_up: { type: "string" },
          closing: { type: "string" },
          compliance_note: { type: "string" }
        },
        required: ["greeting", "qualification_questions", "objection_handling", "value_proposition", "follow_up", "closing"]
      }
    });

    const records = [
      { title: `${industry} ${channel} Greeting`, domain: "conversation_flow", channel, industry, body: res.greeting || "", variables: ["lead_name"], quality_score: 100 },
      { title: `${industry} ${channel} Qualification`, domain: "qualification", channel, industry, body: (res.qualification_questions || []).join("\n"), quality_score: 100 },
      { title: `${industry} ${channel} Objection Handling`, domain: "objection_handling", channel, industry, body: JSON.stringify(res.objection_handling || []), quality_score: 100 },
      { title: `${industry} ${channel} Value Proposition`, domain: "conversation_flow", channel, industry, body: res.value_proposition || "", quality_score: 100 },
      { title: `${industry} ${channel} Follow-Up`, domain: "follow_up", channel, industry, body: res.follow_up || "", quality_score: 100 },
      { title: `${industry} ${channel} Closing`, domain: "closing", channel, industry, body: res.closing || "", quality_score: 100 }
    ];
    if (res.compliance_note) records.push({ title: `${industry} ${channel} Compliance`, domain: "compliance", channel, industry, body: res.compliance_note, quality_score: 100 });

    const created = await base44.asServiceRole.entities.PromptLibrary.bulkCreate(records);

    return Response.json({
      industry,
      channel,
      templates_generated: created.length,
      templates: res,
      ids: created.map((c) => c.id)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
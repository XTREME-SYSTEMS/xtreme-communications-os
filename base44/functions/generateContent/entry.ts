import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Wraps Core.InvokeLLM so the client can generate content (agent prompts, templates,
// WhatsApp messages, etc.) without a direct Core integration call (blocked from runtime).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const prompt = body.prompt;
    if (!prompt) return Response.json({ error: "Prompt required" }, { status: 400 });

    const useWebContext = body.add_context_from_internet || false;
    const params = {
      prompt,
      ...(useWebContext ? { add_context_from_internet: true, model: "gemini_3_flash" } : {}),
      ...(body.response_json_schema ? { response_json_schema: body.response_json_schema } : {}),
    };

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM(params);
    return Response.json({ output: res });
  } catch (error) {
    console.error("generateContent error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
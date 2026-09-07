import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Wraps Core.GenerateSpeech so the client can preview voices without a direct
// Core integration call (which is blocked from app runtime).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const text = body.text || "Hi! I'm your AI assistant. I'm here to help you with whatever you need. How can I assist you today?";
    const voice = body.voice || "river";
    const languageCode = body.language_code || undefined;

    const res = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text: text.slice(0, 5000),
      voice,
      ...(languageCode ? { language_code: languageCode } : {}),
    });

    return Response.json({ url: res.url });
  } catch (error) {
    console.error("previewVoice error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
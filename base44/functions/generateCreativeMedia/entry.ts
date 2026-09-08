import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, prompt } = body;

    if (!prompt) return Response.json({ error: 'Prompt required' }, { status: 400 });

    if (type === 'image') {
      const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
      return Response.json({ url: result.url });
    }

    if (type === 'video') {
      const result = await base44.asServiceRole.integrations.Core.GenerateVideo({ prompt, duration: 6, generate_audio: false });
      return Response.json({ url: result.url });
    }

    return Response.json({ error: 'Unknown media type' }, { status: 400 });
  } catch (error) {
    console.error('generateCreativeMedia error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { synthesizeToPublicUrl } from '../../shared/voiceSynthesis.ts';

// Premium voice preview — authenticated app users only.
// Returns a public audio URL the browser can play immediately.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || '').slice(0, 500);
    if (!text.trim()) return Response.json({ error: 'text is required' }, { status: 400 });

    const result = await synthesizeToPublicUrl(base44, {
      text,
      provider: body.provider,
      voice_id: body.voice_id,
    });

    if (result.error) {
      console.error('voiceSynthesize provider error:', result.provider, result.error);
      return Response.json({ error: result.error, provider: result.provider }, { status: 502 });
    }

    return Response.json({
      url: result.url,
      provider: result.provider,
      voice_id: result.voice_id,
      characters: result.characters,
    });
  } catch (error) {
    console.error('voiceSynthesize error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
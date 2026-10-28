// ── Voice Synthesis → public audio URL ───────────────────────────────
// One shared path used by both the live call flow (twilioVoiceWebhook) and
// the in-app preview (voiceSynthesize). Generates premium audio through
// voiceProviders, then stores it publicly so Twilio <Play> / <audio> can fetch it.

import { generateVoice } from './voiceProviders.ts';

export interface SynthesisResult {
  url?: string;
  provider?: string;
  voice_id?: string;
  characters?: number;
  error?: string;
}

export async function synthesizeToPublicUrl(
  base44: any,
  params: { text: string; provider?: string; voice_id?: string; speed?: number }
): Promise<SynthesisResult> {
  const text = (params.text || '').trim();
  if (!text) return { error: 'Nothing to synthesize' };

  const result = await generateVoice({
    text,
    provider: params.provider,
    voice_id: params.voice_id,
    speed: params.speed,
  });

  if (result.error) {
    return { provider: result.provider, voice_id: result.voice_id, error: result.error };
  }
  if (result.audio_url) {
    return {
      url: result.audio_url,
      provider: result.provider,
      voice_id: result.voice_id,
      characters: result.characters,
    };
  }
  if (!result.audio_base64) {
    return { provider: result.provider, error: 'Provider returned no audio' };
  }

  const bytes = Uint8Array.from(atob(result.audio_base64), (c: string) => c.charCodeAt(0));
  const file = new File([bytes], `voice-${Date.now()}.mp3`, { type: 'audio/mpeg' });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });

  if (!uploaded?.file_url) return { provider: result.provider, error: 'Audio upload failed' };

  return {
    url: uploaded.file_url,
    provider: result.provider,
    voice_id: result.voice_id,
    characters: result.characters,
  };
}
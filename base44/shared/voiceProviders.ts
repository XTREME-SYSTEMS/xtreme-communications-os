// ── Multi-Provider AI Voice Abstraction ───────────────────────────
// Reverse-engineered from DeepClone Factory + FaultLine patterns:
//   - Shared capability module (like cloudbrowserCapabilities.ts)
//   - Provider registry with fallback (like cloneParity.ts)
//   - Capability validation map (like backendCapabilityValidationMap.ts)
//
// Benchmarked against top AI voice systems (2026):
//   1. ElevenLabs   — $50-100/1M chars, ~75ms TTFA, broadest voice marketplace
//   2. Inworld TTS-2 — $25/1M, <100ms P99, 200+ languages
//   3. Cartesia Sonic — $37-50/1M, sub-90ms TTFA, instant cloning
//   4. OpenAI TTS    — ~$19/1M, preset voices, no cloning
//   5. Deepgram Aura-2 — $30/1M, STT-first pipeline
//   6. Hume Octave   — $70/mo, emotion-forward
//   7. Google Gemini TTS — ~$19/1M, GCP stack
//   8. Amazon Polly  — pay-per-use, 60+ voices, Twilio-native
//
// Architecture: provider-agnostic generate() with automatic fallback.
// Each provider is a capability adapter — add new ones by extending PROVIDERS.

import { secrets } from 'base44:runtime';

export interface VoiceProvider {
  id: string;
  name: string;
  tier: 'premium' | 'standard' | 'basic';
  latency_ms: number;       // vendor-claimed TTFA
  price_per_1m: number;     // USD per 1M characters
  supports_cloning: boolean;
  supports_streaming: boolean;
  languages: number;
  female_voices: string[];
  male_voices: string[];
  configured: () => boolean;
  generate: (params: VoiceGenParams) => Promise<VoiceGenResult>;
}

export interface VoiceGenParams {
  text: string;
  voice_id?: string;       // provider-specific voice ID
  provider?: string;       // provider id; omit for auto-select
  speed?: number;          // 0.5 - 2.0
  stability?: number;      // 0-1 ( ElevenLabs / Hume )
  emotion?: string;        // Hume / Inworld
  language_code?: string;  // ISO-639-1
}

export interface VoiceGenResult {
  provider: string;
  voice_id: string;
  audio_url?: string;       // public URL to audio file
  audio_base64?: string;    // base64-encoded audio
  duration_sec?: number;
  characters: number;
  cost_estimate_usd: number;
  error?: string;
}

// ── Provider: Amazon Polly (Twilio-native, always available) ──
const Polly: VoiceProvider = {
  id: 'polly',
  name: 'Amazon Polly',
  tier: 'standard',
  latency_ms: 150,
  price_per_1m: 16,
  supports_cloning: false,
  supports_streaming: true,
  languages: 60,
  female_voices: ['Kendra', 'Joanna', 'Salli', 'Kimberly', 'Amy', 'Emma', 'Nicole', 'Olivia', 'Ruth', 'Stephen'],
  male_voices: ['Matthew', 'Brian', 'Justin', 'Joey', 'Arthur', 'Daniel', 'Gregory', 'Kevin'],
  configured: () => true,  // Polly is used via Twilio <Say>, no direct API key needed
  generate: async (params) => {
    // Polly via Twilio <Say> doesn't return audio — it's rendered inline in TwiML.
    // For standalone audio generation, would need AWS credentials.
    return {
      provider: 'polly',
      voice_id: params.voice_id || 'Kendra',
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 16,
      error: 'Polly generates audio via Twilio <Say> in-call. Use generate_tts for standalone audio.',
    };
  },
};

// ── Provider: ElevenLabs (premium, voice cloning) ──
const ElevenLabs: VoiceProvider = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  tier: 'premium',
  latency_ms: 75,
  price_per_1m: 50,
  supports_cloning: true,
  supports_streaming: true,
  languages: 70,
  female_voices: ['Rachel', 'Domi', 'Bella', 'Antoni', 'Sarah', 'Charlotte', 'Matilda', 'Lily'],
  male_voices: ['Adam', 'George', 'Callum', 'Charlie', 'Harry', 'Jeremy', 'Michael', 'Thomas'],
  configured: () => !!secrets.get('ELEVENLABS_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('ELEVENLABS_API_KEY');
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');
    const voiceId = params.voice_id || '21m00Tcm4TlvDq8ikWAM'; // Rachel
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: params.text.slice(0, 5000),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: params.stability ?? 0.5,
          similarity_boost: 0.75,
          speed: params.speed ?? 1.0,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'elevenlabs', voice_id: voiceId, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'elevenlabs',
      voice_id: voiceId,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 50,
    };
  },
};

// ── Provider: OpenAI TTS (preset voices, no cloning) ──
const OpenAITTS: VoiceProvider = {
  id: 'openai',
  name: 'OpenAI TTS',
  tier: 'premium',
  latency_ms: 500,
  price_per_1m: 19,
  supports_cloning: false,
  supports_streaming: true,
  languages: 50,
  female_voices: ['nova', 'shimmer', 'alloy'],
  male_voices: ['echo', 'fable', 'onyx'],
  configured: () => !!secrets.get('OPENAI_TTS_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('OPENAI_TTS_API_KEY');
    if (!apiKey) throw new Error('OPENAI_TTS_API_KEY not configured');
    const voice = params.voice_id || 'nova';
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: voice,
        input: params.text.slice(0, 4096),
        speed: params.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'openai', voice_id: voice, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'openai',
      voice_id: voice,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 19,
    };
  },
};

// ── Provider: Cartesia Sonic (lowest latency, instant cloning) ──
const Cartesia: VoiceProvider = {
  id: 'cartesia',
  name: 'Cartesia Sonic',
  tier: 'premium',
  latency_ms: 90,
  price_per_1m: 40,
  supports_cloning: true,
  supports_streaming: true,
  languages: 40,
  female_voices: ['Lily', 'Hannah', 'Sarah', 'Mia'],
  male_voices: ['Daniel', 'Marcus', 'Tom', 'Jack'],
  configured: () => !!secrets.get('CARTESIA_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('CARTESIA_API_KEY');
    if (!apiKey) throw new Error('CARTESIA_API_KEY not configured');
    const voiceId = params.voice_id || '79e4e4e4-4e4e-4e4e-4e4e-4e4e4e4e4e4e';
    const res = await fetch('https://api.cartesia.ai/tts', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        model_id: 'sonic-3.5',
        transcript: params.text.slice(0, 5000),
        voice: { id: voiceId },
        speed: params.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'cartesia', voice_id: voiceId, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'cartesia',
      voice_id: voiceId,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 40,
    };
  },
};

// ── Provider: Deepgram Aura-2 (STT-first pipeline) ──
const Deepgram: VoiceProvider = {
  id: 'deepgram',
  name: 'Deepgram Aura-2',
  tier: 'standard',
  latency_ms: 200,
  price_per_1m: 30,
  supports_cloning: false,
  supports_streaming: true,
  languages: 30,
  female_voices: ['Asteria', 'Luna', 'Aura-2-Asteria'],
  male_voices: ['Orion', 'Atlas', 'Arcas'],
  configured: () => !!secrets.get('DEEPGRAM_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('DEEPGRAM_API_KEY');
    if (!apiKey) throw new Error('DEEPGRAM_API_KEY not configured');
    const voice = params.voice_id || 'aura-2-asteria-en';
    const res = await fetch('https://api.deepgram.com/v1/speak', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: voice,
        text: params.text.slice(0, 5000),
        speed: params.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'deepgram', voice_id: voice, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'deepgram',
      voice_id: voice,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 30,
    };
  },
};

// ── Provider Registry ──
export const PROVIDERS: Record<string, VoiceProvider> = {
  polly: Polly,
  elevenlabs: ElevenLabs,
  openai: OpenAITTS,
  cartesia: Cartesia,
  deepgram: Deepgram,
};

// ── Auto-select best available provider ──
export function selectProvider(preferred?: string): VoiceProvider {
  if (preferred && PROVIDERS[preferred]?.configured()) {
    return PROVIDERS[preferred];
  }
  // Fallback chain: premium → standard → basic
  const chain = ['elevenlabs', 'cartesia', 'openai', 'deepgram', 'polly'];
  for (const id of chain) {
    if (PROVIDERS[id].configured()) return PROVIDERS[id];
  }
  return Polly; // always available (Twilio-native)
}

// ── Generate with automatic fallback ──
export async function generateVoice(params: VoiceGenParams): Promise<VoiceGenResult> {
  const provider = selectProvider(params.provider);
  try {
    const result = await provider.generate(params);
    if (!result.error) return result;
    // Fallback to next provider
    const fallback = selectProvider(provider.id === 'polly' ? 'polly' : undefined);
    if (fallback.id !== provider.id) {
      const fallbackResult = await fallback.generate(params);
      if (!fallbackResult.error) return fallbackResult;
    }
    return result;
  } catch (err) {
    // Fallback on exception
    const fallback = selectProvider(provider.id === 'polly' ? 'polly' : undefined);
    if (fallback.id !== provider.id) {
      return fallback.generate(params);
    }
    return {
      provider: provider.id,
      voice_id: params.voice_id || '',
      characters: params.text.length,
      cost_estimate_usd: 0,
      error: err.message,
    };
  }
}

// ── Get provider status for UI ──
export function getProviderStatus() {
  return Object.values(PROVIDERS).map(p => ({
    id: p.id,
    name: p.name,
    tier: p.tier,
    latency_ms: p.latency_ms,
    price_per_1m: p.price_per_1m,
    supports_cloning: p.supports_cloning,
    languages: p.languages,
    configured: p.configured(),
    female_voices: p.female_voices,
    male_voices: p.male_voices,
  }));
}

// ── Get best Twilio Polly voice for a gender preference ──
export function getPollyVoice(gender: 'female' | 'male' = 'female', tone: 'professional' | 'warm' | 'energetic' = 'professional'): string {
  const femaleMap = {
    professional: 'Polly.Kendra',    // professional, authoritative
    warm: 'Polly.Joanna',           // warm, conversational
    energetic: 'Polly.Ivy',         // bright, energetic
  };
  const maleMap = {
    professional: 'Polly.Matthew',   // professional, clear
    warm: 'Polly.Joey',             // warm, friendly
    energetic: 'Polly.Justin',      // young, energetic
  };
  return gender === 'female' ? femaleMap[tone] : maleMap[tone];
}
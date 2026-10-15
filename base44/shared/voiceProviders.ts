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
//   9. Azure TTS     — $16/1M, 400+ neural voices, enterprise
//  10. Inworld TTS-2 — $25/1M, realtime gaming/agent
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
  female_voices: VoiceEntry[];
  male_voices: VoiceEntry[];
  configured: () => boolean;
  generate: (params: VoiceGenParams) => Promise<VoiceGenResult>;
}

export interface VoiceEntry {
  id: string;
  name: string;
  accent: string;
  tone: string;
  language: string;
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

// ── MASSIVE FEMALE VOICE CATALOG ──────────────────────────────────

// Amazon Polly — 30+ female voices across languages
const POLLY_FEMALE: VoiceEntry[] = [
  { id: 'Kendra', name: 'Kendra', accent: 'US English', tone: 'Professional, authoritative', language: 'en-US' },
  { id: 'Joanna', name: 'Joanna', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  { id: 'Salli', name: 'Salli', accent: 'US English', tone: 'Friendly, approachable', language: 'en-US' },
  { id: 'Kimberly', name: 'Kimberly', accent: 'US English', tone: 'Mature, confident', language: 'en-US' },
  { id: 'Ivy', name: 'Ivy', accent: 'US English', tone: 'Young, energetic', language: 'en-US' },
  { id: 'Ruth', name: 'Ruth', accent: 'US English', tone: 'Deep, authoritative', language: 'en-US' },
  { id: 'Stephen', name: 'Stephen', accent: 'US English', tone: 'Calm, neutral', language: 'en-US' },
  { id: 'Aria', name: 'Aria', accent: 'US English', tone: 'Warm, expressive', language: 'en-US' },
  { id: 'Nika', name: 'Nika', accent: 'US English', tone: 'Bright, youthful', language: 'en-US' },
  { id: 'Danielle', name: 'Danielle', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
  { id: 'Camila', name: 'Camila', accent: 'US Spanish', tone: 'Warm, natural', language: 'es-US' },
  { id: 'Lupe', name: 'Lupe', accent: 'US Spanish', tone: 'Friendly, energetic', language: 'es-US' },
  { id: 'Mia', name: 'Mia', accent: 'Mexican Spanish', tone: 'Warm, conversational', language: 'es-MX' },
  { id: 'Lucia', name: 'Lucia', accent: 'Castilian Spanish', tone: 'Elegant, refined', language: 'es-ES' },
  { id: 'Bianca', name: 'Bianca', accent: 'Italian', tone: 'Warm, melodic', language: 'it-IT' },
  { id: 'Carla', name: 'Carla', accent: 'Italian', tone: 'Professional, clear', language: 'it-IT' },
  { id: 'Amy', name: 'Amy', accent: 'British English', tone: 'Refined, professional', language: 'en-GB' },
  { id: 'Emma', name: 'Emma', accent: 'British English', tone: 'Warm, friendly', language: 'en-GB' },
  { id: 'Ada', name: 'Ada', accent: 'British English', tone: 'Calm, measured', language: 'en-GB' },
  { id: 'Nicole', name: 'Nicole', accent: 'Australian English', tone: 'Natural, friendly', language: 'en-AU' },
  { id: 'Olivia', name: 'Olivia', accent: 'Australian English', tone: 'Warm, approachable', language: 'en-AU' },
  { id: 'Gwyneth', name: 'Gwyneth', accent: 'Welsh English', tone: 'Soft, melodic', language: 'cy-GB' },
  { id: 'Zhiyu', name: 'Zhiyu', accent: 'Mandarin Chinese', tone: 'Warm, natural', language: 'cmn-CN' },
  { id: 'Seoyeon', name: 'Seoyeon', accent: 'Korean', tone: 'Bright, friendly', language: 'ko-KR' },
  { id: 'Kazuha', name: 'Kazuha', accent: 'Japanese', tone: 'Calm, professional', language: 'ja-JP' },
  { id: 'Suvi', name: 'Suvi', accent: 'Finnish', tone: 'Warm, clear', language: 'fi-FI' },
  { id: 'Vicki', name: 'Vicki', accent: 'German', tone: 'Professional, precise', language: 'de-DE' },
  { id: 'Marlene', name: 'Marlene', accent: 'German', tone: 'Mature, authoritative', language: 'de-DE' },
  { id: 'Vicki-FR', name: 'Vicki (FR)', accent: 'French', tone: 'Elegant, warm', language: 'fr-FR' },
  { id: 'Lea', name: 'Léa', accent: 'French', tone: 'Young, energetic', language: 'fr-FR' },
  { id: 'Celine', name: 'Céline', accent: 'French', tone: 'Professional, refined', language: 'fr-FR' },
  { id: 'Ingrid', name: 'Ingrid', accent: 'Norwegian', tone: 'Warm, natural', language: 'nb-NO' },
  { id: 'Ewa', name: 'Ewa', accent: 'Polish', tone: 'Professional, clear', language: 'pl-PL' },
  { id: 'Mizuki', name: 'Mizuki', accent: 'Japanese', tone: 'Warm, youthful', language: 'ja-JP' },
  { id: 'Tatyana', name: 'Tatyana', accent: 'Russian', tone: 'Professional, measured', language: 'ru-RU' },
  { id: 'Hala', name: 'Hala', name_alt: 'Hala', accent: 'Arabic', tone: 'Warm, professional', language: 'ar' } as any,
];

// ElevenLabs — 30+ female voices from the marketplace
const ELEVENLABS_FEMALE: VoiceEntry[] = [
  { id: 'Rachel', name: 'Rachel', accent: 'American', tone: 'Calm, narrative', language: 'en' },
  { id: 'Domi', name: 'Domi', accent: 'American', tone: 'Strong, warm', language: 'en' },
  { id: 'Bella', name: 'Bella', accent: 'American', tone: 'Soft, friendly', language: 'en' },
  { id: 'Sarah', name: 'Sarah', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  { id: 'Charlotte', name: 'Charlotte', accent: 'Swedish', tone: 'Bright, youthful', language: 'en' },
  { id: 'Matilda', name: 'Matilda', accent: 'American', tone: 'Friendly, warm', language: 'en' },
  { id: 'Lily', name: 'Lily', accent: 'British', tone: 'Warm, professional', language: 'en' },
  { id: 'Elli', name: 'Elli', accent: 'American', tone: 'Emotional, expressive', language: 'en' },
  { id: 'Freya', name: 'Freya', accent: 'British', tone: 'Calm, authoritative', language: 'en' },
  { id: 'Grace', name: 'Grace', accent: 'American', tone: 'Warm, nurturing', language: 'en' },
  { id: 'Hannah', name: 'Hannah', accent: 'American', tone: 'Professional, clear', language: 'en' },
  { id: 'Isabella', name: 'Isabella', accent: 'Italian-American', tone: 'Warm, expressive', language: 'en' },
  { id: 'Jessica', name: 'Jessica', accent: 'American', tone: 'Confident, professional', language: 'en' },
  { id: 'Karen', name: 'Karen', accent: 'American', tone: 'Mature, authoritative', language: 'en' },
  { id: 'Laura', name: 'Laura', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  { id: 'Mia', name: 'Mia', accent: 'American', tone: 'Young, energetic', language: 'en' },
  { id: 'Nina', name: 'Nina', accent: 'American', tone: 'Soft, intimate', language: 'en' },
  { id: 'Olivia', name: 'Olivia', accent: 'British', tone: 'Refined, elegant', language: 'en' },
  { id: 'Penelope', name: 'Penelope', accent: 'Spanish', tone: 'Warm, melodic', language: 'en' },
  { id: 'Quinn', name: 'Quinn', accent: 'American', tone: 'Confident, sharp', language: 'en' },
  { id: 'Ruby', name: 'Ruby', accent: 'American', tone: 'Warm, storytelling', language: 'en' },
  { id: 'Sophia', name: 'Sophia', accent: 'American', tone: 'Professional, clear', language: 'en' },
  { id: 'Tara', name: 'Tara', accent: 'Irish', tone: 'Warm, friendly', language: 'en' },
  { id: 'Uma', name: 'Uma', accent: 'Indian', tone: 'Professional, calm', language: 'en' },
  { id: 'Victoria', name: 'Victoria', accent: 'British', tone: 'Authoritative, refined', language: 'en' },
  { id: 'Willow', name: 'Willow', accent: 'American', tone: 'Soft, gentle', language: 'en' },
  { id: 'Xena', name: 'Xena', accent: 'American', tone: 'Strong, confident', language: 'en' },
  { id: 'Yara', name: 'Yara', accent: 'Middle Eastern', tone: 'Warm, professional', language: 'en' },
  { id: 'Zara', name: 'Zara', accent: 'British', tone: 'Calm, measured', language: 'en' },
  { id: 'Aria', name: 'Aria', accent: 'American', tone: 'Bright, youthful', language: 'en' },
  { id: 'Diana', name: 'Diana', accent: 'American', tone: 'Professional, warm', language: 'en' },
  { id: 'Elena', name: 'Elena', accent: 'Spanish', tone: 'Warm, expressive', language: 'en' },
];

// OpenAI TTS — preset voices
const OPENAI_FEMALE: VoiceEntry[] = [
  { id: 'nova', name: 'Nova', accent: 'American', tone: 'Warm, natural', language: 'en' },
  { id: 'shimmer', name: 'Shimmer', accent: 'American', tone: 'Bright, clear', language: 'en' },
  { id: 'alloy', name: 'Alloy', accent: 'Neutral', tone: 'Balanced, versatile', language: 'en' },
  { id: 'sage', name: 'Sage', accent: 'American', tone: 'Calm, measured', language: 'en' },
  { id: 'coral', name: 'Coral', accent: 'American', tone: 'Warm, friendly', language: 'en' },
  { id: 'ash', name: 'Ash', accent: 'American', tone: 'Soft, gentle', language: 'en' },
];

// Cartesia Sonic — female voices
const CARTESIA_FEMALE: VoiceEntry[] = [
  { id: 'Lily', name: 'Lily', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  { id: 'Hannah', name: 'Hannah', accent: 'American', tone: 'Professional, clear', language: 'en' },
  { id: 'Sarah', name: 'Sarah', accent: 'American', tone: 'Calm, measured', language: 'en' },
  { id: 'Mia', name: 'Mia', accent: 'American', tone: 'Young, energetic', language: 'en' },
  { id: 'Aria', name: 'Aria', accent: 'American', tone: 'Bright, expressive', language: 'en' },
  { id: 'Emma', name: 'Emma', accent: 'British', tone: 'Warm, refined', language: 'en' },
  { id: 'Charlotte', name: 'Charlotte', accent: 'American', tone: 'Professional, confident', language: 'en' },
  { id: 'Sophia', name: 'Sophia', accent: 'American', tone: 'Warm, nurturing', language: 'en' },
  { id: 'Isabella', name: 'Isabella', accent: 'American', tone: 'Expressive, warm', language: 'en' },
  { id: 'Amelia', name: 'Amelia', accent: 'British', tone: 'Elegant, clear', language: 'en' },
  { id: 'Olivia', name: 'Olivia', accent: 'American', tone: 'Calm, professional', language: 'en' },
  { id: 'Ava', name: 'Ava', accent: 'American', tone: 'Bright, friendly', language: 'en' },
  { id: 'Zoe', name: 'Zoe', accent: 'American', tone: 'Energetic, youthful', language: 'en' },
  { id: 'Luna', name: 'Luna', accent: 'American', tone: 'Soft, dreamy', language: 'en' },
  { id: 'Maya', name: 'Maya', accent: 'American', tone: 'Warm, natural', language: 'en' },
];

// Deepgram Aura-2 — female voices
const DEEPGRAM_FEMALE: VoiceEntry[] = [
  { id: 'aura-2-asteria-en', name: 'Asteria', accent: 'American', tone: 'Warm, professional', language: 'en' },
  { id: 'aura-2-luna-en', name: 'Luna', accent: 'American', tone: 'Calm, measured', language: 'en' },
  { id: 'aura-2-stella-en', name: 'Stella', accent: 'American', tone: 'Bright, energetic', language: 'en' },
  { id: 'aura-2-athena-en', name: 'Athena', accent: 'American', tone: 'Authoritative, clear', language: 'en' },
  { id: 'aura-2-hera-en', name: 'Hera', accent: 'American', tone: 'Professional, warm', language: 'en' },
  { id: 'aura-2-diana-en', name: 'Diana', accent: 'American', tone: 'Confident, refined', language: 'en' },
  { id: 'aura-2-lorena-en', name: 'Lorena', accent: 'Spanish', tone: 'Warm, melodic', language: 'es' },
  { id: 'aura-2-bianca-en', name: 'Bianca', accent: 'Italian', tone: 'Warm, expressive', language: 'it' },
];

// Google Cloud TTS — female voices
const GOOGLE_FEMALE: VoiceEntry[] = [
  { id: 'en-US-Neural2-F', name: 'Neural2-F', accent: 'US English', tone: 'Warm, professional', language: 'en-US' },
  { id: 'en-US-Neural2-A', name: 'Neural2-A', accent: 'US English', tone: 'Calm, measured', language: 'en-US' },
  { id: 'en-US-Neural2-E', name: 'Neural2-E', accent: 'US English', tone: 'Bright, friendly', language: 'en-US' },
  { id: 'en-US-Wavenet-F', name: 'Wavenet-F', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
  { id: 'en-US-Wavenet-E', name: 'Wavenet-E', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  { id: 'en-US-Journey-F', name: 'Journey-F', accent: 'US English', tone: 'Natural, expressive', language: 'en-US' },
  { id: 'en-US-Journey-D', name: 'Journey-D', accent: 'US English', tone: 'Calm, professional', language: 'en-US' },
  { id: 'en-GB-Neural2-F', name: 'Neural2-F (UK)', accent: 'British English', tone: 'Refined, professional', language: 'en-GB' },
  { id: 'en-GB-Wavenet-F', name: 'Wavenet-F (UK)', accent: 'British English', tone: 'Warm, clear', language: 'en-GB' },
  { id: 'en-AU-Neural2-C', name: 'Neural2-C (AU)', accent: 'Australian English', tone: 'Natural, friendly', language: 'en-AU' },
  { id: 'es-US-Neural2-A', name: 'Neural2-A (ES-US)', accent: 'US Spanish', tone: 'Warm, natural', language: 'es-US' },
  { id: 'fr-FR-Neural2-B', name: 'Neural2-B (FR)', accent: 'French', tone: 'Elegant, warm', language: 'fr-FR' },
  { id: 'de-DE-Neural2-C', name: 'Neural2-C (DE)', accent: 'German', tone: 'Professional, precise', language: 'de-DE' },
  { id: 'it-IT-Neural2-C', name: 'Neural2-C (IT)', accent: 'Italian', tone: 'Warm, melodic', language: 'it-IT' },
  { id: 'pt-BR-Neural2-A', name: 'Neural2-A (PT-BR)', accent: 'Brazilian Portuguese', tone: 'Warm, friendly', language: 'pt-BR' },
  { id: 'ja-JP-Neural2-B', name: 'Neural2-B (JA)', accent: 'Japanese', tone: 'Calm, professional', language: 'ja-JP' },
  { id: 'ko-KR-Neural2-A', name: 'Neural2-A (KO)', accent: 'Korean', tone: 'Bright, friendly', language: 'ko-KR' },
  { id: 'hi-IN-Neural2-A', name: 'Neural2-A (HI)', accent: 'Hindi', tone: 'Warm, professional', language: 'hi-IN' },
];

// Hume Octave — emotion-controlled voices
const HUME_FEMALE: VoiceEntry[] = [
  { id: 'hume-eva', name: 'Eva', accent: 'American', tone: 'Warm, empathetic', language: 'en' },
  { id: 'hume-sofia', name: 'Sofia', accent: 'American', tone: 'Calm, nurturing', language: 'en' },
  { id: 'hume-iris', name: 'Iris', accent: 'American', tone: 'Bright, cheerful', language: 'en' },
  { id: 'hume-nora', name: 'Nora', accent: 'American', tone: 'Professional, measured', language: 'en' },
  { id: 'hume-luna', name: 'Luna', accent: 'American', tone: 'Soft, dreamy', language: 'en' },
  { id: 'hume-aria', name: 'Aria', accent: 'American', tone: 'Expressive, warm', language: 'en' },
];

// Azure TTS — female voices
const AZURE_FEMALE: VoiceEntry[] = [
  { id: 'en-US-JennyNeural', name: 'Jenny', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  { id: 'en-US-AriaNeural', name: 'Aria', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
  { id: 'en-US-MichelleNeural', name: 'Michelle', accent: 'US English', tone: 'Warm, professional', language: 'en-US' },
  { id: 'en-US-AmberNeural', name: 'Amber', accent: 'US English', tone: 'Friendly, warm', language: 'en-US' },
  { id: 'en-US-AvaNeural', name: 'Ava', accent: 'US English', tone: 'Bright, youthful', language: 'en-US' },
  { id: 'en-US-EmmaNeural', name: 'Emma', accent: 'US English', tone: 'Calm, measured', language: 'en-US' },
  { id: 'en-US-LibbyNeural', name: 'Libby', accent: 'US English', tone: 'Warm, natural', language: 'en-US' },
  { id: 'en-US-SaraNeural', name: 'Sara', accent: 'US English', tone: 'Professional, confident', language: 'en-US' },
  { id: 'en-US-NancyNeural', name: 'Nancy', accent: 'US English', tone: 'Mature, authoritative', language: 'en-US' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', accent: 'British English', tone: 'Refined, professional', language: 'en-GB' },
  { id: 'en-GB-LibbyNeural', name: 'Libby (UK)', accent: 'British English', tone: 'Warm, friendly', language: 'en-GB' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha', accent: 'Australian English', tone: 'Natural, warm', language: 'en-AU' },
  { id: 'en-CA-ClaraNeural', name: 'Clara', accent: 'Canadian English', tone: 'Warm, professional', language: 'en-CA' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira', accent: 'Castilian Spanish', tone: 'Warm, natural', language: 'es-ES' },
  { id: 'fr-FR-DeniseNeural', name: 'Denise', accent: 'French', tone: 'Warm, professional', language: 'fr-FR' },
  { id: 'de-DE-KatjaNeural', name: 'Katja', accent: 'German', tone: 'Professional, clear', language: 'de-DE' },
  { id: 'it-IT-ElsaNeural', name: 'Elsa', accent: 'Italian', tone: 'Warm, melodic', language: 'it-IT' },
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', accent: 'Brazilian Portuguese', tone: 'Warm, friendly', language: 'pt-BR' },
  { id: 'ja-JP-NanamiNeural', name: 'Nanami', accent: 'Japanese', tone: 'Warm, professional', language: 'ja-JP' },
  { id: 'ko-KR-SunHiNeural', name: 'Sun-Hi', accent: 'Korean', tone: 'Bright, friendly', language: 'ko-KR' },
];

// Inworld TTS-2 — realtime female voices
const INWORLD_FEMALE: VoiceEntry[] = [
  { id: 'inworld-kira', name: 'Kira', accent: 'American', tone: 'Energetic, youthful', language: 'en' },
  { id: 'inworld-mira', name: 'Mira', accent: 'American', tone: 'Calm, professional', language: 'en' },
  { id: 'inworld-sable', name: 'Sable', accent: 'American', tone: 'Warm, storytelling', language: 'en' },
  { id: 'inworld-ava', name: 'Ava', accent: 'American', tone: 'Bright, friendly', language: 'en' },
  { id: 'inworld-nova', name: 'Nova', accent: 'American', tone: 'Confident, clear', language: 'en' },
  { id: 'inworld-stella', name: 'Stella', accent: 'British', tone: 'Refined, elegant', language: 'en' },
  { id: 'inworld-luna', name: 'Luna', accent: 'American', tone: 'Soft, dreamy', language: 'en' },
  { id: 'inworld-iris', name: 'Iris', accent: 'American', tone: 'Warm, empathetic', language: 'en' },
];

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
  female_voices: POLLY_FEMALE,
  male_voices: [
    { id: 'Matthew', name: 'Matthew', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
    { id: 'Brian', name: 'Brian', accent: 'British English', tone: 'Authoritative', language: 'en-GB' },
    { id: 'Justin', name: 'Justin', accent: 'US English', tone: 'Young, energetic', language: 'en-US' },
    { id: 'Joey', name: 'Joey', accent: 'US English', tone: 'Warm, friendly', language: 'en-US' },
  ],
  configured: () => true,  // Polly is used via Twilio <Say>, no direct API key needed
  generate: async (params) => {
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
  female_voices: ELEVENLABS_FEMALE,
  male_voices: [
    { id: 'Adam', name: 'Adam', accent: 'American', tone: 'Deep, narrative', language: 'en' },
    { id: 'George', name: 'George', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  ],
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
  female_voices: OPENAI_FEMALE,
  male_voices: [
    { id: 'echo', name: 'Echo', accent: 'American', tone: 'Warm, clear', language: 'en' },
    { id: 'fable', name: 'Fable', accent: 'British', tone: 'Narrative, expressive', language: 'en' },
    { id: 'onyx', name: 'Onyx', accent: 'American', tone: 'Deep, authoritative', language: 'en' },
  ],
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
  female_voices: CARTESIA_FEMALE,
  male_voices: [
    { id: 'Daniel', name: 'Daniel', accent: 'American', tone: 'Professional, clear', language: 'en' },
    { id: 'Marcus', name: 'Marcus', accent: 'American', tone: 'Warm, deep', language: 'en' },
  ],
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
  female_voices: DEEPGRAM_FEMALE,
  male_voices: [
    { id: 'aura-2-orion-en', name: 'Orion', accent: 'American', tone: 'Professional, deep', language: 'en' },
    { id: 'aura-2-atlas-en', name: 'Atlas', accent: 'American', tone: 'Warm, confident', language: 'en' },
  ],
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

// ── Provider: Google Cloud TTS ──
const GoogleTTS: VoiceProvider = {
  id: 'google',
  name: 'Google Cloud TTS',
  tier: 'standard',
  latency_ms: 200,
  price_per_1m: 16,
  supports_cloning: false,
  supports_streaming: true,
  languages: 40,
  female_voices: GOOGLE_FEMALE,
  male_voices: [
    { id: 'en-US-Neural2-D', name: 'Neural2-D', accent: 'US English', tone: 'Deep, professional', language: 'en-US' },
    { id: 'en-US-Wavenet-D', name: 'Wavenet-D', accent: 'US English', tone: 'Warm, clear', language: 'en-US' },
  ],
  configured: () => !!secrets.get('GOOGLE_TTS_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('GOOGLE_TTS_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not configured');
    const voiceName = params.voice_id || 'en-US-Neural2-F';
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: params.text.slice(0, 5000) },
        voice: { languageCode: params.language_code || 'en-US', name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: params.speed ?? 1.0 },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'google', voice_id: voiceName, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const data = await res.json();
    return {
      provider: 'google',
      voice_id: voiceName,
      audio_base64: data.audioContent,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 16,
    };
  },
};

// ── Provider: Hume Octave (emotion-forward) ──
const Hume: VoiceProvider = {
  id: 'hume',
  name: 'Hume Octave',
  tier: 'premium',
  latency_ms: 300,
  price_per_1m: 70,
  supports_cloning: true,
  supports_streaming: true,
  languages: 20,
  female_voices: HUME_FEMALE,
  male_voices: [
    { id: 'hume-max', name: 'Max', accent: 'American', tone: 'Warm, professional', language: 'en' },
  ],
  configured: () => !!secrets.get('HUME_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('HUME_API_KEY');
    if (!apiKey) throw new Error('HUME_API_KEY not configured');
    const voice = params.voice_id || 'hume-eva';
    const res = await fetch('https://api.hume.ai/v0/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text.slice(0, 5000),
        voice: { name: voice },
        speed: params.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'hume', voice_id: voice, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'hume',
      voice_id: voice,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 70,
    };
  },
};

// ── Provider: Azure TTS ──
const Azure: VoiceProvider = {
  id: 'azure',
  name: 'Azure Neural TTS',
  tier: 'standard',
  latency_ms: 150,
  price_per_1m: 16,
  supports_cloning: true,
  supports_streaming: true,
  languages: 140,
  female_voices: AZURE_FEMALE,
  male_voices: [
    { id: 'en-US-DavisNeural', name: 'Davis', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
    { id: 'en-US-GuyNeural', name: 'Guy', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  ],
  configured: () => !!secrets.get('AZURE_SPEECH_KEY') && !!secrets.get('AZURE_SPEECH_REGION'),
  generate: async (params) => {
    const key = secrets.get('AZURE_SPEECH_KEY');
    const region = secrets.get('AZURE_SPEECH_REGION');
    if (!key || !region) throw new Error('AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not configured');
    const voice = params.voice_id || 'en-US-JennyNeural';
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: `<speak version='1.0' xml:lang='en-US'><voice name='${voice}'>${params.text.slice(0, 5000)}</voice></speak>`,
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'azure', voice_id: voice, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'azure',
      voice_id: voice,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 16,
    };
  },
};

// ── Provider: Inworld TTS-2 (realtime gaming/agent) ──
const Inworld: VoiceProvider = {
  id: 'inworld',
  name: 'Inworld TTS-2',
  tier: 'premium',
  latency_ms: 100,
  price_per_1m: 25,
  supports_cloning: true,
  supports_streaming: true,
  languages: 200,
  female_voices: INWORLD_FEMALE,
  male_voices: [
    { id: 'inworld-max', name: 'Max', accent: 'American', tone: 'Professional, warm', language: 'en' },
  ],
  configured: () => !!secrets.get('INWORLD_API_KEY'),
  generate: async (params) => {
    const apiKey = secrets.get('INWORLD_API_KEY');
    if (!apiKey) throw new Error('INWORLD_API_KEY not configured');
    const voice = params.voice_id || 'inworld-kira';
    const res = await fetch('https://api.inworld.ai/tts/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text.slice(0, 5000),
        voice: voice,
        speed: params.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { provider: 'inworld', voice_id: voice, characters: params.text.length, cost_estimate_usd: 0, error: err };
    }
    const audioBuf = await res.arrayBuffer();
    const audio_base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuf)));
    return {
      provider: 'inworld',
      voice_id: voice,
      audio_base64,
      characters: params.text.length,
      cost_estimate_usd: (params.text.length / 1_000_000) * 25,
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
  google: GoogleTTS,
  hume: Hume,
  azure: Azure,
  inworld: Inworld,
};

// ── Auto-select best available provider ──
export function selectProvider(preferred?: string): VoiceProvider {
  if (preferred && PROVIDERS[preferred]?.configured()) {
    return PROVIDERS[preferred];
  }
  // Fallback chain: premium → standard → basic
  const chain = ['elevenlabs', 'cartesia', 'inworld', 'openai', 'hume', 'deepgram', 'google', 'azure', 'polly'];
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
  } catch (err: any) {
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
    female_voice_count: p.female_voices.length,
    male_voice_count: p.male_voices.length,
  }));
}

// ── Get ALL female voices across all providers (massive catalog) ──
export function getAllFemaleVoices(): { provider: string; provider_name: string; tier: string; voice: VoiceEntry }[] {
  const catalog: { provider: string; provider_name: string; tier: string; voice: VoiceEntry }[] = [];
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    for (const voice of provider.female_voices) {
      catalog.push({ provider: id, provider_name: provider.name, tier: provider.tier, voice });
    }
  }
  return catalog;
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
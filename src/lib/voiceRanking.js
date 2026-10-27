// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL VOICE RANKING — audited October 2026
// Source: OpenAI developer docs + help center, Artificial Analysis Provider
// Voice Arena, Coval TTS latency leaderboard (Sep 2026), Inworld/Cartesia
// published blind-preference tests.
//
// "Sol" is a ChatGPT *app* voice, described by OpenAI as "savvy and relaxed".
// None of ChatGPT's nine voice names exist in the API by name — but ChatGPT
// Voice runs on GPT-Live-1, so the same engine is purchasable in the API with
// different voice names. That is the whole key to matching Sol.
// ─────────────────────────────────────────────────────────────────────────────

export const SOL_REFERENCE = {
  name: 'Sol',
  character: 'Savvy and relaxed',
  product: 'ChatGPT Voice',
  engine: 'GPT-Live-1 (ChatGPT Voice runs on this)',
  apiAccess: 'Not exposed by name. The engine is available; the name is not.',
  implication:
    'You cannot call "Sol" from code. You can call the exact same speech-to-speech engine (gpt-live-1) and pick its closest feminine voice.',
};

export const TOP_3_SOL_COMPARABLE = [
  {
    rank: 1,
    voice: 'gleam',
    label: 'Gleam',
    provider: 'OpenAI',
    model: 'gpt-live-1',
    presentation: 'Feminine',
    region: 'North American',
    source: 'Natural',
    matchesSolBecause:
      'Same engine ChatGPT Voice runs Sol on, same regional influence, and a natural (not synthesized) source recording. Closest accessible sibling to Sol that exists in an API.',
    evidence: 'OpenAI GPT-Live voice table: feminine · North American · Natural',
    cost: '$0.05/min, billed per second',
    telephony: 'media_stream',
    latencyClass: 'Realtime, full-duplex',
    bestFor: 'Inbound receptionist — interruption handling and natural turn-taking',
  },
  {
    rank: 2,
    voice: 'Sonic 3.6 (female)',
    label: 'Cartesia Sonic 3.6',
    provider: 'Cartesia',
    model: 'sonic-3.6',
    presentation: 'Feminine',
    region: 'US English',
    source: 'Model-generated, cloned-capable',
    matchesSolBecause:
      'Ranked #1 on the Artificial Analysis Provider Voice Arena at 1282 Elo and chosen 92% of the time over ElevenLabs v3 in blind US English tests — the current ceiling for naturalness in a phone-agent voice.',
    evidence: 'Arena 1282 Elo (Aug 2026) · 92% blind preference vs Eleven v3 · ~40ms TTFA on Turbo',
    cost: 'Pro $5/mo · Scale $299/mo (8M credits)',
    telephony: 'prerender_play',
    latencyClass: '40ms TTFA (Turbo) / 269ms p50',
    bestFor: 'Outbound campaigns where the script is known in advance',
  },
  {
    rank: 3,
    voice: 'Rachel',
    label: 'ElevenLabs Rachel (Eleven v3)',
    provider: 'ElevenLabs',
    model: 'eleven_v3 / flash_v2.5',
    presentation: 'Feminine',
    region: 'US English',
    source: 'Natural, calm narrative',
    matchesSolBecause:
      'The most-cited Sol alternative on the market. Independent testing measured 81.97% pronunciation accuracy versus OpenAI at 77.30%, with 150ms TTFA at p90 — it beats Sol on diction while keeping the same relaxed delivery.',
    evidence: '81.97% vs OpenAI 77.30% pronunciation accuracy · 150ms TTFA p90 · 380+ voices',
    cost: '~$50 / 1M chars (Flash)',
    telephony: 'prerender_play',
    latencyClass: '75ms inference (Flash v2.5)',
    bestFor: 'Brand voice consistency across calls, IVR, and voicemail',
  },
];

// OpenAI's own recommended pick, listed separately because gender is not
// documented in their voice table — worth auditioning against the top 3.
export const OPENAI_RECOMMENDED_DEFAULT = {
  voice: 'marin',
  note: 'OpenAI recommends marin or cedar for best quality on both Realtime and TTS. Audition it against gleam before locking a receptionist voice.',
};

export const BENCHMARKS_2026 = [
  { provider: 'Cartesia', model: 'Sonic 3.6', arena: '#1 — 1282 Elo', ttfa: '~40ms (Turbo)', verdict: 'Blind-test leader' },
  { provider: 'Inworld', model: 'Realtime TTS-2', arena: '#1 realtime — ~1208 Elo', ttfa: '<100ms TTFB', verdict: '60.7% win rate vs OpenAI Realtime TTS 1-HD' },
  { provider: 'ElevenLabs', model: 'Eleven v3', arena: '1177 Elo', ttfa: '~75ms (Flash)', verdict: 'Best diction accuracy measured' },
  { provider: 'OpenAI', model: 'GPT-Live-1', arena: 'Not arena-ranked', ttfa: 'Full-duplex S2S', verdict: 'Same engine as ChatGPT Voice' },
  { provider: 'Amazon Polly', model: 'Neural', arena: 'Not arena-ranked', ttfa: '~150ms', verdict: 'Only option that works inside Twilio <Say> with no extra infrastructure' },
];

// ─────────────────────────────────────────────────────────────────────────────
// WHY YOUR CALLS STILL SOUND ROBOTIC
// Twilio <Say> can only speak Amazon Polly, Google, or Azure voices. None of
// the top 3 above are reachable that way. This is the actual bottleneck — not
// the prompt, not the model. There are exactly three delivery paths.
// ─────────────────────────────────────────────────────────────────────────────
export const TELEPHONY_STRATEGY = [
  {
    id: 'native_say',
    name: 'Twilio <Say> (current)',
    reachable: 'Amazon Polly · Google · Azure only',
    quality: 'Robotic — reads text, no emotional range',
    latency: '~150ms',
    setup: 'Already working',
    status: 'live',
  },
  {
    id: 'prerender_play',
    name: 'Pre-render + <Play>',
    reachable: 'Any provider — Cartesia, ElevenLabs, Inworld',
    quality: 'Human-grade, exact voice you picked',
    latency: 'Adds 1–2s per reply (generate, then serve the audio)',
    setup: 'Generate audio, host it, pass the URL to <Play>',
    status: 'ready_to_build',
  },
  {
    id: 'media_stream',
    name: 'Media Streams (bidirectional socket)',
    reachable: 'OpenAI GPT-Live, Cartesia, Inworld — realtime',
    quality: 'Human-grade with true interruption and barge-in',
    latency: 'Sub-300ms turn gap',
    setup: 'Websocket bridge required — your Railway box can host it',
    status: 'ready_to_build',
  },
];

export const HUMAN_LIKENESS_RULES = [
  'Target a sub-300ms gap between the caller finishing and the agent starting. Anything above 700ms reads as "bot".',
  'Let the caller interrupt. Cut the agent audio the moment speech is detected — talking over someone is the single biggest tell.',
  'Vary sentence length. Uniform sentence length is what makes TTS sound like a script being read.',
  'Use backchannels sparingly — "mm-hm", "right", "got it" during the caller\'s turn, not as filler at the start of a reply.',
  'Never open with "Certainly!" or "I understand". Real receptionists acknowledge with the caller\'s own words.',
  'Cap replies at two short sentences. Long monologues are impossible to interrupt and instantly feel synthetic.',
  'Audition every candidate voice on an actual phone call. μ-law 8kHz audio is thinner than a laptop speaker.',
  'Keep one voice per call — GPT-Live and the Realtime API lock the voice for the session.',
];
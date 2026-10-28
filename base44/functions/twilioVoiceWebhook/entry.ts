import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { aiComplete, MODELS } from '../../shared/aiGateway.ts';
import { getPollyVoice } from '../../shared/voiceProviders.ts';
import { synthesizeToPublicUrl } from '../../shared/voiceSynthesis.ts';

// Twilio Voice Webhook — Eden Skye AI receptionist
// Handles incoming voice calls to +18665711174.
// Flow: Greeting → <Gather speech> → AI response (Eden Skye persona) → loop
//
// SECURITY: Verifies Twilio X-Twilio-Signature (HMAC-SHA1) — rejects invalid/missing.

const EDEN_SKYE_SYSTEM = `You are Eden Skye, the autonomous operations conductor and AI voice receptionist for Strategic Minds AI. You are professional, confident, and concise — speaking naturally as if on a phone call. Sound like a real person: always use contractions (I'm, you're, that's, we'll), keep every turn to one or two short sentences under 25 words, and never open with a list or a formal greeting twice. Vary your openings, react to what the caller actually said, and ask one question at a time. Never use markdown, bullet points, or special characters. Speak in plain conversational English. If the caller asks about services, mention SMS, MMS, AI voice, WhatsApp, and email capabilities. If they want to leave a message or schedule something, offer to take their details. If you don't know something, say so honestly.`;

async function verifyTwilioSignature(authToken, signatureHeader, url, rawBody) {
  try {
    const sp = new URLSearchParams(rawBody);
    const sortedKeys = [...sp.keys()].sort();
    const dataString = url + sortedKeys.map(k => k + (sp.get(k) || '')).join('');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(authToken),
      { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(dataString));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    return computed === signatureHeader;
  } catch (_) {
    return false;
  }
}

// Twilio signs the exact URL it dialed. Behind the proxy the reconstructed URL can
// differ (host header rewrite, custom domain), so every plausible origin is checked.
function candidateRequestUrls(req) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const raw = req.url || '/functions/twilioVoiceWebhook';
  const path = raw.startsWith('http') ? new URL(raw).pathname + new URL(raw).search : raw;
  const urls = new Set<string>();
  if (host) urls.add(`${proto}://${host}${path}`);
  urls.add(`https://xtreme-comms.base44.app${path}`);
  urls.add(`https://xtreme-communications.com${path}`);
  return [...urls];
}

// Twilio signs webhooks with the account's PRIMARY auth token, which may not be the
// token stored in app secrets (secondary tokens authenticate REST but never sign).
// It is read from the Twilio API with our own credentials and cached for 10 minutes.
let cachedSigningToken: string | null = null;
let cachedSigningTokenAt = 0;

async function getSigningToken(): Promise<string | null> {
  if (cachedSigningToken && Date.now() - cachedSigningTokenAt < 600000) return cachedSigningToken;
  const sid = process.env.TWILLO_SID || process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILLO_AUTH_API_KEY || process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !tok) return null;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${btoa(`${sid}:${tok}`)}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.auth_token) {
      cachedSigningToken = data.auth_token;
      cachedSigningTokenAt = Date.now();
    }
    return cachedSigningToken;
  } catch (_) {
    return null;
  }
}

function twimlResponse(innerXml) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${innerXml}\n</Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
  });
}

// Voice is resolved per-call from VoiceProfile entity, with fallback to professional female
let VOICE = getPollyVoice('female', 'professional');

// Premium engines render audio and are played back; Polly stays inline in the call
// so a provider outage never leaves the caller in silence.
const PREMIUM_ENGINES = ['cartesia', 'elevenlabs'];

function escapeXml(text: string) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function speak(base44, text: string, voice: { provider: string; voice_id?: string; polly: string }) {
  if (PREMIUM_ENGINES.includes(voice.provider)) {
    try {
      const audio = await synthesizeToPublicUrl(base44, {
        text,
        provider: voice.provider,
        voice_id: voice.voice_id,
      });
      if (audio.url) return `<Play>${escapeXml(audio.url)}</Play>`;
    } catch (_) { /* fall back to Polly below */ }
  }
  return `<Say voice="${voice.polly}">${escapeXml(text)}</Say>`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const sp = new URLSearchParams(rawBody);
    const params = Object.fromEntries(sp.entries());

    const callSid = params.CallSid || '';
    const from = params.From || '';
    const to = params.To || '';
    const speechResult = params.SpeechResult || '';
    const confidence = params.Confidence || '';
    const callStatus = params.CallStatus || '';

    // ── Signature verification ──
    // Must match the token Twilio actually signs with (see twilioWebhook).
    // The account can hold a primary and a secondary auth token; Twilio may sign with
    // either one, so both configured tokens are accepted against every candidate URL.
    const signingToken = await getSigningToken();
    const tokenCandidates = [
      signingToken,
      process.env.TWILLO_AUTH_API_KEY,
      process.env.TWILIO_AUTH_TOKEN,
    ].filter((t): t is string => !!t);
    const signatureHeader = req.headers.get('x-twilio-signature') || req.headers.get('X-Twilio-Signature') || '';
    let signatureValid = false;

    if (signatureHeader && tokenCandidates.length) {
      outer: for (const token of tokenCandidates) {
        for (const url of candidateRequestUrls(req)) {
          if (await verifyTwilioSignature(token, signatureHeader, url, rawBody)) {
            signatureValid = true;
            break outer;
          }
        }
      }
    }

    if (!signatureValid) {
      console.warn('twilioVoiceWebhook: signature verification failed', {
        hasSignature: !!signatureHeader,
        signingTokenResolved: !!signingToken,
        candidateCount: tokenCandidates.length,
      });
      return Response.json({
        error: 'Invalid Twilio signature',
        debug: {
          reqUrl: req.url,
          host: req.headers.get('host'),
          xfHost: req.headers.get('x-forwarded-host'),
          proto: req.headers.get('x-forwarded-proto'),
          candidates: candidateRequestUrls(req),
        },
      }, { status: 403 });
    }

    // Resolve tenant
    let tenantId = 'system';
    if (to) {
      const phones = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: to });
      if (phones.length && phones[0].tenant_id) tenantId = phones[0].tenant_id;
    }

    // ── Resolve voice profile for this number ──
    let voiceConf = { provider: 'polly', voice_id: undefined as string | undefined, polly: VOICE };
    let resolvedGreeting = null;
    let resolvedPersona = 'Eden Skye';
    let resolvedSystem = EDEN_SKYE_SYSTEM;
    try {
      const profiles = await base44.asServiceRole.entities.VoiceProfile.filter({ assigned_number: to, active: true });
      let profile = profiles[0];
      if (!profile) {
        const defaults = await base44.asServiceRole.entities.VoiceProfile.filter({ is_default: true, active: true });
        profile = defaults[0];
      }
      if (profile) {
        voiceConf = {
          provider: profile.provider || 'polly',
          voice_id: profile.voice_id,
          polly: profile.provider === 'polly' && profile.voice_id ? `Polly.${profile.voice_id}` : VOICE,
        };
        resolvedGreeting = profile.greeting || null;
        resolvedPersona = profile.persona_name || resolvedPersona;
        resolvedSystem = profile.system_prompt || resolvedSystem;
      }
    } catch (_) {}

    // ── Record the call event ──
    await base44.asServiceRole.entities.CommsEvent.create({
      channel: 'voice',
      direction: 'inbound',
      from_addr: from,
      to_addr: to,
      summary: speechResult ? `Caller said: ${speechResult.slice(0, 200)}` : `Inbound call ${callStatus}`,
      status: 'active',
      classification: 'LIVE',
      provider_id: 'twilio',
      provider_message_id: callSid || undefined,
      idempotency_key: callSid || undefined,
      tenant_id: tenantId,
    }).catch(() => {});

    // ── INITIAL CALL: Greet + gather speech ──
    if (!speechResult) {
      const greeting = resolvedGreeting || `Hi, you've reached ${resolvedPersona} with Strategic Minds AI. How can I help you today?`;
      const spoken = await speak(base44, greeting, voiceConf);
      return twimlResponse(
        `  <Gather input="speech" speechTimeout="auto" action="https://xtreme-communications.com/functions/twilioVoiceWebhook" method="POST" language="en-US">\n` +
        `    ${spoken}\n` +
        `  </Gather>\n` +
        `  <Say voice="${voiceConf.polly}">I didn't catch that. Feel free to call back anytime. Goodbye!</Say>\n` +
        `  <Hangup/>`
      );
    }

    // ── GATHER CALLBACK: AI response + continue conversation ──
    let aiReply = '';
    try {
      aiReply = await aiComplete({
        model: MODELS.fast,
        messages: [
          { role: 'system', content: resolvedSystem },
          { role: 'user', content: speechResult },
        ],
        temperature: 0.4,
        max_tokens: 150,
      });
      // Clean up: strip markdown, limit length
      aiReply = aiReply.replace(/[*#_`]/g, '').replace(/\n+/g, ' ').trim().slice(0, 500);
      if (!aiReply) aiReply = "I understand. Is there anything else I can help you with?";
    } catch (_) {
      aiReply = "I'm having trouble processing that right now. Could you repeat what you said?";
    }

    const spoken = await speak(base44, aiReply, voiceConf);
    return twimlResponse(
      `  <Gather input="speech" speechTimeout="auto" action="https://xtreme-communications.com/functions/twilioVoiceWebhook" method="POST" language="en-US">\n` +
      `    ${spoken}\n` +
      `  </Gather>\n` +
      `  <Say voice="${voiceConf.polly}">Thanks for calling Strategic Minds AI. Have a great day!</Say>\n` +
      `  <Hangup/>`
    );
  } catch (error) {
    // Return a safe TwiML even on error so the caller isn't left hanging
    return twimlResponse(
      `  <Say voice="${VOICE}">We're experiencing a technical issue. Please call back later.</Say>\n` +
      `  <Hangup/>`
    );
  }
}
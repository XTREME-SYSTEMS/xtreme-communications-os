import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { aiComplete, MODELS } from '../../shared/aiGateway.ts';

// Twilio Voice Webhook — Eden Skye AI receptionist
// Handles incoming voice calls to +18665711174.
// Flow: Greeting → <Gather speech> → AI response (Eden Skye persona) → loop
//
// SECURITY: Verifies Twilio X-Twilio-Signature (HMAC-SHA1) — rejects invalid/missing.

const EDEN_SKYE_SYSTEM = `You are Eden Skye, the autonomous operations conductor and AI voice receptionist for Strategic Minds AI. You are professional, confident, and concise — speaking naturally as if on a phone call. Keep responses under 3 sentences (under 60 words). Never use markdown, bullet points, or special characters. Speak in plain conversational English. If the caller asks about services, mention SMS, MMS, AI voice, WhatsApp, and email capabilities. If they want to leave a message or schedule something, offer to take their details. If you don't know something, say so honestly.`;

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

function getRequestUrl(req) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const path = req.url || '/functions/twilioVoiceWebhook';
  const cleanPath = path.startsWith('http') ? new URL(path).pathname + new URL(path).search : path;
  return `${proto}://${host}${cleanPath}`;
}

function twimlResponse(innerXml) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${innerXml}\n</Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
  });
}

const VOICE = 'Polly.Matthew';

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
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signatureHeader = req.headers.get('x-twilio-signature') || req.headers.get('X-Twilio-Signature') || '';
    let signatureValid = false;

    if (authToken && signatureHeader) {
      const requestUrl = getRequestUrl(req);
      signatureValid = await verifyTwilioSignature(authToken, signatureHeader, requestUrl, rawBody);
      if (!signatureValid) {
        const fallbackUrl = 'https://xtreme-communications.com/functions/twilioVoiceWebhook';
        signatureValid = await verifyTwilioSignature(authToken, signatureHeader, fallbackUrl, rawBody);
      }
    }

    if (!signatureValid) {
      return Response.json({ error: 'Invalid Twilio signature' }, { status: 403 });
    }

    // Resolve tenant
    let tenantId = 'system';
    if (to) {
      const phones = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: to });
      if (phones.length && phones[0].tenant_id) tenantId = phones[0].tenant_id;
    }

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
      const greeting = "Hi, you've reached Eden Skye with Strategic Minds AI. How can I help you today?";
      return twimlResponse(
        `  <Gather input="speech" speechTimeout="auto" action="https://xtreme-communications.com/functions/twilioVoiceWebhook" method="POST" language="en-US">\n` +
        `    <Say voice="${VOICE}">${greeting}</Say>\n` +
        `  </Gather>\n` +
        `  <Say voice="${VOICE}">I didn't catch that. Feel free to call back anytime. Goodbye!</Say>\n` +
        `  <Hangup/>`
      );
    }

    // ── GATHER CALLBACK: AI response + continue conversation ──
    let aiReply = '';
    try {
      aiReply = await aiComplete({
        model: MODELS.fast,
        messages: [
          { role: 'system', content: EDEN_SKYE_SYSTEM },
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

    return twimlResponse(
      `  <Gather input="speech" speechTimeout="auto" action="https://xtreme-communications.com/functions/twilioVoiceWebhook" method="POST" language="en-US">\n` +
      `    <Say voice="${VOICE}">${aiReply}</Say>\n` +
      `  </Gather>\n` +
      `  <Say voice="${VOICE}">Thanks for calling Strategic Minds AI. Have a great day!</Say>\n` +
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
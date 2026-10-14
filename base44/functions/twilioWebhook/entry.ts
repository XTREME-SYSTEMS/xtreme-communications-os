import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Twilio inbound webhook — /functions/twilioWebhook
// Receives incoming SMS/MMS to the Twilio number (+18665711174),
// stores as CommsEvent (direction: "inbound") for bidirectional GPT sync.
//
// SECURITY:
//   1. Verifies Twilio's X-Twilio-Signature (HMAC-SHA1 with auth token) — rejects invalid/missing signatures.
//   2. Idempotency: deduplicates by MessageSid — never processes the same inbound message twice.

// ── Twilio signature verification ──
async function verifyTwilioSignature(
  authToken: string,
  signatureHeader: string,
  url: string,
  rawBody: string
): Promise<boolean> {
  try {
    // Parse the form body and sort params alphabetically by name
    const sp = new URLSearchParams(rawBody);
    const sortedKeys = [...sp.keys()].sort();
    // Build the string to sign: url + sorted(name + value + name + value + ...)
    const dataString = url + sortedKeys.map(k => k + (sp.get(k) || '')).join('');
    // HMAC-SHA1 with auth token as key
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

// ── Reconstruct the URL Twilio called ──
function getRequestUrl(req: any): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const path = req.url || '/functions/twilioWebhook';
  // req.url may be a full URL or just a path
  const cleanPath = path.startsWith('http') ? new URL(path).pathname + new URL(path).search : path;
  return `${proto}://${host}${cleanPath}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Read raw body FIRST (needed for signature verification) ──
    const rawBody = await req.text();
    const contentType = req.headers.get('content-type') || '';
    let params: any = {};
    if (contentType.includes('application/x-www-form-urlencoded') || rawBody.includes('=')) {
      const sp = new URLSearchParams(rawBody);
      params = Object.fromEntries(sp.entries());
      for (let i = 0; i < 10; i++) {
        const url = sp.get(`MediaUrl${i}`);
        if (url) params[`MediaUrl${i}`] = url;
      }
    } else {
      try { params = JSON.parse(rawBody); } catch (_) {}
    }

    const messageSid = params.MessageSid || params.messageSid || '';
    const from = params.From || params.from || '';
    const to = params.To || params.to || '';
    const body = params.Body || params.body || '';
    const accountSid = params.AccountSid || params.accountSid || '';

    // Collect media URLs for MMS
    const mediaUrls: string[] = [];
    for (let i = 0; i < 10; i++) {
      const url = params[`MediaUrl${i}`];
      if (url) mediaUrls.push(url);
    }

    const channel = mediaUrls.length > 0 ? 'mms' : 'sms';

    // ── 1. SIGNATURE VERIFICATION (fail closed) ──
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signatureHeader = req.headers.get('x-twilio-signature') || req.headers.get('X-Twilio-Signature') || '';
    let signatureValid = false;

    if (!authToken) {
      // Cannot verify without the auth token — fail closed
      await base44.asServiceRole.entities.WebhookEvent.create({
        tenant_id: 'system', source: 'twilio', event_type: 'message.received',
        raw: rawBody.slice(0, 10000), normalized: { from, to, messageSid },
        status: 'rejected', signature_valid: false,
      }).catch(() => {});
      return Response.json({ error: 'TWILIO_AUTH_TOKEN not configured — cannot verify signature' }, { status: 503 });
    }

    if (signatureHeader) {
      const requestUrl = getRequestUrl(req);
      signatureValid = await verifyTwilioSignature(authToken, signatureHeader, requestUrl, rawBody);
      // Fallback: try with the known custom domain URL if proxy headers don't match
      if (!signatureValid) {
        const fallbackUrl = 'https://xtreme-communications.com/functions/twilioWebhook';
        signatureValid = await verifyTwilioSignature(authToken, signatureHeader, fallbackUrl, rawBody);
      }
    }

    if (!signatureValid) {
      await base44.asServiceRole.entities.WebhookEvent.create({
        tenant_id: 'system', source: 'twilio', event_type: 'message.received',
        raw: rawBody.slice(0, 10000), normalized: { from, to, messageSid, signature_header: signatureHeader ? 'present' : 'missing' },
        status: 'rejected', signature_valid: false,
      }).catch(() => {});
      return Response.json({ error: 'Invalid Twilio signature' }, { status: 403 });
    }

    // ── 2. DUPLICATE MESSAGE PROTECTION (idempotency by MessageSid) ──
    if (messageSid) {
      const existing = await base44.asServiceRole.entities.CommsEvent.filter({
        provider_id: 'twilio',
        provider_message_id: messageSid,
      });
      if (existing.length > 0) {
        return Response.json({
          status: 'duplicate',
          message_sid: messageSid,
          comms_event_id: existing[0].id,
        });
      }
    }

    // Resolve tenant from the destination number
    let tenantId = 'system';
    if (to) {
      const phones = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: to });
      if (phones.length && phones[0].tenant_id) tenantId = phones[0].tenant_id;
    }

    // ── Store as CommsEvent (inbound) — signature verified ──
    const commsEvent = await base44.asServiceRole.entities.CommsEvent.create({
      channel,
      direction: 'inbound',
      from_addr: from,
      to_addr: to,
      summary: body.slice(0, 500) || `inbound ${channel}`,
      status: 'completed',
      classification: 'LIVE',
      provider_id: 'twilio',
      provider_message_id: messageSid || undefined,
      idempotency_key: messageSid || undefined,
      tenant_id: tenantId,
    });

    // ── Emit SyncEvent for bidirectional bridge ──
    await base44.asServiceRole.entities.SyncEvent.create({
      event_id: crypto.randomUUID(),
      event_type: 'message.received',
      occurred_at: new Date().toISOString(),
      tenant_id: tenantId,
      user_id: phones.length ? phones[0].user_id : null,
      correlation_id: `inbound:${messageSid || from}`,
      idempotency_key: messageSid || `inbound:${from}:${body.slice(0, 50)}`,
      actor_kind: 'provider',
      actor_id: 'twilio',
      payload: { from, to, body: body.slice(0, 500), channel, media_count: mediaUrls.length, comms_event_id: commsEvent.id },
      schema_version: '1.0.0',
      comms_event_id: commsEvent.id,
    }).catch(() => {});

    // Store raw webhook event for audit (signature verified = true)
    await base44.asServiceRole.entities.WebhookEvent.create({
      tenant_id: tenantId,
      source: 'twilio',
      event_type: 'message.received',
      raw: rawBody.slice(0, 10000),
      normalized: { from, to, body, messageSid, mediaUrls, accountSid },
      status: 'ingested',
      signature_valid: true,
    });

    // Thread into conversation if one exists
    const convs = await base44.asServiceRole.entities.Conversation.filter({
      tenant_id: tenantId, participant_identity: from,
    });
    const open = convs.find((c: any) => c.status !== 'closed' && c.status !== 'archived');
    if (open) {
      await base44.asServiceRole.entities.Conversation.update(open.id, {
        last_message_at: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.Conversation.create({
        tenant_id: tenantId,
        participant_identity: from,
        channels: [channel],
        status: 'active',
        last_message_at: new Date().toISOString(),
      });
    }

    return Response.json({
      status: 'processed',
      event_type: 'message.received',
      channel,
      from,
      to,
      message_sid: messageSid,
      comms_event_id: commsEvent.id,
      tenant_id: tenantId,
      media_count: mediaUrls.length,
      signature_verified: true,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
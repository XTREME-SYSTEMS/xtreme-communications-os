import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Telnyx inbound webhook controller — /api/v1/webhooks/telnyx
// Receives Telnyx message.received + call.initiated events, resolves the tenant
// from the destination phone number, ingests the event, and threads MMS media
// into the tenant's chat timeline via processMediaAttachment.
// Verifies the Ed25519 signature (telnyx-signature-ed25519) against TELNYX_PUBLIC_KEY.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Ed25519 webhook signature verification ──
    const rawBody = await req.text();
    const sigHeader = req.headers.get("telnyx-signature-ed25519") || req.headers.get("Telnyx-Signature-Ed25519") || "";
    const tsHeader = req.headers.get("telnyx-timestamp") || req.headers.get("Telnyx-Timestamp") || "";
    const pubKeyB64 = process.env.TELNYX_PUBLIC_KEY;

    let signatureValid = false;
    if (pubKeyB64 && sigHeader && tsHeader) {
      try {
        const pubKeyBytes = base64ToBytes(pubKeyB64.trim());
        const sigBytes = base64ToBytes(sigHeader);
        const message = new TextEncoder().encode(`${tsHeader}|${rawBody}`);
        const cryptoKey = await crypto.subtle.importKey(
          "raw", pubKeyBytes, { name: "Ed25519" }, false, ["verify"]
        );
        signatureValid = await crypto.subtle.verify("Ed25519", cryptoKey, sigBytes, message);
      } catch (_) {
        signatureValid = false;
      }
    }

    // Reject unsigned/invalid webhooks once the public key is configured
    if (pubKeyB64 && !signatureValid) {
      return Response.json({ error: "invalid webhook signature" }, { status: 401 });
    }

    let body = {};
    try { body = JSON.parse(rawBody); } catch (_) {}

    const eventType = body.data?.event_type || body.event_type || "unknown";
    const payload = body.data?.payload || body.payload || body;

    // Resolve tenant from the destination phone number
    const toNumber = payload.to?.phone_number || payload.to || "";
    let tenantId = "system";
    if (toNumber) {
      const phones = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: toNumber });
      if (phones.length && phones[0].tenant_id) tenantId = phones[0].tenant_id;
    }

    // Persist the raw webhook event
    await base44.asServiceRole.entities.WebhookEvent.create({
      tenant_id: tenantId,
      source: "telnyx",
      event_type: eventType,
      raw: JSON.stringify(body).slice(0, 10000),
      normalized: payload,
      status: "ingested",
      signature_valid: signatureValid,
    });

    // ── Inbound SMS/MMS ──
    if (eventType === "message.received") {
      const from = payload.from?.phone_number || payload.from || "";
      const to = payload.to?.phone_number || payload.to || "";
      const messageType = payload.message_type || (payload.media?.length ? "MMS" : "SMS");
      const channel = messageType === "MMS" ? "mms" : "sms";

      // Create CommsEvent
      await base44.asServiceRole.entities.CommsEvent.create({
        channel, direction: "inbound",
        from_addr: from, to_addr: to,
        status: "completed", classification: "PROVIDER-BACKED",
        summary: (payload.text || "").slice(0, 200) || `inbound ${channel}`,
      });

      // Thread into conversation
      let conversationId = null;
      const convs = await base44.asServiceRole.entities.Conversation.filter({
        tenant_id: tenantId, participant_identity: from,
      });
      const open = convs.find((c) => c.status !== "closed" && c.status !== "archived");
      if (open) {
        conversationId = open.id;
      } else {
        const newConv = await base44.asServiceRole.entities.Conversation.create({
          tenant_id: tenantId, participant_identity: from,
          channels: [channel], status: "active",
          last_message_at: new Date().toISOString(),
        });
        conversationId = newConv.id;
      }

      // Process MMS media array — fail gracefully so webhook ingestion never crashes
      const media = payload.media || [];
      let mediaProcessed = 0;
      if (media.length > 0) {
        try {
          const mediaUrls = media.map((m) => ({
            url: m.url || m.web_url || m,
            mime_type: m.content_type || m.mime_type || "application/octet-stream",
            size_bytes: m.size || m.size_bytes || 0,
          }));
          const apiKey = process.env.TELNYX_WEBHOOK_API_KEY || "telnyx_internal";
          const res = await base44.asServiceRole.functions.invoke("processMediaAttachment", {
            api_key: apiKey, media_urls: mediaUrls, channel: "mms",
            direction: "inbound", from, to, identity: from,
            conversation_id: conversationId, message_id: payload.id,
          });
          const data = (res && res.data) || res;
          mediaProcessed = data.media_count || 0;
        } catch (mediaErr) {
          // Media processing failure should not crash webhook ingestion
          mediaProcessed = 0;
        }
      }

      return Response.json({
        status: "processed", event_type: eventType, channel,
        tenant_id: tenantId, conversation_id: conversationId,
        media_processed: mediaProcessed,
      });
    }

    // ── Inbound call (TeXML) ──
    if (eventType === "call.initiated" || eventType === "call.answered") {
      const from = payload.from || "";
      const to = payload.to || "";
      await base44.asServiceRole.entities.CommsEvent.create({
        channel: "voice", direction: "inbound",
        from_addr: from, to_addr: to,
        status: eventType === "call.answered" ? "active" : "ringing",
        classification: "PROVIDER-BACKED",
        summary: `inbound call ${eventType}`,
      });
      return Response.json({ status: "processed", event_type: eventType, tenant_id: tenantId });
    }

    return Response.json({ status: "ingested", event_type: eventType, tenant_id: tenantId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
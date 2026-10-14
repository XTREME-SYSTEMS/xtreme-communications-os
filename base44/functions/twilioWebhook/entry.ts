import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Twilio inbound webhook — /functions/twilioWebhook
// Receives incoming SMS/MMS to the Twilio number (+18665711174),
// stores as CommsEvent (direction: "inbound") for bidirectional GPT sync.
// Configure this URL in Twilio console → Phone Numbers → Messaging webhook.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Twilio sends form-encoded POST data
    const contentType = req.headers.get('content-type') || '';
    let params: any = {};
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const sp = new URLSearchParams(text);
      params = Object.fromEntries(sp.entries());
      // Collect media URLs (MMS)
      for (let i = 0; i < 10; i++) {
        const url = sp.get(`MediaUrl${i}`);
        if (url) params[`MediaUrl${i}`] = url;
      }
    } else {
      try { params = await req.json(); } catch (_) {}
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

    // Resolve tenant from the destination number
    let tenantId = 'system';
    if (to) {
      const phones = await base44.asServiceRole.entities.PhoneNumber.filter({ e164: to });
      if (phones.length && phones[0].tenant_id) tenantId = phones[0].tenant_id;
    }

    // Store as CommsEvent (inbound) — this is the App→GPT side of the sync
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
      tenant_id: tenantId,
    });

    // Store raw webhook event for audit
    await base44.asServiceRole.entities.WebhookEvent.create({
      tenant_id: tenantId,
      source: 'twilio',
      event_type: 'message.received',
      raw: JSON.stringify(params).slice(0, 10000),
      normalized: { from, to, body, messageSid, mediaUrls, accountSid },
      status: 'ingested',
      signature_valid: false,
    });

    // Thread into conversation if one exists
    const convs = await base44.asServiceRole.entities.Conversation.filter({
      tenant_id: tenantId, participant_identity: from,
    });
    const open = convs.find((c: any) => c.status !== 'closed' && c.status !== 'archived');
    if (open) {
      // Update last message timestamp
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
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
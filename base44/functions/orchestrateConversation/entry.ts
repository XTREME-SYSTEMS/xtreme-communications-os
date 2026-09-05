import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Conversation threading engine. Links inbound/outbound SMS, MMS, WhatsApp, and
// Voice interactions into a single chronological thread keyed by customer identity.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const key = keys[0];
    const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    if (!tenant || tenant.status !== "active") return Response.json({ error: "tenant not active" }, { status: 403 });

    const identity = body.identity;
    const channel = body.channel || "sms";
    const direction = body.direction || "inbound";
    const content = body.content || "";
    if (!identity) return Response.json({ error: "identity required" }, { status: 400 });

    // Find or create a conversation for this identity
    const conversations = await base44.asServiceRole.entities.Conversation.filter({ tenant_id: tenant.id, participant_identity: identity });
    let conversation = conversations.find(c => c.status !== "closed" && c.status !== "archived");
    if (!conversation) {
      conversation = await base44.asServiceRole.entities.Conversation.create({
        tenant_id: tenant.id, participant_identity: identity,
        channels: [channel], status: "active",
        last_message_at: new Date().toISOString(), summary: content.slice(0, 120),
      });
    } else {
      const channels = Array.from(new Set([...(conversation.channels || []), channel]));
      await base44.asServiceRole.entities.Conversation.update(conversation.id, {
        channels, last_message_at: new Date().toISOString(), status: "active",
        summary: content ? content.slice(0, 120) : conversation.summary,
      });
    }

    // Append participant + comms event to the thread
    await base44.asServiceRole.entities.Participant.create({
      tenant_id: tenant.id, conversation_id: conversation.id, identity,
      channel, role: direction === "inbound" ? "customer" : "system",
    });
    await base44.asServiceRole.entities.CommsEvent.create({
      channel, direction, from_addr: body.from || identity, to_addr: body.to || "",
      status: "completed", classification: "PROVIDER-BACKED",
      summary: `thread ${conversation.id} · ${content.slice(0, 80)}`,
    });

    return Response.json({
      conversation_id: conversation.id, identity, channel, direction, status: "threaded",
      channels: conversation.channels,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Secure media processor for rich media (MMS/RCS/WhatsApp).
// Pipeline: uploaded -> validated (MIME allow-list) -> normalized -> mapped (thread).
// Issues a public URL access token and links the attachment into the unified identity thread.
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

    const file_url = body.file_url;
    if (!file_url) return Response.json({ error: "file_url required" }, { status: 400 });
    const channel = body.channel || "mms";
    const declared_mime = body.mime_type || "application/octet-stream";

    // 1. INGEST + create attachment record
    const attachment = await base44.asServiceRole.entities.MediaAttachment.create({
      tenant_id: tenant.id, conversation_id: body.conversation_id, message_id: body.message_id,
      channel, mime_type: declared_mime, file_url, size_bytes: body.size_bytes || 0,
      status: "uploaded",
    });

    // 2. VALIDATE — MIME allow-list for rich messaging
    const ALLOWED = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/3gpp",
      "audio/mp3", "audio/mpeg", "audio/amr", "audio/ogg",
      "application/pdf", "text/vcard",
    ];
    const normalized_mime = declared_mime.toLowerCase().split(";")[0].trim();
    const valid = ALLOWED.includes(normalized_mime);
    if (!valid) {
      await base44.asServiceRole.entities.MediaAttachment.update(attachment.id, { status: "failed", mime_type: normalized_mime });
      return Response.json({ attachment_id: attachment.id, status: "failed", reason: "unsupported_mime", mime_type: normalized_mime }, { status: 415 });
    }

    // 3. NORMALIZE — derive storage key + public access token
    const storage_key = `media/${tenant.id}/${attachment.id}/${normalized_mime.replace("/", ".")}`;
    const access_token = "mat_" + Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18);
    const public_url = `${file_url.split("?")[0]}?token=${access_token}`;
    await base44.asServiceRole.entities.MediaAttachment.update(attachment.id, {
      status: "normalized", mime_type: normalized_mime, storage_key, access_token, public_url,
    });

    // 4. MAP — link into the unified identity thread
    let conversation_id = body.conversation_id;
    if (!conversation_id && body.identity) {
      const convs = await base44.asServiceRole.entities.Conversation.filter({ tenant_id: tenant.id, participant_identity: body.identity });
      const open = convs.find(c => c.status !== "closed" && c.status !== "archived");
      if (open) conversation_id = open.id;
    }
    if (conversation_id) {
      await base44.asServiceRole.entities.MediaAttachment.update(attachment.id, { conversation_id, status: "mapped" });
      await base44.asServiceRole.entities.CommsEvent.create({
        channel, direction: body.direction || "inbound",
        from_addr: body.from || "", to_addr: body.to || "",
        status: "completed", classification: "PROVIDER-BACKED",
        summary: `media ${normalized_mime} -> thread ${conversation_id}`,
      });
    }

    return Response.json({
      attachment_id: attachment.id, status: conversation_id ? "mapped" : "normalized",
      mime_type: normalized_mime, storage_key, access_token, public_url, conversation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
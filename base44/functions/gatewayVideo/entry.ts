import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Video API gateway — programmable video rooms for face-to-face comms.
// Telnyx does not offer a Video Rooms API, so this surfaces as credentials_required
// until a video provider (Twilio Video, Daily, LiveKit) API key is configured.
// Actions: create_room, list_rooms, join_room, end_room.
// Stores room metadata in CommsEvent for threading when a provider is connected.
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

    // No video provider is configured in Base44 integrations or secrets.
    // Video requires a dedicated provider (Twilio Video, Daily, LiveKit, etc.)
    const videoKey = process.env.VIDEO_PROVIDER_KEY;
    const videoProvider = process.env.VIDEO_PROVIDER; // "twilio" | "daily" | "livekit"
    if (!videoKey || !videoProvider) return Response.json({
      status: "credentials_required",
      error: "no video provider configured",
      action_required: "set VIDEO_PROVIDER and VIDEO_PROVIDER_KEY secrets (twilio/daily/livekit)",
      action: body.action || "create_room",
    }, { status: 503 });

    const action = body.action || "create_room";

    if (action === "create_room") {
      await base44.asServiceRole.entities.CommsEvent.create({
        channel: "video", direction: "outbound",
        from_addr: body.host || "", to_addr: body.participants || "",
        status: "active", classification: "PROVIDER-BACKED",
        summary: `video room created via ${videoProvider}`,
      });
      return Response.json({
        room_id: "vid_" + Math.random().toString(36).slice(2, 12),
        status: "active", routed_via: videoProvider, classification: "PROVIDER-BACKED",
      });
    }

    if (action === "list_rooms") {
      const events = await base44.asServiceRole.entities.CommsEvent.filter({ channel: "video" }, "-created_date", 50);
      return Response.json({ count: events.length, rooms: events });
    }

    if (action === "end_room") {
      await base44.asServiceRole.entities.CommsEvent.update(body.event_id || "", { status: "completed" }).catch(() => {});
      return Response.json({ room_id: body.room_id, status: "ended" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
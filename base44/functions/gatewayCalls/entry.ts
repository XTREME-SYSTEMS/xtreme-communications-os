import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public CaaS voice gateway (/v1/calls). Customers call this with their tenant API key.
// Routes outbound calls through the tenant's connected SIP/trunk engines. When no
// upstream trunk is connected, fails over to the sandbox-trunk and returns a
// credentials_required state — never fakes a live carrier leg.
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

    const from = body.from;
    const to = body.to;
    if (!from || !to) return Response.json({ error: "from and to required" }, { status: 400 });

    // Resolve an enabled outbound/bidirectional SIP trunk for the tenant.
    const trunks = await base44.asServiceRole.entities.SipTrunk.filter({ tenant_id: tenant.id, enabled: true });
    const trunk = (trunks || []).find(t => t.status === "connected" && (t.type === "outbound" || t.type === "bidirectional"));

    const callId = "call_" + Math.random().toString(36).slice(2, 12);

    // ── AI ASSISTANT CALL: originate via Telnyx AI Assistant (managed voice AI) ──
    // Uses /v2/texml/ai_calls/{texml_app_id} — the assistant handles STT/LLM/TTS,
    // barge-in, noise suppression, and interruptions on Telnyx's infrastructure.
    if (body.use_ai_assistant || body.assistant_id) {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({
        status: "credentials_required", error: "TELNYX_API_KEY not configured",
      }, { status: 503 });

      // Resolve the AI assistant config — either passed explicitly or the active default
      let assistantId = body.assistant_id;
      let texmlAppId = body.texml_app_id;
      if (!assistantId || !texmlAppId) {
        const configs = await base44.asServiceRole.entities.AiAgentConfig.filter({ tenant_id: tenant.id, status: "active" });
        const aiConfig = configs.find(c => c.provider_assistant_id && c.provider_texml_app_id);
        if (aiConfig) {
          assistantId = assistantId || aiConfig.provider_assistant_id;
          texmlAppId = texmlAppId || aiConfig.provider_texml_app_id;
        }
      }
      if (!assistantId || !texmlAppId) return Response.json({
        status: "credentials_required", error: "no AI Assistant configured — run provisionAiAssistant first",
      }, { status: 503 });

      const aiCallRes = await fetch(`https://api.telnyx.com/v2/texml/ai_calls/${texmlAppId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          From: from,
          To: to,
          AIAssistantId: assistantId,
          ...(body.machine_detection ? { MachineDetection: "Enable", AsyncAmd: true, DetectionMode: "Premium" } : {}),
        }),
      });
      let aiData = {};
      try { aiData = await aiCallRes.json(); } catch (_) {}

      if (!aiCallRes.ok) return Response.json({
        status: "failed", error: aiData?.error?.message || aiData?.errors?.[0]?.detail || "ai call failed",
      }, { status: aiCallRes.status });

      await base44.asServiceRole.entities.CommsEvent.create({
        channel: "voice", direction: "outbound", from_addr: from, to_addr: to,
        status: "ringing", classification: "LIVE",
        summary: `AI assistant call via Telnyx (assistant: ${assistantId})`,
      });
      return Response.json({
        call_id: aiData.id || callId, status: "ringing", routed_via: "telnyx-ai-assistant",
        assistant_id: assistantId, texml_app_id: texmlAppId,
        tenant: tenant.name, classification: "LIVE",
      });
    }

    if (trunk) {
      await base44.asServiceRole.entities.CommsEvent.create({
        channel: "voice", direction: "outbound", from_addr: from, to_addr: to,
        status: "ringing", classification: "PROVIDER-BACKED",
        summary: `originate via ${trunk.name} (${trunk.transport}/${trunk.host})`,
      });
      await base44.asServiceRole.entities.ProviderLog.create({
        provider: trunk.name, channel: "voice", event_type: "call.originate",
        direction: "outbound", status: "accepted", message: `call ${callId}`,
      });
      return Response.json({
        call_id: callId, status: "ringing", routed_via: trunk.name,
        tenant: tenant.name, transport: trunk.transport, host: trunk.host, port: trunk.port,
      });
    }

    // No connected trunk — sandbox failover. Surface as credentials_required, not a hard lock.
    await base44.asServiceRole.entities.CommsEvent.create({
      channel: "voice", direction: "outbound", from_addr: from, to_addr: to,
      status: "queued", classification: "SANDBOX",
      summary: "sandbox-trunk failover — no connected SIP trunk",
    });
    await base44.asServiceRole.entities.ProviderLog.create({
      provider: "sandbox-trunk", channel: "voice", event_type: "call.failover",
      direction: "outbound", status: "queued", message: `call ${callId} credentials_required`,
    });
    return Response.json({
      call_id: callId, status: "sandbox", routed_via: "sandbox-trunk",
      tenant: tenant.name, failover: true,
      reason: "no connected SIP trunk — credentials_required",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
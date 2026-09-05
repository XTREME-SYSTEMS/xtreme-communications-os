import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Provider-agnostic AI voice streaming engine.
// State machine: streaming -> listening (STT) -> speaking (TTS) -> interrupted (barge-in) -> summarized.
// Handles contextual memory, tool/function calling, and interruption detection.
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

    const action = body.action || "start";
    const session_id = body.session_id;

    // --- START: open a streaming voice session ---
    if (action === "start") {
      const config_id = body.agent_config_id;
      let config = null;
      if (config_id) {
        try { config = await base44.asServiceRole.entities.AiAgentConfig.get(config_id); } catch (_) {}
      }
      // Resolve or create a conversation thread for the caller identity
      let conversation_id = body.conversation_id;
      if (!conversation_id && body.identity) {
        const convs = await base44.asServiceRole.entities.Conversation.filter({ tenant_id: tenant.id, participant_identity: body.identity });
        const open = convs.find(c => c.status !== "closed" && c.status !== "archived");
        if (open) conversation_id = open.id;
      }
      const session = await base44.asServiceRole.entities.AiVoiceSession.create({
        tenant_id: tenant.id, conversation_id, agent_config_id: config_id,
        status: "streaming", context_state: { memory: [], turns: 0 },
        started_at: new Date().toISOString(), interrupted: false,
      });
      return Response.json({ session_id: session.id, status: "streaming", agent: config?.name || "default" });
    }

    // Existing session required for all other actions
    if (!session_id) return Response.json({ error: "session_id required" }, { status: 400 });
    const session = await base44.asServiceRole.entities.AiVoiceSession.get(session_id);
    if (!session || session.tenant_id !== tenant.id) return Response.json({ error: "session not found" }, { status: 404 });

    // --- STT: parse speech-to-text, transition to listening ---
    if (action === "stt") {
      const stt_text = body.stt_text || "";
      const confidence = typeof body.stt_confidence === "number" ? body.stt_confidence : 0.95;
      await base44.asServiceRole.entities.SpeechTranscript.create({
        tenant_id: tenant.id, voice_session_id: session.id, role: "user",
        content: stt_text, stt_confidence: confidence,
      });
      const ctx = session.context_state || { memory: [], turns: 0 };
      ctx.memory = [...(ctx.memory || []), { role: "user", text: stt_text }].slice(-(session.memory_window || 10));
      ctx.turns = (ctx.turns || 0) + 1;
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, { status: "listening", stt_text, context_state: ctx });
      return Response.json({ session_id, status: "listening", stt_text, confidence });
    }

    // --- TTS: synthesize response, transition to speaking ---
    if (action === "tts") {
      const tts_text = body.tts_text || "";
      const audio_url = body.tts_audio_url || "";
      await base44.asServiceRole.entities.SpeechTranscript.create({
        tenant_id: tenant.id, voice_session_id: session.id, role: "assistant",
        content: tts_text, tts_audio_url: audio_url,
      });
      const ctx = session.context_state || { memory: [], turns: 0 };
      ctx.memory = [...(ctx.memory || []), { role: "assistant", text: tts_text }].slice(-(session.memory_window || 10));
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, { status: "speaking", tts_text, tts_audio_url: audio_url, context_state: ctx });
      return Response.json({ session_id, status: "speaking", tts_text, audio_url });
    }

    // --- TOOL: function calling interface ---
    if (action === "tool") {
      const tool_name = body.tool_name || "";
      const tool_args = body.tool_args || {};
      // Tool registry is defined per AiAgentConfig.tools; here we record the call
      const ctx = session.context_state || { memory: [], turns: 0 };
      ctx.pending_tool = { name: tool_name, args: tool_args, called_at: new Date().toISOString() };
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, { context_state: ctx });
      return Response.json({ session_id, status: "tool_call", tool_name, tool_args });
    }

    // --- INTERRUPT: barge-in detection ---
    if (action === "interrupt") {
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, { status: "interrupted", interrupted: true });
      return Response.json({ session_id, status: "interrupted", barge_in: true });
    }

    // --- SUMMARIZE / END ---
    if (action === "summarize" || action === "end") {
      const ended_at = new Date().toISOString();
      const duration_sec = session.started_at ? (Date.now() - new Date(session.started_at).getTime()) / 1000 : 0;
      const ctx = session.context_state || { memory: [], turns: 0 };
      const summary = `Session ${session.id}: ${ctx.turns || 0} turns, ${ctx.memory?.length || 0} messages${session.interrupted ? ", interrupted" : ""}.`;
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, {
        status: action === "end" ? "ended" : "summarized", ended_at, duration_sec, context_state: ctx,
      });
      return Response.json({ session_id, status: action === "end" ? "ended" : "summarized", duration_sec, summary });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
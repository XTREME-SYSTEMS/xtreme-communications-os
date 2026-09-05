import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Provider-agnostic AI voice streaming engine with cognitive telemetry.
// State machine: streaming -> listening (STT) -> speaking (TTS) -> interrupted (barge-in) -> summarized.
// Logs real-time sentiment classifications, speech latency gaps, and barge-in interruption counts.
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
      let conversation_id = body.conversation_id;
      if (!conversation_id && body.identity) {
        const convs = await base44.asServiceRole.entities.Conversation.filter({ tenant_id: tenant.id, participant_identity: body.identity });
        const open = convs.find(c => c.status !== "closed" && c.status !== "archived");
        if (open) conversation_id = open.id;
      }
      const session = await base44.asServiceRole.entities.AiVoiceSession.create({
        tenant_id: tenant.id, conversation_id, agent_config_id: config_id,
        status: "streaming",
        context_state: { memory: [], turns: 0, last_turn_at: new Date().toISOString() },
        started_at: new Date().toISOString(), interrupted: false,
        sentiment_trace: [], sentiment_summary: { positive: 0, neutral: 0, negative: 0, frustrated: 0, confused: 0, dominant: "neutral" },
        latent_metrics: { avg_response_latency_ms: 0, max_silence_gap_ms: 0, speech_latency_gaps: [], total_turns: 0 },
        barge_in_count: 0,
      });
      return Response.json({ session_id: session.id, status: "streaming", agent: config?.name || "default" });
    }

    if (!session_id) return Response.json({ error: "session_id required" }, { status: 400 });
    const session = await base44.asServiceRole.entities.AiVoiceSession.get(session_id);
    if (!session || session.tenant_id !== tenant.id) return Response.json({ error: "session not found" }, { status: 404 });

    // --- STT: parse speech-to-text, classify sentiment, track latency gaps ---
    if (action === "stt") {
      const stt_text = body.stt_text || "";
      const confidence = typeof body.stt_confidence === "number" ? body.stt_confidence : 0.95;
      const ctx = session.context_state || { memory: [], turns: 0, last_turn_at: new Date().toISOString() };
      const turn_index = (ctx.turns || 0) + 1;
      const now = Date.now();
      const lastTurnAt = ctx.last_turn_at ? new Date(ctx.last_turn_at).getTime() : now;
      const silence_gap_ms = Math.max(0, now - lastTurnAt);

      // Cognitive sentiment classification via LLM
      let sentiment = { label: "neutral", score: 0.5 };
      try {
        const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Classify the sentiment of this customer utterance in a voice call. Respond ONLY with JSON: {"label": "<one of: positive, neutral, negative, frustrated, confused>", "score": <0.0-1.0 confidence>}.\n\nUtterance: "${stt_text}"`,
          response_json_schema: {
            type: "object",
            properties: {
              label: { type: "string", enum: ["positive", "neutral", "negative", "frustrated", "confused"] },
              score: { type: "number" }
            },
            required: ["label", "score"]
          }
        });
        if (llm && llm.label) sentiment = { label: llm.label, score: llm.score ?? 0.5 };
      } catch (_) {}

      await base44.asServiceRole.entities.SpeechTranscript.create({
        tenant_id: tenant.id, voice_session_id: session.id, role: "user",
        content: stt_text, stt_confidence: confidence,
        turn_index, sentiment, latency_ms: 0, silence_gap_ms,
      });

      ctx.memory = [...(ctx.memory || []), { role: "user", text: stt_text, sentiment: sentiment.label }].slice(-(session.memory_window || 10));
      ctx.turns = turn_index;
      ctx.last_turn_at = new Date().toISOString();

      // Update cognitive telemetry on the session
      const trace = [...(session.sentiment_trace || []), { turn: turn_index, role: "user", label: sentiment.label, score: sentiment.score, at: new Date().toISOString() }];
      const summary = { ...(session.sentiment_summary || { positive: 0, neutral: 0, negative: 0, frustrated: 0, confused: 0 }) };
      summary[sentiment.label] = (summary[sentiment.label] || 0) + 1;
      summary.dominant = Object.entries(summary).filter(([k]) => k !== "dominant").sort((a, b) => b[1] - a[1])[0][0];

      const latent = session.latent_metrics || { avg_response_latency_ms: 0, max_silence_gap_ms: 0, speech_latency_gaps: [], total_turns: 0 };
      const gaps = [...(latent.speech_latency_gaps || []), { turn: turn_index, gap_ms: silence_gap_ms, at: new Date().toISOString() }];
      const avgGap = gaps.reduce((s, g) => s + g.gap_ms, 0) / gaps.length;
      latent.avg_response_latency_ms = Math.round(avgGap);
      latent.max_silence_gap_ms = Math.max(latent.max_silence_gap_ms || 0, silence_gap_ms);
      latent.speech_latency_gaps = gaps;
      latent.total_turns = turn_index;

      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, {
        status: "listening", stt_text, context_state: ctx,
        sentiment_trace: trace, sentiment_summary: summary, latent_metrics: latent,
      });
      return Response.json({ session_id, status: "listening", stt_text, confidence, sentiment, silence_gap_ms });
    }

    // --- TTS: synthesize response, transition to speaking ---
    if (action === "tts") {
      const tts_text = body.tts_text || "";
      const audio_url = body.tts_audio_url || "";
      const ctx = session.context_state || { memory: [], turns: 0 };
      const turn_index = (ctx.turns || 0);
      const now = Date.now();
      const lastTurnAt = ctx.last_turn_at ? new Date(ctx.last_turn_at).getTime() : now;
      const latency_ms = Math.max(0, now - lastTurnAt);

      let sentiment = { label: "neutral", score: 0.5 };
      try {
        const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Classify the sentiment of this AI agent response in a voice call. Respond ONLY with JSON: {"label": "<one of: positive, neutral, negative, frustrated, confused>", "score": <0.0-1.0>}.\n\nResponse: "${tts_text}"`,
          response_json_schema: {
            type: "object",
            properties: {
              label: { type: "string", enum: ["positive", "neutral", "negative", "frustrated", "confused"] },
              score: { type: "number" }
            },
            required: ["label", "score"]
          }
        });
        if (llm && llm.label) sentiment = { label: llm.label, score: llm.score ?? 0.5 };
      } catch (_) {}

      await base44.asServiceRole.entities.SpeechTranscript.create({
        tenant_id: tenant.id, voice_session_id: session.id, role: "assistant",
        content: tts_text, tts_audio_url: audio_url, turn_index, sentiment, latency_ms,
      });
      ctx.memory = [...(ctx.memory || []), { role: "assistant", text: tts_text, sentiment: sentiment.label }].slice(-(session.memory_window || 10));
      ctx.last_turn_at = new Date().toISOString();

      const trace = [...(session.sentiment_trace || []), { turn: turn_index, role: "assistant", label: sentiment.label, score: sentiment.score, at: new Date().toISOString() }];
      const summary = { ...(session.sentiment_summary || { positive: 0, neutral: 0, negative: 0, frustrated: 0, confused: 0 }) };
      summary[sentiment.label] = (summary[sentiment.label] || 0) + 1;
      summary.dominant = Object.entries(summary).filter(([k]) => k !== "dominant").sort((a, b) => b[1] - a[1])[0][0];

      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, {
        status: "speaking", tts_text, tts_audio_url: audio_url, context_state: ctx,
        sentiment_trace: trace, sentiment_summary: summary,
      });
      return Response.json({ session_id, status: "speaking", tts_text, audio_url, sentiment, latency_ms });
    }

    // --- TOOL: function calling interface ---
    if (action === "tool") {
      const tool_name = body.tool_name || "";
      const tool_args = body.tool_args || {};
      const ctx = session.context_state || { memory: [], turns: 0 };
      ctx.pending_tool = { name: tool_name, args: tool_args, called_at: new Date().toISOString() };
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, { context_state: ctx });
      return Response.json({ session_id, status: "tool_call", tool_name, tool_args });
    }

    // --- INTERRUPT: barge-in detection + count tracking ---
    if (action === "interrupt") {
      const count = (session.barge_in_count || 0) + 1;
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, { status: "interrupted", interrupted: true, barge_in_count: count });
      return Response.json({ session_id, status: "interrupted", barge_in: true, barge_in_count: count });
    }

    // --- SUMMARIZE / END: finalize cognitive telemetry ---
    if (action === "summarize" || action === "end") {
      const ended_at = new Date().toISOString();
      const duration_sec = session.started_at ? (Date.now() - new Date(session.started_at).getTime()) / 1000 : 0;
      const ctx = session.context_state || { memory: [], turns: 0 };
      const summary = session.sentiment_summary || { positive: 0, neutral: 0, negative: 0, frustrated: 0, confused: 0, dominant: "neutral" };
      const latent = session.latent_metrics || { avg_response_latency_ms: 0, max_silence_gap_ms: 0, total_turns: 0 };
      const cognitiveSummary = `Session ${session.id}: ${ctx.turns || 0} turns, dominant sentiment=${summary.dominant}, avg latency=${latent.avg_response_latency_ms}ms, max gap=${latent.max_silence_gap_ms}ms, barge-ins=${session.barge_in_count || 0}.`;
      await base44.asServiceRole.entities.AiVoiceSession.update(session.id, {
        status: action === "end" ? "ended" : "summarized", ended_at, duration_sec, context_state: ctx,
      });
      return Response.json({ session_id, status: action === "end" ? "ended" : "summarized", duration_sec, cognitive_summary: cognitiveSummary, sentiment_summary: summary, latent_metrics: latent, barge_in_count: session.barge_in_count || 0 });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
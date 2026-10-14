import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Core Integrations MCP Handler
// Exposes Base44's built-in Core integrations as MCP tools for ChatGPT/Claude.
// Each action maps to a single Core method with bounded, validated inputs.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    // Auth: user session or API key
    let userId: string | null = null;
    try {
      const user = await base44.auth.me();
      if (user?.id) userId = user.id;
    } catch (_) {}
    if (!userId) {
      const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (!apiKey) return Response.json({ error: "Authentication required" }, { status: 401 });
      const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
      if (!keys.length) return Response.json({ error: "Invalid API key" }, { status: 403 });
      userId = keys[0].tenant_id || null;
      if (!userId) return Response.json({ error: "Cannot resolve user from credentials" }, { status: 403 });
    }

    const action = body.action;

    // ── GENERATE IMAGE ──
    if (action === "generate_image") {
      const { prompt, existing_image_urls } = body;
      if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });
      if (prompt.length > 2000) return Response.json({ error: "prompt too long (max 2000 chars)" }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: Array.isArray(existing_image_urls) ? existing_image_urls.slice(0, 4) : undefined,
      });
      return Response.json({
        action: "generate_image", status: "completed",
        image_url: result.url, prompt,
      });
    }

    // ── GENERATE VIDEO ──
    if (action === "generate_video") {
      const { prompt, duration, aspect_ratio, generate_audio } = body;
      if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });
      if (prompt.length > 2000) return Response.json({ error: "prompt too long (max 2000 chars)" }, { status: 400 });
      const validDurations = [4, 6, 8];
      const dur = validDurations.includes(duration) ? duration : 6;
      const ratio = aspect_ratio === "9:16" ? "9:16" : "16:9";
      const result = await base44.asServiceRole.integrations.Core.GenerateVideo({
        prompt, duration: dur, aspect_ratio: ratio,
        generate_audio: typeof generate_audio === "boolean" ? generate_audio : false,
      });
      return Response.json({
        action: "generate_video", status: "completed",
        video_url: result.url, prompt, duration: dur, aspect_ratio: ratio,
      });
    }

    // ── TRANSCRIBE AUDIO ──
    if (action === "transcribe_audio") {
      const { audio_url } = body;
      if (!audio_url) return Response.json({ error: "audio_url required" }, { status: 400 });
      if (!audio_url.startsWith("http")) return Response.json({ error: "audio_url must be a valid HTTP(S) URL" }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
      return Response.json({
        action: "transcribe_audio", status: "completed",
        transcript: result, audio_url,
      });
    }

    // ── EXTRACT DATA FROM FILE ──
    if (action === "extract_data") {
      const { file_url, json_schema } = body;
      if (!file_url) return Response.json({ error: "file_url required" }, { status: 400 });
      if (!json_schema || typeof json_schema !== "object") return Response.json({ error: "json_schema required (object)" }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url, json_schema,
      });
      return Response.json({
        action: "extract_data", status: result.status || "completed",
        output: result.output, details: result.details, file_url,
      });
    }

    // ── INVOKE LLM ──
    if (action === "invoke_llm") {
      const { prompt, model, response_json_schema, add_context_from_internet, file_urls } = body;
      if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });
      if (prompt.length > 50000) return Response.json({ error: "prompt too long (max 50000 chars)" }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: model || undefined,
        response_json_schema: response_json_schema || undefined,
        add_context_from_internet: add_context_from_internet === true,
        file_urls: Array.isArray(file_urls) ? file_urls : undefined,
      });
      return Response.json({
        action: "invoke_llm", status: "completed",
        result, model: model || "automatic",
      });
    }

    // ── UPLOAD PUBLIC FILE ──
    if (action === "upload_public_file") {
      const { file } = body;
      if (!file) return Response.json({ error: "file required (base64 or File object)" }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
      return Response.json({
        action: "upload_public_file", status: "completed",
        file_url: result.file_url,
      });
    }

    // ── CREATE SIGNED URL (for private files) ──
    if (action === "create_signed_url") {
      const { file_uri, expires_in } = body;
      if (!file_uri) return Response.json({ error: "file_uri required" }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri,
        expires_in: typeof expires_in === "number" ? Math.min(expires_in, 3600) : 300,
      });
      return Response.json({
        action: "create_signed_url", status: "completed",
        signed_url: result.signed_url, file_uri,
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';
import { requireAuth } from '../../shared/requireAuth.ts';
import { invokeAI, SOL, SOL_SECONDARY } from '../../shared/aiCore.ts';

// ── AI Gateway (client-facing edge of the XTREME AI CORE) ─────────────
// The browser cannot call Core.InvokeLLM directly, so the app talks to this.
// Every response carries { requested_model, actual_model, status } so the UI can
// show what actually ran. A fallback is reported as "fallback", never as "ok".
//
// Actions:
//   sol      — primary reasoning call (GPT-5.6 Sol)        [default]
//   json     — Sol + response_json_schema, validated object
//   complete — chat-style messages array
//   models   — what this app will actually try, in order
//   test     — real runtime probe that reports the model that answered

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAuth(base44, req);
    if (!auth.ok) return auth.response;

    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const action = body.action || 'sol';

    // ── Runtime probe ────────────────────────────────────────────────
    // The only honest way to know Sol is live is to ask it something and see
    // which model answered.
    if (action === 'test') {
      const startedAt = Date.now();
      try {
        const res = await invokeAI(base44, {
          prompt: 'Reply with exactly the two words: gateway online',
          maxTokens: 20,
          timeoutMs: 45000,
        });
        return Response.json({
          status: 'connected',
          requested_model: res.requested_model,
          actual_model: res.actual_model,
          model_status: res.status,
          primary_error: res.primary_error ?? null,
          attempts: res.attempts,
          latency_ms: Date.now() - startedAt,
          test_response: String(res.data).slice(0, 200),
        });
      } catch (e: any) {
        return Response.json({
          status: 'failed',
          requested_model: SOL,
          error: e.message,
          latency_ms: Date.now() - startedAt,
        }, { status: 503 });
      }
    }

    // ── Model chain ──────────────────────────────────────────────────
    if (action === 'models') {
      return Response.json({
        requested: SOL,
        chain: [SOL, SOL_SECONDARY, 'platform_default'],
        roles: { fast: SOL_SECONDARY, research: 'gemini_3_1_pro', complex: SOL, default: SOL },
        internet_capable: ['gemini_3_flash', 'gemini_3_1_pro'],
      });
    }

    // ── Single prompt (primary path) ─────────────────────────────────
    if (action === 'sol' || action === 'prompt') {
      const prompt = body.prompt || body.text;
      if (!prompt || !String(prompt).trim()) {
        return Response.json({ error: 'prompt required' }, { status: 400 });
      }
      const res = await invokeAI(base44, {
        prompt,
        system: body.system,
        addInternetContext: body.add_context_from_internet === true,
        fileUrls: Array.isArray(body.file_urls) ? body.file_urls : undefined,
        models: Array.isArray(body.models) && body.models.length ? body.models : undefined,
        maxTokens: body.max_tokens,
        timeoutMs: body.timeout_ms,
      });
      return Response.json({
        data: res.data,
        requested_model: res.requested_model,
        actual_model: res.actual_model,
        status: res.status,
        primary_error: res.primary_error ?? null,
        attempts: res.attempts,
      });
    }

    // ── Structured JSON ──────────────────────────────────────────────
    if (action === 'json') {
      const prompt = body.prompt;
      if (!prompt || !body.response_json_schema) {
        return Response.json({ error: 'prompt and response_json_schema required' }, { status: 400 });
      }
      const res = await invokeAI(base44, {
        prompt,
        system: body.system,
        responseJsonSchema: body.response_json_schema,
        addInternetContext: body.add_context_from_internet === true,
        maxTokens: body.max_tokens,
      });

      let data: any = res.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return Response.json({
            error: 'Model returned non-JSON',
            requested_model: res.requested_model,
            actual_model: res.actual_model,
            status: 'failed',
            raw: String(data).slice(0, 500),
          }, { status: 502 });
        }
      }
      const required: string[] = body.response_json_schema?.required || [];
      const missing = required.filter((k) => data?.[k] === undefined);
      if (missing.length) {
        return Response.json({
          error: `Response missing required fields: ${missing.join(', ')}`,
          requested_model: res.requested_model,
          actual_model: res.actual_model,
          status: 'failed',
        }, { status: 502 });
      }
      return Response.json({
        data,
        requested_model: res.requested_model,
        actual_model: res.actual_model,
        status: res.status,
        attempts: res.attempts,
      });
    }

    // ── Message-array completion ─────────────────────────────────────
    if (action === 'complete') {
      if (!Array.isArray(body.messages) || !body.messages.length) {
        return Response.json({ error: 'messages array required' }, { status: 400 });
      }
      const system = body.messages
        .filter((m: any) => m.role === 'system')
        .map((m: any) => m.content)
        .join('\n\n');
      const prompt = body.messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => (m.role === 'assistant' ? `Assistant: ${m.content}` : m.content))
        .join('\n\n');

      const res = await invokeAI(base44, {
        prompt,
        system: system || undefined,
        addInternetContext: body.add_context_from_internet === true,
        maxTokens: body.max_tokens,
      });
      return Response.json({
        content: String(res.data),
        requested_model: res.requested_model,
        actual_model: res.actual_model,
        status: res.status,
        attempts: res.attempts,
      });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('aiGateway error:', error?.message || error);
    return Response.json(
      { error: error.message, status: 'failed', requested_model: SOL },
      { status: 500 },
    );
  }
}
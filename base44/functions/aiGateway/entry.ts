import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiComplete, aiCompleteJson, aiPrompt, MODELS } from '../../shared/aiGateway.ts';

// ── AI Gateway Proxy Function ─────────────────────────────────────
// Routes LLM calls through Vercel AI Gateway — bypasses Base44 credit
// limits entirely. Uses the user's paid Vercel account.
//
// Actions:
//   complete — standard chat completion
//   json — structured JSON output with schema validation
//   prompt — single-prompt convenience
//   models — list available model aliases
//   test — quick connectivity test

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action || 'complete';

    // ── Test connectivity ──
    if (action === 'test') {
      try {
        const result = await aiPrompt('Reply with exactly: OK', MODELS.fast);
        return Response.json({
          status: 'connected',
          gateway: 'vercel-ai-gateway',
          test_response: result.slice(0, 100),
          models: MODELS,
        });
      } catch (e) {
        return Response.json({ status: 'error', error: e.message }, { status: 503 });
      }
    }

    // ── List models ──
    if (action === 'models') {
      return Response.json({ models: MODELS });
    }

    // ── Standard completion ──
    if (action === 'complete') {
      if (!body.messages || !Array.isArray(body.messages)) {
        return Response.json({ error: 'messages array required' }, { status: 400 });
      }
      const result = await aiComplete({
        model: body.model || MODELS.default,
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
      });
      return Response.json({ content: result, model: body.model || MODELS.default });
    }

    // ── JSON completion with schema ──
    if (action === 'json') {
      if (!body.messages || !body.schema) {
        return Response.json({ error: 'messages and schema required' }, { status: 400 });
      }
      const result = await aiCompleteJson({
        model: body.model || MODELS.default,
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        schema: body.schema,
      });
      return Response.json({ data: result, model: body.model || MODELS.default });
    }

    // ── Single prompt ──
    if (action === 'prompt') {
      if (!body.prompt) {
        return Response.json({ error: 'prompt required' }, { status: 400 });
      }
      const result = await aiPrompt(body.prompt, body.model);
      return Response.json({ content: result, model: body.model || MODELS.default });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// ── Shared AI layer — thin adapter over the XTREME AI CORE ───────────
// This module used to call Vercel's AI Gateway with VERCEL_AI_GATEWAY_API_KEY,
// which is not configured for this app — so every AI call failed at runtime.
//
// It now delegates to base44/shared/aiCore.ts, which uses Base44's native
// Core.InvokeLLM on GPT-5.6 Sol with a transparent fallback chain.
//
// Kept as a compatibility shim on purpose: ~20 backend functions already import
// these helpers, so centralizing here upgrades all of them at once instead of
// forking a second AI system beside the existing one.
//
// Usage (server-side only — Core.InvokeLLM is not callable from the browser):
//   const text = await aiComplete(base44, { messages: [...] });
//   const data = await aiCompleteJson(base44, { messages: [...], schema: {...} });

import { invokeAI, messagesToPrompt, SOL, SOL_SECONDARY } from './aiCore.ts';

// Logical roles → native Base44 model ids. Sol is the default reasoning engine.
export const MODELS = {
  fast: SOL_SECONDARY,
  research: 'gemini_3_1_pro',
  complex: SOL,
  heavy: SOL,
  best: SOL,
  default: SOL,
};

/** Map legacy Vercel-style ids ("anthropic/claude-sonnet-4") onto native ids. */
function normalizeModel(model?: string): string {
  if (!model) return MODELS.default;
  if (model.includes('/')) {
    // Old external-provider aliases: route complex work to Sol, cheap to Luna.
    return /mini|flash|haiku|fast/i.test(model) ? MODELS.fast : SOL;
  }
  return model;
}

interface AICompleteParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string; json_schema?: object };
  addInternetContext?: boolean;
  fileUrls?: string[];
}

/** Plain-text completion. Returns raw model text; metadata is dropped here. */
export async function aiComplete(base44: any, params: AICompleteParams): Promise<string> {
  const { system, prompt } = messagesToPrompt(params.messages || []);
  const res = await invokeAI(base44, {
    prompt,
    system,
    models: [normalizeModel(params.model)],
    addInternetContext: params.addInternetContext,
    fileUrls: params.fileUrls,
  });
  return String(res.data);
}

/** Schema-validated structured completion. Throws if required fields are absent. */
export async function aiCompleteJson(
  base44: any,
  params: AICompleteParams & { schema: object },
): Promise<any> {
  const { system, prompt } = messagesToPrompt(params.messages || []);
  const res = await invokeAI(base44, {
    prompt,
    system,
    models: [normalizeModel(params.model)],
    responseJsonSchema: params.schema,
    addInternetContext: params.addInternetContext,
    fileUrls: params.fileUrls,
  });

  let data: any = res.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      const match = data.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) data = JSON.parse(match[1]);
      else throw new Error(`AI returned non-JSON: ${data.slice(0, 200)}`);
    }
  }

  const required: string[] = (params.schema as any)?.required || [];
  const missing = required.filter((k) => data?.[k] === undefined);
  if (missing.length) {
    throw new Error(`AI response missing required fields: ${missing.join(', ')}`);
  }

  return data;
}

/** Single-prompt convenience. */
export async function aiPrompt(base44: any, prompt: string, model?: string): Promise<string> {
  return aiComplete(base44, {
    model: model || MODELS.default,
    messages: [{ role: 'user', content: prompt }],
  });
}

// Re-exported so call sites can build metadata-aware responses for the UI.
export { invokeAI, SOL, SOL_SECONDARY };
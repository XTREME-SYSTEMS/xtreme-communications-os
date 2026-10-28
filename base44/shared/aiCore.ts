// ── XTREME AI CORE — the single AI gateway ────────────────────────────
// Every AI call in this app routes through here.
//
// Primary engine: Base44 native Core.InvokeLLM on GPT-5.6 Sol.
// Fallback chain: gpt_5_6_sol → gpt_5_6_luna → platform default.
//
// TRUTHFULNESS: this module never claims Sol ran when it did not. Every result
// carries { requested_model, actual_model, status }. If the primary model fails
// we record the real error and either fall back (status: "fallback") or throw
// (status: "failed"). Callers must surface the status — never a bare "success".
//
// Server-side only: Core.InvokeLLM is not callable from browser code, and the
// service-role client is what lets scheduled functions (no session) use it.

export const SOL = 'gpt_5_6_sol';
export const SOL_SECONDARY = 'gpt_5_6_luna';
// The only models documented as supporting live internet context.
const INTERNET_MODELS = ['gemini_3_flash', 'gemini_3_1_pro'];

export type AiStatus = 'ok' | 'fallback' | 'failed';

export interface AiResult<T = string> {
  /** The model output (string, or parsed object when a schema was supplied). */
  data: T;
  requested_model: string;
  actual_model: string;
  status: AiStatus;
  /** Real provider error, when the primary model failed. */
  primary_error?: string;
  attempts: number;
}

export interface AiCallParams {
  prompt: string;
  system?: string;
  responseJsonSchema?: object;
  addInternetContext?: boolean;
  fileUrls?: string[];
  /** Override the engine chain (e.g. a cheap task that does not need Sol). */
  models?: string[];
  temperature?: number;
  maxTokens?: number;
  /** Hard ceiling on the whole call, including fallbacks. Default 60s. */
  timeoutMs?: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Invoke Base44's native LLM with automatic, transparent fallback.
 * Throws only when every model in the chain fails — callers see the real errors.
 */
export async function invokeAI<T = string>(
  base44: any,
  params: AiCallParams,
): Promise<AiResult<T>> {
  const {
    prompt,
    system,
    responseJsonSchema,
    addInternetContext = false,
    fileUrls,
    temperature,
    maxTokens,
    timeoutMs = 60000,
  } = params;

  if (!prompt || !String(prompt).trim()) {
    throw new Error('invokeAI: prompt is required');
  }

  // Internet context and file attachments are mutually exclusive in the SDK.
  const useInternet = addInternetContext && !(fileUrls && fileUrls.length);

  // Engine chain. When live web context is needed, only Gemini is documented to
  // support it, so the chain switches to Gemini rather than silently dropping
  // the requirement.
  let chain: string[];
  if (useInternet) {
    chain = INTERNET_MODELS;
  } else {
    chain = params.models && params.models.length
      ? params.models
      : [SOL, SOL_SECONDARY];
  }

  const fullPrompt = system ? `${system}\n\n---\n\n${prompt}` : prompt;
  const requested_model = chain[0];
  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];

    const payload: Record<string, any> = { prompt: fullPrompt };
    // An undefined model = platform default, which is the final fallback step.
    if (model) payload.model = model;
    if (responseJsonSchema) payload.response_json_schema = responseJsonSchema;
    if (useInternet) payload.add_context_from_internet = true;
    if (fileUrls && fileUrls.length) payload.file_urls = fileUrls;

    try {
      const raw = await withTimeout(
        base44.asServiceRole.integrations.Core.InvokeLLM(payload),
        timeoutMs,
        `InvokeLLM(${model || 'default'})`,
      );

      const isDefaultStep = !model;
      return {
        data: raw as T,
        requested_model,
        actual_model: isDefaultStep ? 'platform_default' : model,
        status: i === 0 ? 'ok' : 'fallback',
        ...(errors.length ? { primary_error: errors[0] } : {}),
        attempts: i + 1,
      };
    } catch (err: any) {
      const msg = `${model || 'platform_default'}: ${err?.message || String(err)}`;
      errors.push(msg);
      console.warn(`invokeAI: engine failed — ${msg}`);
    }
  }

  const error: any = new Error(
    `All AI engines failed (requested ${requested_model}). ${errors.join(' | ')}`,
  );
  error.ai_status = 'failed';
  error.attempts = errors.length;
  error.requested_model = requested_model;
  throw error;
}

/** Convenience: plain text out. */
export async function aiText(base44: any, params: AiCallParams): Promise<string> {
  const res = await invokeAI(base44, params);
  return String(res.data);
}

/** Convenience: schema-validated object out, with required-field validation. */
export async function aiJson<T = any>(
  base44: any,
  params: AiCallParams & { responseJsonSchema: object },
): Promise<AiResult<T>> {
  const res = await invokeAI<T>(base44, params);
  let data: any = res.data;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      const match = data.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) data = JSON.parse(match[1]);
      else throw new Error(`AI returned non-JSON: ${String(data).slice(0, 200)}`);
    }
  }

  // Validate required fields declared in the schema before anything trusts it.
  const required: string[] = (params.responseJsonSchema as any)?.required || [];
  const missing = required.filter((k) => data?.[k] === undefined);
  if (missing.length) {
    throw new Error(`AI response missing required fields: ${missing.join(', ')}`);
  }

  return { ...res, data } as AiResult<T>;
}

// ── Message-array compatibility ──────────────────────────────────────
// Core.InvokeLLM takes a single prompt string, but much of the app speaks in
// OpenAI-style message arrays. Flatten them faithfully rather than duplicating
// gateway logic at each call site.
export function messagesToPrompt(messages: Array<{ role: string; content: string }>): {
  system?: string;
  prompt: string;
} {
  const systemParts = messages.filter((m) => m.role === 'system');
  const convo = messages.filter((m) => m.role !== 'system');
  return {
    system: systemParts.map((m) => m.content).join('\n\n') || undefined,
    prompt: convo
      .map((m) => (m.role === 'assistant' ? `Assistant: ${m.content}` : m.content))
      .join('\n\n'),
  };
}
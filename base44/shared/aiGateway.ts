// ── Vercel AI Gateway Helper ───────────────────────────────────────
// Routes LLM calls through Vercel AI Gateway (https://ai-gateway.vercel.sh/v1)
// Supports: Groq (fast), Gemini (web research), Claude (complex), OpenAI
// Bypasses Base44 integration credit limits — uses the user's Vercel account.
//
// Usage:
//   import { aiComplete, aiCompleteJson } from '../../shared/aiGateway.ts';
//   const text = await aiComplete({ model: 'anthropic/claude-sonnet-4', messages: [...] });
//   const data = await aiCompleteJson({ model: 'google/gemini-2.5-flash', messages: [...], schema: {...} });

import { secrets } from 'base44:runtime';

const DEFAULT_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

// Model routing — pick the right model for the job
export const MODELS = {
  // Fast/cheap — classification, extraction, simple tasks
  fast: 'openai/gpt-5.4-mini',
  // Web research — has built-in search
  research: 'google/gemini-2.5-flash',
  // Complex reasoning — deep analysis, code generation
  complex: 'anthropic/claude-sonnet-4',
  // Heavy reasoning — most complex tasks
  heavy: 'anthropic/claude-opus-4',
  // Default
  default: 'anthropic/claude-sonnet-4',
};

export function getBaseUrl(): string {
  // The AI Gateway API endpoint is always https://ai-gateway.vercel.sh/v1
  // The VERCEL_AI_GATEWAY_BASE_URL secret is the dashboard URL (not the API endpoint),
  // so we always use the canonical API base.
  return DEFAULT_BASE_URL;
}

export function getApiKey(): string {
  const key = secrets.get('VERCEL_AI_GATEWAY_API_KEY');
  if (!key) throw new Error('VERCEL_AI_GATEWAY_API_KEY not configured');
  return key;
}

interface AICompleteParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string; json_schema?: object };
}

export async function aiComplete(params: AICompleteParams): Promise<string> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  const body: any = {
    model: params.model || MODELS.default,
    messages: params.messages,
    temperature: params.temperature ?? 0.3,
    max_tokens: params.max_tokens ?? 4096,
  };

  if (params.response_format) {
    body.response_format = params.response_format;
  }

  const url = baseUrl.endsWith('/')
    ? `${baseUrl}chat/completions`
    : `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Gateway error ${res.status} at ${url}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Get structured JSON output with schema validation
export async function aiCompleteJson(params: AICompleteParams & { schema: object }): Promise<any> {
  // Ensure schema is strict-compatible (required by OpenAI structured outputs)
  const strictSchema = {
    ...params.schema,
    additionalProperties: false,
  };

  const text = await aiComplete({
    ...params,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        strict: true,
        schema: strictSchema,
      },
    },
  });

  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error(`AI Gateway returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// Quick helper for single-prompt calls
export async function aiPrompt(prompt: string, model?: string): Promise<string> {
  return aiComplete({
    model: model || MODELS.default,
    messages: [{ role: 'user', content: prompt }],
  });
}
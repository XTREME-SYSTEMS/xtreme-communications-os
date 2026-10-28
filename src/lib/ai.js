import { base44 } from "@/api/base44Client";

// ── Client-side AI gateway ────────────────────────────────────────────
// The browser cannot call Core.InvokeLLM directly, so all client AI goes to the
// `aiGateway` backend function, which uses Base44's native integration on
// GPT-5.6 Sol (with a recorded fallback chain).
//
// No API key ever reaches the browser.
//
// Every result reports what actually ran:
//   { data, requested_model, actual_model, status: 'ok' | 'fallback' }
// Callers must show the real status — never claim Sol ran on a fallback.

export const AI_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  COMPLETE: "complete",
  FAILED: "failed",
  BLOCKED: "blocked",
};

/**
 * Run one AI request.
 * Throws on failure with the real message so the caller can render a failure
 * state instead of a false success.
 */
export async function invokeAI({
  prompt,
  system,
  responseJsonSchema,
  addInternetContext = false,
  fileUrls,
  models,
  maxTokens,
}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error("An AI prompt is required.");
  }

  const payload = {
    // Internet context and file attachments are mutually exclusive server-side.
    action: responseJsonSchema && !(fileUrls?.length) ? "json" : "sol",
    prompt,
    ...(system && { system }),
    ...(responseJsonSchema && { response_json_schema: responseJsonSchema }),
    ...(addInternetContext && !fileUrls?.length && { add_context_from_internet: true }),
    ...(fileUrls?.length && { file_urls: fileUrls }),
    ...(models?.length && { models }),
    ...(maxTokens && { max_tokens: maxTokens }),
  };

  const res = await base44.functions.invoke("aiGateway", payload);
  const body = res?.data || {};

  if (body.error) {
    throw new Error(body.error);
  }

  return {
    data: body.data,
    requested_model: body.requested_model,
    actual_model: body.actual_model,
    status: body.status,
  };
}

/** Structured output helper. Schema is enforced server-side before it returns. */
export async function invokeAIJson({ prompt, system, schema, ...rest }) {
  const res = await invokeAI({ prompt, system, responseJsonSchema: schema, ...rest });
  return res;
}
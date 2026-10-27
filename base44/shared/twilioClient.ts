// ─────────────────────────────────────────────────────────────────────────────
// Canonical Twilio Client — XTREME Communications OS
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for ALL Twilio REST access. No other provider.
// Account owner : jeremy@strategicmindsai.com
// Account domain: strategicmindsai.com
// Console       : https://1console.twilio.com/
// Env           : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// ─────────────────────────────────────────────────────────────────────────────

export const TWILIO_API = "https://api.twilio.com/2010-04-01";
export const TWILIO_LOOKUPS = "https://lookups.twilio.com/v2";
export const TWILIO_CONSOLE_URL = "https://1console.twilio.com/";
export const TWILIO_DEFAULT_FROM = "+18665711174";

export type TwilioConfig = {
  sid: string | undefined;
  token: string | undefined;
  from: string;
  configured: boolean;
  missing: string[];
};

export function twilioConfig(): TwilioConfig {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER || TWILIO_DEFAULT_FROM;
  const missing = [
    !sid ? "TWILIO_ACCOUNT_SID" : null,
    !token ? "TWILIO_AUTH_TOKEN" : null,
  ].filter(Boolean) as string[];
  return { sid, token, from, configured: Boolean(sid && token), missing };
}

/** Standard "not configured" payload — never fakes a live result. */
export function credentialsRequired(extra: Record<string, unknown> = {}) {
  const { missing } = twilioConfig();
  return {
    status: "credentials_required",
    provider: "twilio",
    missing,
    console_url: TWILIO_CONSOLE_URL,
    action_required: `Add ${missing.join(" and ")} in app secrets`,
    ...extra,
  };
}

export type TwilioResult = {
  ok: boolean;
  status: number;
  data: any;
  credentialsRequired?: boolean;
};

/**
 * Authenticated request against the Twilio REST API.
 * Account-scoped by default (prefixes /Accounts/{sid}) — pass accountScoped:false
 * for Lookups or any non-account endpoint.
 */
export async function twilioRequest(
  path: string,
  options: {
    method?: string;
    params?: Record<string, string | number | boolean | undefined | null>;
    accountScoped?: boolean;
    base?: string;
  } = {}
): Promise<TwilioResult> {
  const { method = "GET", params, accountScoped = true, base = TWILIO_API } = options;
  const { sid, token } = twilioConfig();
  if (!sid || !token) {
    return { ok: false, status: 503, credentialsRequired: true, data: credentialsRequired() };
  }

  const root = accountScoped ? `${base}/Accounts/${sid}` : base;
  const url = `${root}${path}`;

  let body: string | undefined;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      sp.set(k, String(v));
    }
    body = sp.toString();
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }

  console.log(`[twilio] ${method} ${path.replace(/\?.*/, "")} -> ${res.status}`);
  return { ok: res.ok, status: res.status, data };
}

/** Human-readable error from a Twilio error body. */
export function twilioError(data: any): string {
  return data?.message || data?.error_message || data?.more_info || "Twilio request failed";
}

/** Twilio numeric error code (e.g. 21211, 21608, 20003). */
export function twilioCode(data: any): number | null {
  return typeof data?.code === "number" ? data.code : null;
}

/** Normalize anything into E.164. */
export function toE164(value: string | null | undefined): string {
  if (!value) return "";
  const digits = String(value).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  return `+${digits.replace(/^1?/, "1")}`;
}

/** Strip to comparable digits for number matching. */
export function numberKey(value: string | null | undefined): string {
  return String(value || "").replace(/[^\d]/g, "");
}

/** XML-escape for TwiML bodies. */
export function escapeXml(value: string | null | undefined): string {
  return String(value ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" } as Record<string, string>)[c]
  );
}

/** Wrap inner XML in a TwiML Response document. */
export function twiml(inner: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${inner}\n</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml; charset=UTF-8" } }
  );
}

/** TwiML <Say> using the Amazon Polly voice Twilio provisions natively. */
export function sayTwiml(text: string, voice = "Polly.Joanna", language = "en-US"): string {
  return `<Say voice="${escapeXml(voice)}" language="${escapeXml(language)}">${escapeXml(text)}</Say>`;
}

/**
 * Verify Twilio's X-Twilio-Signature (HMAC-SHA1 over url + sorted form params).
 * Returns false on any failure so callers fail closed.
 */
export async function verifyTwilioSignature(
  authToken: string,
  signatureHeader: string | null,
  url: string,
  rawBody: string
): Promise<boolean> {
  if (!authToken || !signatureHeader) return false;
  try {
    const sp = new URLSearchParams(rawBody || "");
    const sortedKeys = [...sp.keys()].sort();
    const dataString = url + sortedKeys.map((k) => k + (sp.get(k) || "")).join("");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(authToken),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(dataString));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    return computed === signatureHeader;
  } catch (_) {
    return false;
  }
}

/** Canonical public webhook base for Twilio console configuration. */
export const PUBLIC_WEBHOOK_BASE = "https://xtreme-comms.base44.app/functions";

export const WEBHOOKS = {
  sms: `${PUBLIC_WEBHOOK_BASE}/twilioWebhook`,
  voice: `${PUBLIC_WEBHOOK_BASE}/twilioVoiceWebhook`,
  status: `${PUBLIC_WEBHOOK_BASE}/twilioWebhook`,
};

/** Twilio message status → internal CommsEvent status. */
export function mapMessageStatus(status: string | null | undefined): string {
  switch ((status || "").toLowerCase()) {
    case "accepted":
    case "scheduled":
      return "queued";
    case "queued":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "receiving":
    case "received":
    case "read":
      return "delivered";
    case "delivered":
      return "delivered";
    case "undelivered":
      return "undelivered";
    case "failed":
    case "canceled":
      return "failed";
    default:
      return "queued";
  }
}
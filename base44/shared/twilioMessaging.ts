// ─────────────────────────────────────────────────────────────────────────────
// Shared Twilio Messaging Utilities
// Used by provisionAgent, dailyFollowUpSequence, executeAutonomousAction, systemAudit.
// Replaces the retired Telnyx messaging module — Twilio only.
// ─────────────────────────────────────────────────────────────────────────────

import {
  twilioRequest,
  twilioConfig,
  toE164,
  mapMessageStatus,
} from "./twilioClient.ts";

export function personalize(template: string, contact: any): string {
  const firstName = (contact?.full_name || contact?.name || "").split(" ")[0] || "there";
  const company = contact?.company || contact?.company_name || "your company";
  return String(template || "")
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{company\}\}/gi, company);
}

export type SendResult = {
  ok: boolean;
  status: number;
  sid?: string | null;
  error?: string;
  data?: any;
  credentialsRequired?: boolean;
};

/**
 * Send an SMS or MMS through Twilio.
 * mediaUrls present → MMS automatically.
 */
export async function sendTwilioMessage(options: {
  to: string;
  body: string;
  from?: string;
  mediaUrls?: string[];
  statusCallback?: string;
}): Promise<SendResult> {
  const { sid, from, configured } = twilioConfig();
  if (!configured) {
    return { ok: false, status: 503, credentialsRequired: true, error: "Twilio credentials not configured" };
  }

  const params: Record<string, string> = {
    To: toE164(options.to),
    From: toE164(options.from || from),
    Body: options.body || "",
  };
  if (options.statusCallback) params.StatusCallback = options.statusCallback;

  const media = (options.mediaUrls || []).filter(Boolean);
  let index = 0;
  for (const url of media) {
    params[`MediaUrl${index}`] = url;
    index += 1;
  }

  const res = await twilioRequest("/Messages.json", { method: "POST", params });
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: res.data?.message || "Twilio send failed",
      data: res.data,
      credentialsRequired: res.credentialsRequired,
    };
  }

  return { ok: true, status: res.status, sid: res.data?.sid || null, data: res.data };
}

/** Convenience wrapper used by outreach loops. */
export async function sendSms(to: string, body: string, from?: string): Promise<SendResult> {
  return sendTwilioMessage({ to, body, from });
}

/** Map a Twilio delivery status onto the internal CommsEvent status enum. */
export function extractDeliveryStatus(payload: any): string {
  const raw =
    payload?.MessageStatus ||
    payload?.SmsStatus ||
    payload?.CallStatus ||
    payload?.status ||
    "queued";
  return mapMessageStatus(raw);
}

/** Twilio account SID (used only for display/logging). */
export function accountSidPreview(): string | null {
  const { sid } = twilioConfig();
  return sid ? `${sid.slice(0, 8)}...` : null;
}
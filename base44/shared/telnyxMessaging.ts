// ─── Shared Telnyx Messaging Utilities ───────────────────────────
// Used by provisionAgent and dailyFollowUpSequence to avoid duplication.

export function personalize(template: string, contact: any): string {
  const firstName = (contact.full_name || '').split(' ')[0] || 'there';
  const company = contact.company || 'your company';
  return template
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{company\}\}/gi, company);
}

export async function sendTelnyx(telnyxKey: string, endpoint: string, payload: any) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${telnyxKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: any = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

export function getTelnyxEndpoint(channel: string): string {
  return channel === 'whatsapp'
    ? 'https://api.telnyx.com/v2/messages/whatsapp'
    : 'https://api.telnyx.com/v2/messages';
}

// Build the correct payload for each channel
export function buildTelnyxPayload(channel: string, payload: any): any {
  if (channel === 'whatsapp') {
    return {
      from: payload.from,
      to: payload.to,
      whatsapp_message: {
        text: { body: payload.text || '' },
      },
    };
  }
  // SMS / MMS
  return {
    from: payload.from,
    to: payload.to,
    text: payload.text || '',
    media_urls: payload.media_urls || undefined,
    subject: payload.subject || undefined,
  };
}

// Extract delivery status from Telnyx response
export function extractDeliveryStatus(data: any): { delivered: boolean; to_status: string; error_code: string | null; error_detail: string | null } {
  const toEntry = data?.data?.to?.[0] || data?.to?.[0] || {};
  const errors = data?.data?.errors || data?.errors || [];
  const firstError = errors[0] || {};
  const status = toEntry.status || (errors.length ? 'failed' : 'unknown');
  return {
    delivered: status === 'delivered' || status === 'sent',
    to_status: status,
    error_code: firstError.code || null,
    error_detail: firstError.detail || firstError.title || null,
  };
}
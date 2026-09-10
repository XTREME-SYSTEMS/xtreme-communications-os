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
    ? 'https://api.telnyx.com/v2/whatsapp_messages'
    : 'https://api.telnyx.com/v2/messages';
}
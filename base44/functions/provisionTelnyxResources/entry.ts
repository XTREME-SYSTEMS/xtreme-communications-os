import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Provisions Telnyx resources programmatically so the CaaS gateway is fully wired:
//   1. Messaging Profile (SMS/MMS) → webhook = telnyxWebhook endpoint
//   2. Call Control Application (Voice) → webhook = telnyxWebhook endpoint
//   3. Links the toll-free number to the messaging profile
// Idempotent by name — re-runs reuse/sync existing resources instead of duplicating.
const TELNYX = "https://api.telnyx.com/v2";
const WEBHOOK_URL = "https://xtreme-communications.com/functions/telnyxWebhook";
const MP_NAME = "XTREME COMMS Messaging";
const APP_NAME = "XTREME COMMS Voice";
const TOLLFREE = "+18334843799";
const MP_EVENTS = ["message.received", "message.delivered", "message.sent", "message.finalized"];

async function telnyx(path, method, key, body) {
  const res = await fetch(`${TELNYX}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

function errMsg(d) {
  return d?.errors?.[0]?.detail || d?.errors?.[0]?.title || d?.message || JSON.stringify(d).slice(0, 300);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });

    const out = { webhook_url: WEBHOOK_URL, messaging_profile: null, call_control_app: null, number_link: null, errors: [] };

    // ── 1. Messaging Profile ──
    const mpList = await telnyx("/messaging_profiles?page[size]=50", "GET", apiKey);
    const existingMp = (mpList.data?.data || []).find((m) => m.name === MP_NAME);
    if (existingMp) {
      const currentWh = existingMp.webhooks?.[0]?.webhook_url;
      if (currentWh !== WEBHOOK_URL) {
        await telnyx(`/messaging_profiles/${existingMp.id}`, "PATCH", apiKey, {
          webhooks: [{ webhook_url: WEBHOOK_URL, events: MP_EVENTS }],
        });
      }
      out.messaging_profile = { id: existingMp.id, name: existingMp.name, reused: true, webhook: WEBHOOK_URL, webhook_updated: currentWh !== WEBHOOK_URL };
    } else {
      const c = await telnyx("/messaging_profiles", "POST", apiKey, {
        name: MP_NAME,
        enabled: true,
        whitelisted_destinations: ["US", "CA"],
        webhooks: [{ webhook_url: WEBHOOK_URL, events: MP_EVENTS }],
      });
      if (c.ok) out.messaging_profile = { id: c.data.data.id, name: c.data.data.name, created: true };
      else out.errors.push({ step: "messaging_profile", status: c.status, detail: errMsg(c.data), errors: c.data?.errors });
    }

    // ── 2. Call Control Application ──
    const appList = await telnyx("/call_control_applications?page[size]=50", "GET", apiKey);
    const existingApp = (appList.data?.data || []).find((a) => (a.application_name || a.name) === APP_NAME);
    if (existingApp) {
      const currentWh = existingApp.webhook_event_url || existingApp.webhook_url;
      if (currentWh !== WEBHOOK_URL) {
        await telnyx(`/call_control_applications/${existingApp.id}`, "PATCH", apiKey, { webhook_event_url: WEBHOOK_URL });
      }
      out.call_control_app = { id: existingApp.id, name: APP_NAME, reused: true, webhook: WEBHOOK_URL, webhook_updated: currentWh !== WEBHOOK_URL };
    } else {
      const c = await telnyx("/call_control_applications", "POST", apiKey, {
        application_name: APP_NAME,
        webhook_event_url: WEBHOOK_URL,
      });
      if (c.ok) out.call_control_app = { id: c.data.data.id, name: APP_NAME, created: true };
      else out.errors.push({ step: "call_control_app", status: c.status, detail: errMsg(c.data), errors: c.data?.errors });
    }

    // ── 3. Link toll-free number to messaging profile ──
    if (out.messaging_profile) {
      const link = await telnyx(`/messaging_phone_numbers/${encodeURIComponent(TOLLFREE)}`, "PATCH", apiKey, {
        messaging_profile_id: out.messaging_profile.id,
      });
      if (link.ok) out.number_link = { number: TOLLFREE, messaging_profile_id: out.messaging_profile.id, linked: true };
      else out.errors.push({ step: "number_link", status: link.status, detail: errMsg(link.data), errors: link.data?.errors });
    }

    return Response.json({ status: out.errors.length ? "partial" : "provisioned", ...out });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Provisions Telnyx resources programmatically so the CaaS gateway is fully wired:
//   1. Messaging Profile (SMS/MMS) → webhook = telnyxWebhook endpoint
//   2. Call Control Application (Voice) → webhook = telnyxWebhook endpoint
//   3. For every toll-free number: link to messaging profile (SMS/MMS) AND
//      assign to the call control app (voice inbound) via connection_id.
// Voice assignment needs the phone-number record id (not E.164), resolved via the slim list.
// Idempotent by name — re-runs reuse/sync existing resources instead of duplicating.
const TELNYX = "https://api.telnyx.com/v2";
const WEBHOOK_URL = "https://xtreme-comms.base44.app/functions/telnyxWebhook";
const MP_NAME = "XTREME COMMS Messaging";
const APP_NAME = "XTREME COMMS Voice";
const NUMBERS = ["+18334843799", "+18337001239"];
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

function isTenantNotActivated(d) {
  const msg = (errMsg(d) || "").toLowerCase();
  return msg.includes("tenant") && msg.includes("not found");
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });

    const out = { webhook_url: WEBHOOK_URL, messaging_profile: null, call_control_app: null, numbers: [], errors: [] };

    // ── 1. Messaging Profile ──
    const mpList = await telnyx("/messaging_profiles?page[size]=50", "GET", apiKey);
    if (!mpList.ok && isTenantNotActivated(mpList.data)) {
      return Response.json({
        status: "tenant_not_activated",
        error: errMsg(mpList.data),
        action_required: "Contact Xtreme Communications support to activate your tenant account on the Telnyx platform. The API key is valid but the tenant entity has not been provisioned yet.",
      }, { status: 403 });
    }
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
        name: MP_NAME, enabled: true,
        whitelisted_destinations: ["US", "CA"],
        webhooks: [{ webhook_url: WEBHOOK_URL, events: MP_EVENTS }],
      });
      if (c.ok) out.messaging_profile = { id: c.data.data.id, name: c.data.data.name, created: true };
      else { out.errors.push({ step: "messaging_profile", status: c.status, detail: errMsg(c.data) }); return Response.json({ status: "partial", ...out }); }
    }

    // ── 2. Call Control Application ──
    const appList = await telnyx("/call_control_applications?page[size]=50", "GET", apiKey);
    const existingApp = (appList.data?.data || []).find((a) => (a.application_name || a.name) === APP_NAME);
    let appId = null;
    if (existingApp) {
      const currentWh = existingApp.webhook_event_url || existingApp.webhook_url;
      if (currentWh !== WEBHOOK_URL) {
        await telnyx(`/call_control_applications/${existingApp.id}`, "PATCH", apiKey, { webhook_event_url: WEBHOOK_URL });
      }
      appId = existingApp.id;
      out.call_control_app = { id: appId, name: APP_NAME, reused: true, webhook: WEBHOOK_URL, webhook_updated: currentWh !== WEBHOOK_URL };
    } else {
      const c = await telnyx("/call_control_applications", "POST", apiKey, {
        application_name: APP_NAME, webhook_event_url: WEBHOOK_URL,
      });
      if (c.ok) { appId = c.data.data.id; out.call_control_app = { id: appId, name: APP_NAME, created: true }; }
      else { out.errors.push({ step: "call_control_app", status: c.status, detail: errMsg(c.data) }); return Response.json({ status: "partial", ...out }); }
    }

    // ── 3. Resolve phone-number record ids (voice PATCH needs id, not E.164) ──
    const slim = await telnyx("/phone_numbers/slim?page[size]=100", "GET", apiKey);
    const idByNumber = new Map((slim.data?.data || []).map((p) => [p.phone_number, p.id]));

    // ── 4. Wire every number: messaging profile (SMS/MMS) + call control app (voice) ──
    for (const num of NUMBERS) {
      const enc = encodeURIComponent(num);
      const entry = { number: num, sms: null, voice: null };

      const link = await telnyx(`/messaging_phone_numbers/${enc}`, "PATCH", apiKey, {
        messaging_profile_id: out.messaging_profile.id,
      });
      entry.sms = link.ok ? { linked: true, messaging_profile_id: out.messaging_profile.id }
        : { linked: false, error: errMsg(link.data) };
      if (!link.ok) out.errors.push({ step: "number_link_sms", number: num, status: link.status, detail: errMsg(link.data) });

      const recordId = idByNumber.get(num);
      if (!recordId) {
        entry.voice = { assigned: false, error: "phone number record not found in Telnyx account" };
        out.errors.push({ step: "number_assign_voice", number: num, detail: "record not found in Telnyx account" });
      } else {
        const assign = await telnyx(`/phone_numbers/${recordId}`, "PATCH", apiKey, { connection_id: appId });
        entry.voice = assign.ok ? { assigned: true, connection_id: appId, record_id: recordId }
          : { assigned: false, error: errMsg(assign.data) };
        if (!assign.ok) out.errors.push({ step: "number_assign_voice", number: num, status: assign.status, detail: errMsg(assign.data) });
      }

      out.numbers.push(entry);
    }

    return Response.json({ status: out.errors.length ? "partial" : "provisioned", ...out });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
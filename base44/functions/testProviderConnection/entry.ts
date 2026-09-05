import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const provider = body.provider || {};
    const type = provider.type;
    if (!type) return Response.json({ status: "invalid", detail: "provider type required" }, { status: 400 });

    const t0 = Date.now();
    let result = { status: "credentials_required", detail: "", latency_ms: 0, verified: false };

    const basic = (user, pass) => "Basic " + btoa(`${user}:${pass}`);

    if (type === "twilio") {
      const sid = secrets.get("TWILIO_ACCOUNT_SID");
      const token = secrets.get("TWILIO_AUTH_TOKEN");
      if (!sid || !token) { result.detail = "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in Secrets"; }
      else {
        try {
          const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: basic(sid, token) } });
          if (r.ok) { const j = await r.json(); result = { status: "connected", detail: `account ${j.friendly_name || sid}`, latency_ms: Date.now() - t0, verified: true }; }
          else { const t = await r.text(); result = { status: "error", detail: `Twilio ${r.status}: ${t.slice(0, 140)}`, latency_ms: Date.now() - t0, verified: false }; }
        } catch (e) { result = { status: "error", detail: String(e), latency_ms: Date.now() - t0, verified: false }; }
      }
    } else if (type === "telnyx") {
      const key = secrets.get("TELNYX_API_KEY");
      if (!key) { result.detail = "Set TELNYX_API_KEY in Secrets"; }
      else {
        try {
          const r = await fetch("https://api.telnyx.com/v2/phone_numbers?limit=1", { headers: { Authorization: `Bearer ${key}` } });
          if (r.ok) { result = { status: "connected", detail: "telnyx api reachable", latency_ms: Date.now() - t0, verified: true }; }
          else { const t = await r.text(); result = { status: "error", detail: `Telnyx ${r.status}: ${t.slice(0, 140)}`, latency_ms: Date.now() - t0, verified: false }; }
        } catch (e) { result = { status: "error", detail: String(e), latency_ms: Date.now() - t0, verified: false }; }
      }
    } else if (type === "plivo") {
      const authId = secrets.get("PLIVO_AUTH_ID");
      const authToken = secrets.get("PLIVO_AUTH_TOKEN");
      if (!authId || !authToken) { result.detail = "Set PLIVO_AUTH_ID + PLIVO_AUTH_TOKEN in Secrets"; }
      else {
        try {
          const r = await fetch(`https://api.plivo.com/v1/Account/${authId}/`, { headers: { Authorization: basic(authId, authToken) } });
          if (r.ok) { result = { status: "connected", detail: `plivo account ${authId}`, latency_ms: Date.now() - t0, verified: true }; }
          else { const t = await r.text(); result = { status: "error", detail: `Plivo ${r.status}: ${t.slice(0, 140)}`, latency_ms: Date.now() - t0, verified: false }; }
        } catch (e) { result = { status: "error", detail: String(e), latency_ms: Date.now() - t0, verified: false }; }
      }
    } else if (type === "vonage") {
      const apiKey = secrets.get("VONAGE_API_KEY");
      const apiSecret = secrets.get("VONAGE_API_SECRET");
      if (!apiKey || !apiSecret) { result.detail = "Set VONAGE_API_KEY + VONAGE_API_SECRET in Secrets"; }
      else {
        try {
          const r = await fetch(`https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`);
          if (r.ok) { const j = await r.json(); result = { status: "connected", detail: `vonage balance ${j.value ?? j.balance ?? "ok"}`, latency_ms: Date.now() - t0, verified: true }; }
          else { const t = await r.text(); result = { status: "error", detail: `Vonage ${r.status}: ${t.slice(0, 140)}`, latency_ms: Date.now() - t0, verified: false }; }
        } catch (e) { result = { status: "error", detail: String(e), latency_ms: Date.now() - t0, verified: false }; }
      }
    } else {
      result = { status: "unsupported", detail: `no live verification path for type ${type}; configure adapter`, latency_ms: 0, verified: false };
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ status: "error", detail: error.message }, { status: 500 });
  }
}
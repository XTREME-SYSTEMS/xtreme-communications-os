import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// SIP Trunking / BYOC gateway — provisions and manages Telnyx SIP trunks + connections.
// Actions: create_trunk, list_trunks, create_connection, list_connections, assign_number.
// Real Telnyx API v2 calls via TELNYX_API_KEY. Surfaces credentials_required when unset.
async function telnyx(path, method, key, body) {
  const res = await fetch(`https://api.telnyx.com/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}
function errMsg(d) { return d?.errors?.[0]?.detail || d?.errors?.[0]?.title || d?.message || "unknown"; }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const key = keys[0];
    const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    if (!tenant || tenant.status !== "active") return Response.json({ error: "tenant not active" }, { status: 403 });

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return Response.json({ status: "credentials_required", error: "TELNYX_API_KEY not configured" }, { status: 503 });

    const action = body.action || "list_trunks";

    // ── CREATE SIP TRUNK (IP auth) ──
    if (action === "create_trunk") {
      const res = await telnyx("/ip_connections", "POST", telnyxKey, {
        name: body.name || `${tenant.name} SIP Trunk`,
        transport: body.transport || "UDP",
        inbound: { ip_notifications_endpoint: body.webhook_url || `https://xtreme-comms.base44.app/functions/telnyxWebhook` },
        outbound: { host: body.host || null, port: body.port || 5060 },
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const trunk = await base44.asServiceRole.entities.SipTrunk.create({
        tenant_id: tenant.id, name: body.name || `${tenant.name} SIP Trunk`,
        host: body.host || "", port: body.port || 5060,
        transport: body.transport || "UDP", type: "bidirectional",
        status: "connected", enabled: true, provider_id: res.data.data?.id,
      });
      return Response.json({ trunk_id: trunk.id, connection_id: res.data.data?.id, status: "connected", classification: "LIVE", provider: "telnyx" });
    }

    // ── LIST TRUNKS ──
    if (action === "list_trunks") {
      const res = await telnyx("/ip_connections?page[size]=50", "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const trunks = (res.data.data || []).map((t) => ({
        id: t.id, name: t.name, transport: t.transport, status: t.status || "active",
      }));
      return Response.json({ count: trunks.length, trunks, classification: "LIVE", provider: "telnyx" });
    }

    // ── CREATE CONNECTION (credential auth) ──
    if (action === "create_connection") {
      const res = await telnyx("/credential_connections", "POST", telnyxKey, {
        name: body.name || `${tenant.name} Credential Connection`,
        user_name: body.username, password: body.password,
        sip_server: { host: body.host || null, port: body.port || 5060 },
        transport: body.transport || "UDP",
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      return Response.json({ connection_id: res.data.data?.id, status: "created", classification: "LIVE", provider: "telnyx" });
    }

    // ── LIST CONNECTIONS ──
    if (action === "list_connections") {
      const res = await telnyx("/credential_connection?page[size]=50", "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const conns = (res.data.data || []).map((c) => ({
        id: c.id, name: c.name, transport: c.transport, status: c.status || "active",
      }));
      return Response.json({ count: conns.length, connections: conns, classification: "LIVE", provider: "telnyx" });
    }

    // ── ASSIGN NUMBER to trunk ──
    if (action === "assign_number") {
      const res = await telnyx("/phone_numbers/slim?page[size]=100", "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const record = (res.data.data || []).find((p) => p.phone_number === body.e164);
      if (!record) return Response.json({ error: "number not found in Telnyx account" }, { status: 404 });
      const assign = await telnyx(`/phone_numbers/${record.id}`, "PATCH", telnyxKey, {
        connection_id: body.connection_id,
      });
      if (!assign.ok) return Response.json({ status: "failed", error: errMsg(assign.data) }, { status: assign.status });
      return Response.json({ e164: body.e164, connection_id: body.connection_id, status: "assigned", classification: "LIVE" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
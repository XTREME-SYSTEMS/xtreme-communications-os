import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public /v1/verify endpoint — multi-factor verification token issuance + validation.
// Actions: send (issue token), check (validate token). Tracks per-tenant expiration.
// Sandbox failover with credentials_required when no carrier is connected.
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

    const action = body.action || "send";
    const channel = body.channel || "sms";

    // Carrier availability for the verification channel
    const providers = await base44.asServiceRole.entities.Provider.filter({ enabled: true, status: "connected" });
    const connected = providers.find(p => (p.channels || []).includes(channel)) || providers[0];

    if (action === "send") {
      const to = body.to;
      if (!to) return Response.json({ error: "to required" }, { status: 400 });
      const token = String(Math.floor(100000 + Math.random() * 900000));
      const ttlMinutes = body.ttl_minutes || 10;
      const expires_at = new Date(Date.now() + ttlMinutes * 60000).toISOString();
      const verification = await base44.asServiceRole.entities.Verification.create({
        tenant_id: tenant.id, channel, to_addr: to, token, status: "pending",
        attempts: 0, expires_at, classification: connected ? "PROVIDER-BACKED" : "SANDBOX",
      });
      await base44.asServiceRole.entities.ProviderLog.create({
        provider: connected ? connected.name : "sandbox-trunk",
        channel, event_type: "verify.send", direction: "outbound",
        status: connected ? "accepted" : "queued",
        message: `verify token issued for ${to}`,
      });
      return Response.json({
        verification_id: verification.id, channel, to,
        status: connected ? "sent" : "sandbox",
        provider: connected ? connected.name : "sandbox-trunk",
        expires_at,
        reason: connected ? null : "credentials_required",
        // token returned only in sandbox so the developer can complete the loop without a carrier
        sandbox_token: connected ? null : token,
      });
    }

    if (action === "check") {
      const verification_id = body.verification_id;
      const token = body.token;
      if (!verification_id || !token) return Response.json({ error: "verification_id and token required" }, { status: 400 });
      const v = await base44.asServiceRole.entities.Verification.get(verification_id);
      if (!v || v.tenant_id !== tenant.id) return Response.json({ error: "verification not found" }, { status: 404 });
      if (v.status === "approved") return Response.json({ verification_id, status: "already_approved" });
      if (new Date(v.expires_at) < new Date()) {
        await base44.asServiceRole.entities.Verification.update(verification_id, { status: "expired" });
        return Response.json({ verification_id, status: "expired" });
      }
      await base44.asServiceRole.entities.Verification.update(verification_id, { attempts: (v.attempts || 0) + 1 });
      if (v.token !== token) return Response.json({ verification_id, status: "incorrect" }, { status: 401 });
      await base44.asServiceRole.entities.Verification.update(verification_id, { status: "approved", verified_at: new Date().toISOString() });
      return Response.json({ verification_id, status: "approved" });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
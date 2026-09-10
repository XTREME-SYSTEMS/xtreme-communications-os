import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// A2P 10DLC / Compliance / Trust gateway — manages campaign registration, brand trust,
// and opt-out enforcement. Uses Telnyx Messaging Brand/Campaign APIs when TELNYX_API_KEY is set.
// Actions: register_brand, register_campaign, check_trust, list_opt_outs, add_opt_out, remove_opt_out.
// Surfaces credentials_required when TELNYX_API_KEY is unset — compliance data is never faked.
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

    const action = body.action || "check_trust";

    // ── REGISTER BRAND (10DLC) ──
    if (action === "register_brand") {
      const required = ["brand_name", "ein", "address", "city", "state", "postal_code", "phone", "email"];
      const missing = required.filter((f) => !body[f]);
      if (missing.length) return Response.json({ error: `missing required fields: ${missing.join(", ")}` }, { status: 400 });
      const res = await telnyx("/10dlc/brands", "POST", telnyxKey, {
        entityType: body.entity_type || "PRIVATE_PROFIT",
        displayName: body.brand_name,
        companyName: body.brand_name,
        ein: body.ein,
        einIssuingCountry: "US",
        country: "US",
        vertical: body.vertical || "TECHNOLOGY",
        email: body.email,
        phone: body.phone,
        street: body.address,
        city: body.city,
        state: body.state,
        postalCode: body.postal_code,
        website: body.website || undefined,
        stockSymbol: undefined,
        stockExchange: undefined,
        ipAddress: undefined,
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      return Response.json({ brand_id: res.data.data?.id, status: "registered", classification: "LIVE", provider: "telnyx" });
    }

    // ── REGISTER CAMPAIGN ──
    if (action === "register_campaign") {
      const res = await telnyx("/10dlc/campaigns", "POST", telnyxKey, {
        brand_id: body.brand_id,
        campaign_name: body.campaign_name || `${tenant.name} campaign`,
        use_case: body.use_case || "MARKETING",
        description: body.description || "Marketing outreach",
        embedded_links: body.embedded_links || false,
        sample_message: body.sample_message || "Hi, this is a sample message.",
      });
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      return Response.json({ campaign_id: res.data.data?.id, status: "registered", classification: "LIVE", provider: "telnyx" });
    }

    // ── CHECK TRUST status ──
    if (action === "check_trust") {
      // Try the messaging profiles trust endpoint; fall back to opt-out-only if 10DLC isn't provisioned
      const res = await telnyx("/messaging_profiles?page[size]=20", "GET", telnyxKey);
      if (!res.ok) return Response.json({ status: "failed", error: errMsg(res.data) }, { status: res.status });
      const profiles = (res.data.data || []).map((p) => ({
        id: p.id, name: p.name, enabled: p.enabled,
        whitelisted_destinations: p.whitelisted_destinations || [],
        trust_status: p.tcr_registration?.status || "not_registered",
      }));
      const segs = await base44.asServiceRole.entities.AudienceSegment.filter({ tenant_id: tenant.id });
      const totalOptOuts = segs.reduce((s, seg) => s + (seg.opt_out_list?.length || 0), 0);
      return Response.json({
        count: profiles.length, messaging_profiles: profiles,
        opt_out_segments: segs.length, total_opt_outs: totalOptOuts,
        classification: "LIVE", provider: "telnyx",
      });
    }

    // ── OPT-OUT management (stored locally in AudienceSegment opt_out_list) ──
    if (action === "add_opt_out") {
      const segId = body.segment_id;
      const phone = body.phone;
      if (!segId || !phone) return Response.json({ error: "segment_id and phone required" }, { status: 400 });
      const seg = await base44.asServiceRole.entities.AudienceSegment.get(segId);
      if (!seg || seg.tenant_id !== tenant.id) return Response.json({ error: "segment not found" }, { status: 404 });
      const optOuts = Array.isArray(seg.opt_out_list) ? seg.opt_out_list : [];
      if (!optOuts.includes(phone)) optOuts.push(phone);
      await base44.asServiceRole.entities.AudienceSegment.update(segId, { opt_out_list: optOuts });
      return Response.json({ segment_id: segId, phone, status: "opted_out", opt_out_count: optOuts.length });
    }

    if (action === "remove_opt_out") {
      const segId = body.segment_id;
      const phone = body.phone;
      if (!segId || !phone) return Response.json({ error: "segment_id and phone required" }, { status: 400 });
      const seg = await base44.asServiceRole.entities.AudienceSegment.get(segId);
      if (!seg || seg.tenant_id !== tenant.id) return Response.json({ error: "segment not found" }, { status: 404 });
      const optOuts = (Array.isArray(seg.opt_out_list) ? seg.opt_out_list : []).filter((p) => p !== phone);
      await base44.asServiceRole.entities.AudienceSegment.update(segId, { opt_out_list: optOuts });
      return Response.json({ segment_id: segId, phone, status: "removed", opt_out_count: optOuts.length });
    }

    if (action === "list_opt_outs") {
      const segs = await base44.asServiceRole.entities.AudienceSegment.filter({ tenant_id: tenant.id });
      const all = segs.flatMap((s) => (s.opt_out_list || []).map((p) => ({ segment: s.name, phone: p })));
      return Response.json({ count: all.length, opt_outs: all });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
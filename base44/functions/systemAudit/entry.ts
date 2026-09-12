import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { sendTelnyx, getTelnyxEndpoint, buildTelnyxPayload, extractDeliveryStatus } from '../../shared/telnyxMessaging.ts';

// ─── SYSTEM AUDIT ENGINE ──────────────────────────────────────────
// Programmatically audits the entire XTREME Communications OS:
// - Telnyx numbers, messaging profiles, 10DLC, toll-free verification
// - Twilio numbers and capabilities
// - SMS/Voice/WhatsApp/MMS channel readiness
// - Real delivery tests to a target number
// - Logs all findings to AuditFinding entity for tracking

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "full_audit";
    const testNumber = body.test_number || "+17722090266";

    // ═══ FULL AUDIT ════════════════════════════════════════════════
    if (action === "full_audit") {
      const audit: any = {
        timestamp: new Date().toISOString(),
        test_number: testNumber,
        telnyx: { numbers: [], messaging_profiles: [], tenDLC_brands: [], tollfree_verifications: [] },
        twilio: { numbers: [], account_sid: process.env.TWILIO_ACCOUNT_SID?.slice(0, 8) + "..." },
        channel_status: { voice: false, sms: false, mms: false, whatsapp: false, email: false, ai_gateway: false, cloud_browser: false },
        delivery_tests: [],
        findings: [],
        summary: { total_numbers: 0, working_numbers: 0, blocked_numbers: 0, issues: 0, critical_issues: 0 },
      };

      // ── 1. AUDIT TELNYX ──
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (telnyxKey) {
        // Numbers
        const numRes = await fetch("https://api.telnyx.com/v2/phone_numbers?status=active", {
          headers: { Authorization: `Bearer ${telnyxKey}` },
        });
        const numData = await numRes.json();
        audit.telnyx.numbers = (numData.data || []).map((n: any) => ({
          phone_number: n.phone_number,
          status: n.status,
          messaging_profile_id: n.messaging_profile_id,
          features: n.features,
          connection_id: n.connection_id,
        }));

        // Messaging profiles
        const mpRes = await fetch("https://api.telnyx.com/v2/messaging_profiles?status=active", {
          headers: { Authorization: `Bearer ${telnyxKey}` },
        });
        const mpData = await mpRes.json();
        audit.telnyx.messaging_profiles = (mpData.data || []).map((p: any) => ({
          id: p.id, name: p.name, enabled: p.enabled,
          whatsapp_business_account_id: p.whatsapp_business_account_id,
        }));

        // 10DLC brands
        try {
          const brandRes = await fetch("https://api.telnyx.com/v2/10dlc/brand", {
            headers: { Authorization: `Bearer ${telnyxKey}` },
          });
          const brandData = await brandRes.json();
          audit.telnyx.tenDLC_brands = (brandData.data?.records || []).map((b: any) => ({
            brandId: b.brandId, tcrBrandId: b.tcrBrandId,
            companyName: b.companyName, displayName: b.displayName,
            identityStatus: b.identityStatus, status: b.status,
            assignedCampaignsCount: b.assignedCampaignsCount,
          }));
        } catch (e) { audit.telnyx.tenDLC_brands = [{ error: e.message }]; }

        // Toll-free verifications — try multiple endpoints
        try {
          const tfRes = await fetch("https://api.telnyx.com/v2/tollFreeVerification/requests", {
            headers: { Authorization: `Bearer ${telnyxKey}` },
          });
          if (tfRes.ok) {
            const tfData = await tfRes.json();
            audit.telnyx.tollfree_verifications = (tfData.data || []).map((v: any) => ({
              id: v.id, phone_number: v.phone_number, status: v.status,
              business_name: v.business_name,
            }));
          }
        } catch (e) { /* endpoint may vary */ }

        // Delivery tests from each Telnyx number
        for (const num of audit.telnyx.numbers) {
          if (!num.messaging_profile_id) {
            audit.delivery_tests.push({
              from: num.phone_number, to: testNumber,
              status: "skipped", reason: "no messaging profile",
            });
            continue;
          }
          try {
            const payload = buildTelnyxPayload("sms", { from: num.phone_number, to: testNumber, text: `Audit test from ${num.phone_number}` });
            const result = await sendTelnyx(telnyxKey, getTelnyxEndpoint("sms"), payload);
            const msgId = result.data?.data?.id;
            let delivery = extractDeliveryStatus(result.data);

            if (result.ok && msgId && delivery.to_status === "queued") {
              await new Promise(r => setTimeout(r, 4000));
              try {
                const statusRes = await fetch(`https://api.telnyx.com/v2/messages/${msgId}`, {
                  headers: { Authorization: `Bearer ${telnyxKey}` },
                });
                const statusData = await statusRes.json();
                delivery = extractDeliveryStatus(statusData);
              } catch (_) {}
            }

            audit.delivery_tests.push({
              from: num.phone_number, to: testNumber,
              accepted: result.ok, message_id: msgId,
              delivery_status: delivery.to_status,
              delivered: delivery.delivered && delivery.to_status !== "delivery_failed",
              error_code: delivery.error_code,
              error_detail: delivery.error_detail,
            });
          } catch (e: any) {
            audit.delivery_tests.push({ from: num.phone_number, to: testNumber, status: "error", error: e.message });
          }
        }
      }

      // ── 2. AUDIT TWILIO ──
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      if (twilioSid && twilioToken) {
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const tNumRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json?PageSize=50`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        const tNumData = await tNumRes.json();
        audit.twilio.numbers = (tNumData.incoming_phone_numbers || []).map((n: any) => ({
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          capabilities: n.capabilities,
          status: n.status,
        }));
      }

      // ── 3. CHANNEL STATUS ──
      audit.channel_status.voice = !!telnyxKey;
      audit.channel_status.sms = audit.delivery_tests.some(t => t.delivered);
      audit.channel_status.ai_gateway = !!process.env.VERCEL_AI_GATEWAY_API_KEY;
      audit.channel_status.cloud_browser = !!process.env.BROWSERBASE_API_KEY;
      audit.channel_status.email = false; // blocked by credit exhaustion

      // ── 4. GENERATE FINDINGS ──
      // Numbers without messaging profiles
      for (const num of audit.telnyx.numbers) {
        if (!num.messaging_profile_id) {
          audit.findings.push({
            severity: "high",
            area: `telnyx.number.${num.phone_number}`,
            finding: `${num.phone_number} has no messaging profile assigned — cannot send SMS/MMS`,
            recommendation: `Assign messaging profile via PATCH /v2/messaging_phone_numbers/${num.phone_number}`,
            status: "open",
          });
        }
      }

      // Delivery failures
      for (const test of audit.delivery_tests) {
        if (test.accepted && !test.delivered && test.delivery_status !== "queued") {
          audit.findings.push({
            severity: test.error_code === "40329" ? "critical" : "high",
            area: `telnyx.delivery.${test.from}`,
            finding: `SMS from ${test.from} to ${test.to} failed: ${test.delivery_status} (error ${test.error_code})`,
            recommendation: test.error_code === "40329"
              ? "Submit toll-free verification in Telnyx Dashboard → Messaging → Toll-Free Verification"
              : test.error_code === "40010"
              ? "Register 10DLC campaign for this number's brand"
              : "Check carrier filtering or number reputation",
            status: "open",
          });
        }
        if (test.delivered) {
          audit.findings.push({
            severity: "info",
            area: `telnyx.delivery.${test.from}`,
            finding: `SMS from ${test.from} delivered successfully to ${test.to}`,
            recommendation: "No action needed — this number is operational for SMS",
            status: "remediated",
          });
        }
      }

      // 10DLC brands without campaigns
      for (const brand of audit.telnyx.tenDLC_brands) {
        if (brand.assignedCampaignsCount === 0 && brand.identityStatus !== "VERIFIED") {
          audit.findings.push({
            severity: "medium",
            area: `telnyx.10dlc.${brand.tcrBrandId}`,
            finding: `10DLC brand "${brand.displayName}" (${brand.tcrBrandId}) is ${brand.identityStatus} with no campaigns`,
            recommendation: "Verify brand identity and create campaign in Telnyx Dashboard → 10DLC → Campaigns",
            status: "open",
          });
        }
      }

      // Toll-free numbers without verification
      const tollfreeNums = audit.telnyx.numbers.filter(n => n.phone_number?.startsWith("+1833") || n.phone_number?.startsWith("+1800") || n.phone_number?.startsWith("+1888"));
      for (const num of tollfreeNums) {
        const verified = audit.telnyx.tollfree_verifications.some(v => v.phone_number === num.phone_number && v.status === "verified");
        if (!verified) {
          audit.findings.push({
            severity: "critical",
            area: `telnyx.tollfree.${num.phone_number}`,
            finding: `Toll-free number ${num.phone_number} is not verified — carriers will block SMS delivery`,
            recommendation: "Submit toll-free verification in Telnyx Dashboard → Messaging → Toll-Free Verification (2-5 business days)",
            status: "open",
          });
        }
      }

      // Channel gaps
      if (!audit.channel_status.sms) {
        audit.findings.push({
          severity: "critical",
          area: "channel.sms",
          finding: "No Telnyx numbers can deliver SMS — all delivery tests failed",
          recommendation: "Submit toll-free verification for 1833 numbers + register 10DLC campaigns for 954 numbers",
          status: "open",
        });
      }
      if (!audit.channel_status.email) {
        audit.findings.push({
          severity: "medium",
          area: "channel.email",
          finding: "Email channel disabled — platform credits exhausted until 2026-09-12",
          recommendation: "Wait for credit renewal or configure external SMTP",
          status: "open",
        });
      }

      // ── 5. SAVE FINDINGS TO DATABASE ──
      try {
        // Clear old open findings for fresh audit
        await base44.asServiceRole.entities.AuditFinding.deleteMany({ status: "open" });
        // Insert new findings
        if (audit.findings.length > 0) {
          await base44.asServiceRole.entities.AuditFinding.bulkCreate(
            audit.findings.map(f => ({ ...f, area: f.area, finding: f.finding, recommendation: f.recommendation, status: f.status, severity: f.severity }))
          );
        }
      } catch (e) { /* DB save optional */ }

      // ── 6. SUMMARY ──
      audit.summary.total_numbers = audit.telnyx.numbers.length + audit.twilio.numbers.length;
      audit.summary.working_numbers = audit.delivery_tests.filter(t => t.delivered).length;
      audit.summary.blocked_numbers = audit.delivery_tests.filter(t => t.accepted && !t.delivered).length;
      audit.summary.issues = audit.findings.filter(f => f.status === "open").length;
      audit.summary.critical_issues = audit.findings.filter(f => f.severity === "critical" && f.status === "open").length;

      return Response.json({ action: "full_audit", audit });
    }

    // ═══ FIX MESSAGING PROFILES ════════════════════════════════════
    if (action === "fix_messaging_profiles") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });

      // Get active messaging profile
      const mpRes = await fetch("https://api.telnyx.com/v2/messaging_profiles?status=active", {
        headers: { Authorization: `Bearer ${telnyxKey}` },
      });
      const mpData = await mpRes.json();
      const profileId = mpData.data?.[0]?.id;
      if (!profileId) return Response.json({ error: "No active messaging profile found" }, { status: 400 });

      // Get all numbers
      const numRes = await fetch("https://api.telnyx.com/v2/phone_numbers?status=active", {
        headers: { Authorization: `Bearer ${telnyxKey}` },
      });
      const numData = await numRes.json();
      const numbers = numData.data || [];

      const fixes = [];
      for (const num of numbers) {
        if (!num.messaging_profile_id) {
          const res = await fetch(`https://api.telnyx.com/v2/messaging_phone_numbers/${encodeURIComponent(num.phone_number)}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_profile_id: profileId }),
          });
          const data = await res.json();
          fixes.push({
            number: num.phone_number,
            fixed: res.ok,
            messaging_profile_id: data.data?.messaging_profile_id,
            error: data.errors?.[0]?.detail?.slice(0, 100),
          });
        }
      }
      return Response.json({ action: "fix_messaging_profiles", profile_id: profileId, fixes });
    }

    // ═══ TEST SMS DELIVERY ══════════════════════════════════════════
    if (action === "test_sms") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });
      const { from_number } = body;
      if (!from_number) return Response.json({ error: "from_number required" }, { status: 400 });

      const payload = buildTelnyxPayload("sms", { from: from_number, to: testNumber, text: `📱 XTREME audit test from ${from_number}` });
      const result = await sendTelnyx(telnyxKey, getTelnyxEndpoint("sms"), payload);
      const msgId = result.data?.data?.id;
      let delivery = extractDeliveryStatus(result.data);

      if (result.ok && msgId && delivery.to_status === "queued") {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const statusRes = await fetch(`https://api.telnyx.com/v2/messages/${msgId}`, {
            headers: { Authorization: `Bearer ${telnyxKey}` },
          });
          const statusData = await statusRes.json();
          delivery = extractDeliveryStatus(statusData);
        } catch (_) {}
      }

      return Response.json({
        action: "test_sms", from: from_number, to: testNumber,
        accepted: result.ok, message_id: msgId,
        delivery_status: delivery.to_status,
        delivered: delivery.delivered && delivery.to_status !== "delivery_failed",
        error_code: delivery.error_code, error_detail: delivery.error_detail,
      });
    }

    // ═══ GET SAVED FINDINGS ═════════════════════════════════════════
    if (action === "get_findings") {
      const findings = await base44.asServiceRole.entities.AuditFinding.list("-created_date", 200);
      return Response.json({ action: "get_findings", findings });
    }

    // ═══ UPDATE FINDING STATUS ══════════════════════════════════════
    if (action === "update_finding") {
      const { finding_id, status } = body;
      if (!finding_id || !status) return Response.json({ error: "finding_id and status required" }, { status: 400 });
      const updated = await base44.asServiceRole.entities.AuditFinding.update(finding_id, { status });
      return Response.json({ action: "update_finding", updated });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
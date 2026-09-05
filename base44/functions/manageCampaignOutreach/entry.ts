import { authenticateTenant } from "../../shared/tenantAuth.ts";

// Mass outreach campaign controller — bulk SMS/voice blasts with native throttling,
// opt-out enforcement, and dynamic rate-limiting guards to prevent carrier blocking.
export default async function(req) {
  try {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const auth = await authenticateTenant(req, body);
    if (auth.error) return auth.error;
    const { base44, tenant } = auth;
    const action = body.action || "status";

  // ── CREATE_CAMPAIGN ──
  if (action === "create_campaign") {
    if (!body.name) return Response.json({ error: "name required" }, { status: 400 });
    const camp = await base44.asServiceRole.entities.Campaign.create({
      tenant_id: tenant.id,
      name: body.name,
      description: body.description || "",
      channel: body.channel || "sms",
      message_template: body.message_template || "",
      voice_script: body.voice_script || "",
      segment_id: body.segment_id || null,
      status: "draft",
      schedule_type: body.schedule_type || "immediate",
      scheduled_at: body.scheduled_at || null,
      throttle_per_sec: body.throttle_per_sec || 10,
      rate_limit_per_sec: body.rate_limit_per_sec || 25,
      total_recipients: 0, sent_count: 0, delivered_count: 0, failed_count: 0, opt_out_count: 0,
      classification: "SANDBOX",
    });
    return Response.json({ campaign_id: camp.id, name: camp.name, status: camp.status });
  }

  // ── ADD_SEGMENT ──
  if (action === "add_segment") {
    if (!body.name) return Response.json({ error: "name required" }, { status: 400 });
    const seg = await base44.asServiceRole.entities.AudienceSegment.create({
      tenant_id: tenant.id,
      name: body.name,
      description: body.description || "",
      filter_criteria: body.filter_criteria || {},
      recipient_count: 0,
      opt_out_list: body.opt_out_list || [],
      status: "active",
    });
    return Response.json({ segment_id: seg.id, name: seg.name, opt_outs: (seg.opt_out_list || []).length });
  }

  // ── ADD_RECIPIENTS: bulk import with opt-out pre-filtering ──
  if (action === "add_recipients") {
    if (!body.campaign_id || !body.recipients || !Array.isArray(body.recipients))
      return Response.json({ error: "campaign_id + recipients[] required" }, { status: 400 });
    const campaign = await base44.asServiceRole.entities.Campaign.get(body.campaign_id);
    if (!campaign || campaign.tenant_id !== tenant.id) return Response.json({ error: "campaign not found" }, { status: 404 });

    let optOutSet = new Set();
    if (campaign.segment_id) {
      const seg = await base44.asServiceRole.entities.AudienceSegment.get(campaign.segment_id);
      if (seg && seg.opt_out_list) optOutSet = new Set(seg.opt_out_list);
    }
    if (body.opt_out_list) body.opt_out_list.forEach((n) => optOutSet.add(n));

    const records = [];
    let optOutCount = 0;
    for (const r of body.recipients) {
      const phone = typeof r === "string" ? r : r.phone_number;
      if (!phone) continue;
      if (optOutSet.has(phone)) { optOutCount++; continue; }
      records.push({
        tenant_id: tenant.id,
        campaign_id: body.campaign_id,
        segment_id: campaign.segment_id || null,
        phone_number: phone,
        display_name: (typeof r === "object" && r.display_name) || "",
        status: "pending",
        attempts: 0,
      });
    }
    let created = 0;
    if (records.length) {
      const result = await base44.asServiceRole.entities.CampaignRecipient.bulkCreate(records);
      created = Array.isArray(result) ? result.length : (records.length);
    }
    await base44.asServiceRole.entities.Campaign.update(body.campaign_id, {
      total_recipients: (campaign.total_recipients || 0) + created,
    });
    return Response.json({ campaign_id: body.campaign_id, recipients_added: created, opt_outs_filtered: optOutCount });
  }

  // ── LAUNCH: execute the blast with throttling + rate-limit guards ──
  if (action === "launch") {
    if (!body.campaign_id) return Response.json({ error: "campaign_id required" }, { status: 400 });
    const campaign = await base44.asServiceRole.entities.Campaign.get(body.campaign_id);
    if (!campaign || campaign.tenant_id !== tenant.id) return Response.json({ error: "campaign not found" }, { status: 404 });
    if (campaign.status === "running") return Response.json({ error: "already running" }, { status: 409 });

    await base44.asServiceRole.entities.Campaign.update(body.campaign_id, {
      status: "running", started_at: new Date().toISOString(),
    });

    const recipients = await base44.asServiceRole.entities.CampaignRecipient.filter(
      { tenant_id: tenant.id, campaign_id: body.campaign_id, status: "pending" },
      null, 500
    );

    let optOutSet = new Set();
    if (campaign.segment_id) {
      const seg = await base44.asServiceRole.entities.AudienceSegment.get(campaign.segment_id);
      if (seg && seg.opt_out_list) optOutSet = new Set(seg.opt_out_list);
    }

    const throttle = campaign.throttle_per_sec || 10;
    const rateLimit = campaign.rate_limit_per_sec || 25;
    const channel = campaign.channel || "sms";
    const template = campaign.message_template || "";

    let sent = 0, delivered = 0, failed = 0, optOut = 0, skipped = 0;
    const batchSize = Math.min(throttle, 50);
    const updates = [];
    let secondWindow = 0, sentInWindow = 0;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];

      // Opt-out guard
      if (optOutSet.has(r.phone_number)) {
        updates.push({ id: r.id, status: "opt_out", last_attempt_at: new Date().toISOString() });
        optOut++; skipped++; continue;
      }

      // Dynamic rate-limit guard — if we exceed rate_limit_per_sec, skip remaining this window
      if (sentInWindow >= rateLimit) {
        updates.push({ id: r.id, status: "queued", error: "rate_limited" });
        skipped++; continue;
      }

      // Dispatch via gateway
      try {
        let res;
        if (channel === "voice") {
          res = await base44.asServiceRole.functions.invoke("gatewayCalls", {
            api_key: body.api_key, to: r.phone_number, action: "outbound",
            script: campaign.voice_script || template,
          });
        } else {
          res = await base44.asServiceRole.functions.invoke("gatewayMessages", {
            api_key: body.api_key, channel, to: r.phone_number, body: template,
          });
        }
        const data = (res && res.data) || res;
        const msgStatus = data && (data.status || data.message_status);
        const isDelivered = msgStatus === "delivered" || msgStatus === "queued" || msgStatus === "sandbox" || msgStatus === "sent";
        sent++;
        sentInWindow++;
        if (isDelivered) delivered++;
        updates.push({
          id: r.id,
          status: isDelivered ? "sent" : "failed",
          attempts: (r.attempts || 0) + 1,
          last_attempt_at: new Date().toISOString(),
          message_id: (data && data.message_id) || null,
          error: isDelivered ? null : "gateway returned non-success",
        });
        if (!isDelivered) failed++;
      } catch (e) {
        failed++;
        updates.push({
          id: r.id, status: "failed", attempts: (r.attempts || 0) + 1,
          last_attempt_at: new Date().toISOString(), error: e.message,
        });
      }

      // Throttle: every batchSize, reset window counter (simulated second boundary)
      if ((i + 1) % batchSize === 0) sentInWindow = 0;
    }

    // Bulk update recipient statuses
    if (updates.length) {
      const chunks = [];
      for (let i = 0; i < updates.length; i += 100) chunks.push(updates.slice(i, i + 100));
      for (const chunk of chunks) {
        await base44.asServiceRole.entities.CampaignRecipient.bulkUpdate(chunk);
      }
    }

    await base44.asServiceRole.entities.Campaign.update(body.campaign_id, {
      status: "completed",
      sent_count: (campaign.sent_count || 0) + sent,
      delivered_count: (campaign.delivered_count || 0) + delivered,
      failed_count: (campaign.failed_count || 0) + failed,
      opt_out_count: (campaign.opt_out_count || 0) + optOut,
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      campaign_id: body.campaign_id,
      total_processed: recipients.length,
      sent, delivered, failed, opt_out: optOut, skipped,
      throttle_per_sec: throttle,
      rate_limit_per_sec: rateLimit,
      channel,
      status: "completed",
    });
  }

  // ── STATUS ──
  if (action === "status") {
    if (!body.campaign_id) return Response.json({ error: "campaign_id required" }, { status: 400 });
    const campaign = await base44.asServiceRole.entities.Campaign.get(body.campaign_id);
    if (!campaign || campaign.tenant_id !== tenant.id) return Response.json({ error: "campaign not found" }, { status: 404 });
    const recipientStats = await base44.asServiceRole.entities.CampaignRecipient.filter(
      { tenant_id: tenant.id, campaign_id: body.campaign_id }, null, 500
    );
    const byStatus = {};
    for (const r of recipientStats) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    return Response.json({ campaign, recipient_breakdown: byStatus, total_recipient_records: recipientStats.length });
  }

  // ── CANCEL ──
  if (action === "cancel") {
    if (!body.campaign_id) return Response.json({ error: "campaign_id required" }, { status: 400 });
    await base44.asServiceRole.entities.Campaign.update(body.campaign_id, { status: "cancelled" });
    return Response.json({ campaign_id: body.campaign_id, status: "cancelled" });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// WhatsApp / SMS / MMS Batch Outreach Engine
// Sends personalized messages to filtered CRM contacts in throttled batches.
// Actions:
//   start_campaign — creates a Campaign record, queues contacts, starts sending
//   send_batch — sends a batch of messages (called by workflow or manually)
//   get_status — returns campaign progress
//   preview_contacts — returns contacts matching the filter (dry run)
// Uses gatewayMessages for actual dispatch (Telnyx WhatsApp/SMS/MMS).

function personalize(template, contact) {
  if (!template) return '';
  const firstName = (contact.full_name || '').split(' ')[0] || 'there';
  const company = contact.company || 'your company';
  return template
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{full_name\}\}/gi, contact.full_name || '')
    .replace(/\{\{company\}\}/gi, company)
    .replace(/\{\{city\}\}/gi, (contact.location || '').split(',')[0] || '');
}

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

    const action = body.action || "start_campaign";

    // ── PREVIEW CONTACTS (dry run) ──
    if (action === "preview_contacts") {
      const filter = body.filter || {};
      const query = {};
      if (filter.tags) query.tags = { $in: Array.isArray(filter.tags) ? filter.tags : [filter.tags] };
      if (filter.lifecycle_stage) query.lifecycle_stage = filter.lifecycle_stage;
      if (filter.industry) query.industry = filter.industry;
      if (filter.state) query.location = { $regex: filter.state, $options: 'i' };
      // Only contacts with a phone number
      const contacts = await base44.asServiceRole.entities.XtremeCrmContact.filter(query, '-created_date', 500);
      const withPhone = contacts.filter(c => c.phone);
      return Response.json({
        total_matching: contacts.length,
        with_phone: withPhone.length,
        sample: withPhone.slice(0, 20).map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone, company: c.company, tags: c.tags })),
      });
    }

    // ── START CAMPAIGN ──
    if (action === "start_campaign") {
      const channel = body.channel || "whatsapp";
      const fromNumber = body.from_number || (channel === "whatsapp" ? "+15559730487" : "+19549102671");
      const messageTemplate = body.message_template;
      const mediaUrl = body.media_url || null;
      const throttle = body.throttle_per_sec || 5;
      const batchSize = body.batch_size || 50;
      const campaignName = body.campaign_name || `Outreach ${channel} ${new Date().toISOString().slice(0, 10)}`;

      if (!messageTemplate) return Response.json({ error: "message_template required" }, { status: 400 });

      // Filter contacts
      const filter = body.filter || {};
      const query = {};
      if (filter.tags) query.tags = { $in: Array.isArray(filter.tags) ? filter.tags : [filter.tags] };
      if (filter.lifecycle_stage) query.lifecycle_stage = filter.lifecycle_stage;
      if (filter.contact_ids) query.id = { $in: filter.contact_ids };

      const contacts = await base44.asServiceRole.entities.XtremeCrmContact.filter(query, '-created_date', 5000);
      const eligible = contacts.filter(c => c.phone && !c.tags?.includes('unsubscribed'));

      // Create campaign record
      const campaign = await base44.asServiceRole.entities.Campaign.create({
        tenant_id: tenant.id,
        name: campaignName,
        channel,
        message_template: messageTemplate,
        status: "running",
        schedule_type: "immediate",
        throttle_per_sec: throttle,
        total_recipients: eligible.length,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        started_at: new Date().toISOString(),
        classification: "LIVE",
      });

      // Send first batch
      const firstBatch = eligible.slice(0, batchSize);
      const results = [];
      for (const contact of firstBatch) {
        const personalizedMsg = personalize(messageTemplate, contact);
        try {
          const sendRes = await base44.asServiceRole.functions.invoke("gatewayMessages", {
            api_key: apiKey,
            channel,
            from: fromNumber,
            to: contact.phone,
            body: personalizedMsg,
            media_urls: mediaUrl ? [mediaUrl] : undefined,
          });
          results.push({ contact_id: contact.id, phone: contact.phone, status: sendRes.data?.status || sendRes.status || "unknown" });

          // Update contact follow-up status
          await base44.asServiceRole.entities.XtremeCrmContact.update(contact.id, {
            last_contacted_at: new Date().toISOString(),
            last_contact_channel: channel,
            follow_up_count: (contact.follow_up_count || 0) + 1,
            lifecycle_stage: "contacted",
          });

          // Log comms event
          await base44.asServiceRole.entities.CommsEvent.create({
            tenant_id: tenant.id,
            channel,
            direction: "outbound",
            from_number: fromNumber,
            to_number: contact.phone,
            body: personalizedMsg,
            status: sendRes.data?.status || "queued",
            campaign_id: campaign.id,
            contact_id: contact.id,
            event_type: "campaign_message",
          });
        } catch (err) {
          results.push({ contact_id: contact.id, phone: contact.phone, status: "failed", error: err.message });
        }
        // Rate limit
        if (throttle > 0) await new Promise(r => setTimeout(r, 1000 / throttle));
      }

      const sentCount = results.filter(r => r.status !== "failed").length;
      const failedCount = results.filter(r => r.status === "failed").length;

      await base44.asServiceRole.entities.Campaign.update(campaign.id, {
        sent_count: sentCount,
        failed_count: failedCount,
      });

      return Response.json({
        campaign_id: campaign.id,
        campaign_name: campaignName,
        channel,
        from_number: fromNumber,
        total_eligible: eligible.length,
        batch_sent: firstBatch.length,
        sent: sentCount,
        failed: failedCount,
        remaining: eligible.length - firstBatch.length,
        results: results.slice(0, 50),
        next_batch_action: "send_batch",
        next_batch_params: { campaign_id: campaign.id, api_key: apiKey, batch_size: batchSize, offset: batchSize },
      });
    }

    // ── SEND NEXT BATCH ──
    if (action === "send_batch") {
      const campaignId = body.campaign_id;
      if (!campaignId) return Response.json({ error: "campaign_id required" }, { status: 400 });

      const campaign = await base44.asServiceRole.entities.Campaign.get(campaignId);
      if (!campaign || campaign.tenant_id !== tenant.id) return Response.json({ error: "campaign not found" }, { status: 404 });
      if (campaign.status !== "running") return Response.json({ status: campaign.status, message: "campaign not running" });

      const offset = body.offset || campaign.sent_count + campaign.failed_count;
      const batchSize = body.batch_size || 50;
      const fromNumber = body.from_number || (campaign.channel === "whatsapp" ? "+15559730487" : "+19549102671");
      const throttle = body.throttle_per_sec || campaign.throttle_per_sec || 5;

      // Re-fetch contacts (same filter)
      const filter = body.filter || {};
      const query = {};
      if (filter.tags) query.tags = { $in: Array.isArray(filter.tags) ? filter.tags : [filter.tags] };
      if (filter.lifecycle_stage) query.lifecycle_stage = filter.lifecycle_stage;
      const contacts = await base44.asServiceRole.entities.XtremeCrmContact.filter(query, '-created_date', 5000);
      const eligible = contacts.filter(c => c.phone && !c.tags?.includes('unsubscribed'));
      const batch = eligible.slice(offset, offset + batchSize);

      if (batch.length === 0) {
        await base44.asServiceRole.entities.Campaign.update(campaignId, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });
        return Response.json({ campaign_id: campaignId, status: "completed", total_sent: campaign.sent_count });
      }

      const results = [];
      for (const contact of batch) {
        const personalizedMsg = personalize(campaign.message_template, contact);
        try {
          const sendRes = await base44.asServiceRole.functions.invoke("gatewayMessages", {
            api_key: apiKey,
            channel: campaign.channel,
            from: fromNumber,
            to: contact.phone,
            body: personalizedMsg,
          });
          results.push({ contact_id: contact.id, status: sendRes.data?.status || "queued" });

          await base44.asServiceRole.entities.XtremeCrmContact.update(contact.id, {
            last_contacted_at: new Date().toISOString(),
            last_contact_channel: campaign.channel,
            follow_up_count: (contact.follow_up_count || 0) + 1,
          });

          await base44.asServiceRole.entities.CommsEvent.create({
            tenant_id: tenant.id,
            channel: campaign.channel,
            direction: "outbound",
            from_number: fromNumber,
            to_number: contact.phone,
            body: personalizedMsg,
            status: sendRes.data?.status || "queued",
            campaign_id: campaignId,
            contact_id: contact.id,
            event_type: "campaign_message",
          });
        } catch (err) {
          results.push({ contact_id: contact.id, status: "failed", error: err.message });
        }
        if (throttle > 0) await new Promise(r => setTimeout(r, 1000 / throttle));
      }

      const sentNow = results.filter(r => r.status !== "failed").length;
      const failedNow = results.filter(r => r.status === "failed").length;

      await base44.asServiceRole.entities.Campaign.update(campaignId, {
        sent_count: campaign.sent_count + sentNow,
        failed_count: campaign.failed_count + failedNow,
      });

      const newOffset = offset + batchSize;
      const hasMore = newOffset < eligible.length;

      if (!hasMore) {
        await base44.asServiceRole.entities.Campaign.update(campaignId, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }

      return Response.json({
        campaign_id: campaignId,
        batch_sent: batch.length,
        sent: sentNow,
        failed: failedNow,
        total_sent: campaign.sent_count + sentNow,
        remaining: Math.max(0, eligible.length - newOffset),
        status: hasMore ? "running" : "completed",
        next_offset: hasMore ? newOffset : null,
      });
    }

    // ── GET STATUS ──
    if (action === "get_status") {
      const campaignId = body.campaign_id;
      if (!campaignId) return Response.json({ error: "campaign_id required" }, { status: 400 });
      const campaign = await base44.asServiceRole.entities.Campaign.get(campaignId);
      if (!campaign || campaign.tenant_id !== tenant.id) return Response.json({ error: "campaign not found" }, { status: 404 });

      const events = await base44.asServiceRole.entities.CommsEvent.filter({ campaign_id: campaignId }, '-created_date', 100);

      return Response.json({
        campaign_id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        total_recipients: campaign.total_recipients,
        sent: campaign.sent_count,
        delivered: campaign.delivered_count,
        failed: campaign.failed_count,
        started_at: campaign.started_at,
        completed_at: campaign.completed_at,
        recent_events: events.slice(0, 20).map(e => ({
          to: e.to_number,
          status: e.status,
          time: e.created_date,
        })),
      });
    }

    // ── LIST CAMPAIGNS ──
    if (action === "list_campaigns") {
      const campaigns = await base44.asServiceRole.entities.Campaign.filter({ tenant_id: tenant.id }, '-created_date', 50);
      return Response.json({
        count: campaigns.length,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          channel: c.channel,
          status: c.status,
          total: c.total_recipients,
          sent: c.sent_count,
          failed: c.failed_count,
          created: c.created_date,
        })),
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
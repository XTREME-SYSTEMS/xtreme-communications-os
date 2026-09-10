import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getPlaybook } from '../../shared/playbooks.ts';
import { personalize, sendTelnyx, getTelnyxEndpoint } from '../../shared/telnyxMessaging.ts';

// ─── Agent Provisioning & Launch Function ─────────────────────────
// Takes a playbook ID and provisions a COMPLETE, operational agent:
//   1. Creates an AgentPersona with the playbook's intelligence file
//   2. Creates 15 CommunicationTemplate records (one per day)
//   3. Finds matching contacts and assigns them to the agent
//   4. Enables follow-up on all assigned contacts
//   5. SENDS DAY 1 MESSAGES IMMEDIATELY — the agent starts operating now
//   6. Schedules day 2+ for the daily workflow to pick up
//
// This is the "fully automated fulfillment agent" — zero ambiguity, 100%
// deterministic, fully scripted. One agent, one number, one personality,
// one template book, one intelligence file, one daily target list.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    // ── Auth ──
    const apiKey = body.api_key || '';
    if (!apiKey) return Response.json({ error: 'api_key required' }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: 'active' });
    if (!keys.length) return Response.json({ error: 'invalid api key' }, { status: 403 });
    const key = keys[0];
    const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
    if (!tenant || tenant.status !== 'active') return Response.json({ error: 'tenant not active' }, { status: 403 });

    // ── Validate playbook ──
    const playbookId = body.playbook_id;
    if (!playbookId) return Response.json({ error: 'playbook_id required' }, { status: 400 });
    const playbook = getPlaybook(playbookId);
    if (!playbook) return Response.json({ error: 'playbook not found', playbook_id: playbookId }, { status: 404 });

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return Response.json({ status: 'credentials_required', error: 'TELNYX_API_KEY not configured' }, { status: 503 });

    const fromNumber = body.from_number || '+18334843799';
    const channel = body.channel || 'whatsapp';
    const now = new Date().toISOString();

    // ── 1. Create AgentPersona ──
    const persona = await base44.asServiceRole.entities.AgentPersona.create({
      name: `${playbook.name} Agent`,
      persona_type: 'phone',
      system_prompt: playbook.system_prompt,
      personality_traits: ['determined', 'professional', 'concise', 'results-driven'],
      tone: 'consultative',
      assigned_context: `${playbook.name} — ${playbook.description}`,
      active: true,
      avatar_color: '#ff6b00',
      playbook_id: playbook.id,
      assigned_number: fromNumber,
      target_industry: playbook.target_industry,
      target_tags: playbook.target_tags,
      provisioned_at: now,
      contacts_assigned: 0,
      status: 'active',
    });

    // ── 2. Create 15 CommunicationTemplate records ──
    const templates = [];
    for (let day = 0; day < playbook.messages.length; day++) {
      const tpl = await base44.asServiceRole.entities.CommunicationTemplate.create({
        industry: playbook.target_industry || 'universal',
        channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
        situation: day === 0 ? 'outreach' : day < 5 ? 'follow_up' : day < 10 ? 'nurture' : 're_engagement',
        tone: 'consultative',
        persona_id: persona.id,
        template_body: playbook.messages[day],
        target_audience: `${playbook.target_industry} businesses`,
        active: true,
        sequence_day: day + 1,
        playbook_id: playbook.id,
        effectiveness_score: 85,
      });
      templates.push(tpl.id);
    }

    // ── 3. Find matching contacts ──
    let contacts: any[] = [];
    if (body.contact_tag) {
      // Filter by tag — we need to get all and filter since tag is an array
      const all = await base44.asServiceRole.entities.XtremeCrmContact.filter({}, '-created_date', 5000);
      contacts = all.filter(c => c.tags && c.tags.includes(body.contact_tag));
    } else if (body.contact_industry) {
      contacts = await base44.asServiceRole.entities.XtremeCrmContact.filter({ industry: body.contact_industry }, '-created_date', 5000);
    } else if (body.contact_ids && Array.isArray(body.contact_ids)) {
      // Specific contact IDs
      for (const id of body.contact_ids) {
        try {
          const c = await base44.asServiceRole.entities.XtremeCrmContact.get(id);
          if (c) contacts.push(c);
        } catch (_) {}
      }
    } else {
      // Default: use the playbook's target_tags
      const all = await base44.asServiceRole.entities.XtremeCrmContact.filter({}, '-created_date', 5000);
      contacts = all.filter(c => {
        if (!c.phone) return false;
        if (c.tags && c.tags.includes('unsubscribed')) return false;
        return playbook.target_tags.some(tag => c.tags && c.tags.includes(tag));
      });
    }

    // Filter to contacts with phone numbers only
    contacts = contacts.filter(c => c.phone && !(c.tags && c.tags.includes('unsubscribed')));

    if (contacts.length === 0) {
      await base44.asServiceRole.entities.AgentPersona.update(persona.id, {
        status: 'paused',
        assigned_context: `${playbook.name} — no matching contacts found`,
      });
      return Response.json({
        status: 'no_contacts',
        message: 'No contacts matched the criteria. Agent created but paused.',
        persona_id: persona.id,
        playbook: playbook.name,
      });
    }

    // ── 4. Assign contacts & enable follow-up ──
    const nextFollowUp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const contactIds = contacts.map(c => c.id);

    // Bulk update in batches of 500 (SDK max)
    for (let i = 0; i < contactIds.length; i += 500) {
      const batch = contactIds.slice(i, i + 500).map(id => ({
        id,
        assigned_agent_id: persona.id,
        follow_up_from_number: fromNumber,
        follow_up_enabled: true,
        follow_up_count: 0,
        follow_up_automated: true,
        follow_up_method: channel,
        next_follow_up_at: nextFollowUp,
        lifecycle_stage: 'lead',
      }));
      await base44.asServiceRole.entities.XtremeCrmContact.bulkUpdate(batch);
    }

    // Update persona contact count
    await base44.asServiceRole.entities.AgentPersona.update(persona.id, {
      contacts_assigned: contacts.length,
    });

    // ── 5. LAUNCH: Send Day 1 messages immediately (capped to avoid timeout) ──
    const endpoint = getTelnyxEndpoint(channel);
    const maxImmediateSend = body.max_send || 50;
    const immediateContacts = contacts.slice(0, maxImmediateSend);
    const deferredContacts = contacts.slice(maxImmediateSend);

    const day1Template = playbook.messages[0];
    let sent = 0;
    let failed = 0;
    const launchResults: any[] = [];

    for (const contact of immediateContacts) {
      const message = personalize(day1Template, contact);
      try {
        const sendRes = await sendTelnyx(telnyxKey, endpoint, {
          from: fromNumber,
          to: contact.phone,
          text: message,
        });

        if (!sendRes.ok) {
          launchResults.push({ contact_id: contact.id, name: contact.full_name, status: 'failed', error: sendRes.data?.errors?.[0]?.detail || 'unknown' });
          failed++;
        } else {
          // Update contact: mark as contacted, advance to day 2
          await base44.asServiceRole.entities.XtremeCrmContact.update(contact.id, {
            last_contacted_at: now,
            last_contact_channel: channel,
            follow_up_count: 1,
            lifecycle_stage: 'contacted',
          });

          // Log the comms event
          await base44.asServiceRole.entities.CommsEvent.create({
            tenant_id: tenant.id,
            channel,
            direction: 'outbound',
            from_number: fromNumber,
            to_number: contact.phone,
            body: message,
            status: 'queued',
            contact_id: contact.id,
            event_type: 'agent_launch_day_1',
          });

          launchResults.push({ contact_id: contact.id, name: contact.full_name, status: 'sent' });
          sent++;
        }

        // Rate limit: 0.5 sec between messages
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        launchResults.push({ contact_id: contact.id, name: contact.full_name, status: 'failed', error: err.message });
        failed++;
      }
    }

    // ── 6. Log the provisioning ──
    await base44.asServiceRole.entities.ProviderLog.create({
      provider: 'telnyx',
      channel,
      event_type: 'agent.provisioned',
      direction: 'system',
      status: 'accepted',
      message: `Agent "${persona.name}" provisioned for ${playbook.name}. ${sent}/${contacts.length} day-1 messages sent from ${fromNumber}.`,
    });

    return Response.json({
      status: 'launched',
      persona: {
        id: persona.id,
        name: persona.name,
        playbook: playbook.name,
        from_number: fromNumber,
        target_industry: playbook.target_industry,
      },
      templates_created: templates.length,
      contacts_assigned: contacts.length,
      day1_sent: sent,
      day1_failed: failed,
      day1_deferred: deferredContacts.length,
      next_follow_up: deferredContacts.length > 0
        ? `${deferredContacts.length} contacts queued — trigger "Run Daily Sequence" to send the next batch, or the daily workflow picks them up at 9am ET`
        : 'Daily workflow picks up day 2+ automatically at 9am ET',
      results: launchResults.slice(0, 50),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
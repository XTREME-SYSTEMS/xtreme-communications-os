import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { personalize, sendTelnyx, getTelnyxEndpoint } from '../../shared/telnyxMessaging.ts';

// Daily Follow-Up Sequence Engine — finds contacts due for their next follow-up
// and sends the appropriate day's message.
//
// Supports TWO modes:
//   1. LEGACY: contacts without an assigned_agent_id use the hardcoded 15-day
//      PCU playbook below (backward compatible).
//   2. AGENT: contacts WITH an assigned_agent_id use CommunicationTemplate
//      records linked to their agent's persona_id + sequence_day.
//
// Called by a scheduled workflow (daily) or manually with an API key.
// Calls Telnyx directly for message dispatch (no API key needed in workflow mode).

// ── Legacy PCU Playbook (for contacts without an assigned agent) ──
const LEGACY_PLAYBOOK = [
  "Hey {{first_name}}! 👋 It's been a while since PCU. We've built incredible AI tools for contractors. Want a FREE AI tool that generates follow-up messages? Reply 'YES' — Team Xtreme",
  "Hi {{first_name}}! Does {{company}} have a website that brings you leads? We build AI-powered contractor websites that book jobs on autopilot. Reply 'WEBSITE' 🏗️",
  "Hey {{first_name}}! We launched AI tools for epoxy/flooring pros: instant quotes, photo editing, follow-up bots. All FREE. Reply 'AI' 🤖",
  "{{first_name}}, new products dropping this month — epoxy kits, polishing pads, training templates. Want the catalog? Reply 'NEW' 📦",
  "Hey {{first_name}}! FREE business templates — proposals, invoices, contracts for contractors. Reply 'TEMPLATES' 📋",
  "{{first_name}}! 👉 15% OFF everything at our local store for PCU alumni. Epoxy, tools, training. Reply 'STORE' 🏪",
  "Hey {{first_name}}, checking in! Contractors save 5+ hours/week with our free AI tools. Reply 'SETUP' ⚡",
  "{{first_name}}, a PCU alum used our AI bot and booked 3 extra jobs in week 1. Try it free? Reply 'STORY' 📖",
  "Hey {{first_name}}! New video: 'How to Price Epoxy Jobs for Maximum Profit'. FREE. Reply 'VIDEO' 🎥",
  "{{first_name}}, the 15% off store discount ends soon! Reply 'CLAIM' before it's gone! ⏰",
  "Hey {{first_name}}! We offer 1-on-1 business coaching. First session FREE. Reply 'COACH' 📅",
  "{{first_name}}, join our community of epoxy pros sharing tips, jobs, leads. FREE. Reply 'COMMUNITY' 🤝",
  "Last chance, {{first_name}}! ⏰ 15% off expires in 48 hours. Reply 'LAST' 🏪",
  "Hey {{first_name}}, our free AI tools are designed for epoxy/flooring contractors. Reply 'TRY' 🤖",
  "{{first_name}}, no pressure! If you ever need anything — websites, AI tools, supplies, training — we're here. Save this number. — Team Xtreme 💪",
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    // Resolve tenant: API key mode (frontend) or workflow mode (no key, use first active tenant)
    let tenant;
    const apiKey = body.api_key || '';
    if (apiKey) {
      const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: 'active' });
      if (!keys.length) return Response.json({ error: 'invalid api key' }, { status: 403 });
      tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id);
    } else {
      const tenants = await base44.asServiceRole.entities.Tenant.filter({ status: 'active' }, '-created_date', 1);
      if (!tenants.length) return Response.json({ error: 'no active tenant' }, { status: 403 });
      tenant = tenants[0];
    }
    if (!tenant || tenant.status !== 'active') return Response.json({ error: 'tenant not active' }, { status: 403 });

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) return Response.json({ status: 'credentials_required', error: 'TELNYX_API_KEY not configured' }, { status: 503 });

    const defaultFromNumber = body.from_number || '+18334843799';
    const channel = body.channel || 'whatsapp';
    const now = new Date().toISOString();

    // Find contacts with follow-up enabled
    const allDue = await base44.asServiceRole.entities.XtremeCrmContact.filter({
      follow_up_enabled: true,
    }, '-created_date', 5000);

    // Filter to those actually due (next_follow_up_at is null or in the past)
    const dueContacts = allDue.filter(c => {
      if (!c.phone) return false;
      if (c.tags && c.tags.includes('unsubscribed')) return false;
      if (!c.next_follow_up_at) return true;
      return new Date(c.next_follow_up_at).getTime() <= Date.now();
    });

    if (dueContacts.length === 0) {
      return Response.json({ status: 'no_due_contacts', message: 'No contacts due for follow-up', checked: allDue.length });
    }

    // Cap processing to avoid timeout — remaining contacts picked up by next run
    const maxProcess = body.max_process || 100;
    const processNow = dueContacts.slice(0, maxProcess);
    const deferred = dueContacts.length - processNow.length;

    // Cache: persona_id → templates array (indexed by sequence_day)
    const personaTemplateCache: Record<string, any[]> = {};

    async function getTemplateForDay(personaId: string, dayNumber: number): Promise<string | null> {
      if (!personaId) return null;
      if (!personaTemplateCache[personaId]) {
        const templates = await base44.asServiceRole.entities.CommunicationTemplate.filter({
          persona_id: personaId,
          active: true,
        }, 'sequence_day', 50);
        personaTemplateCache[personaId] = templates;
      }
      const templates = personaTemplateCache[personaId];
      const tpl = templates.find(t => t.sequence_day === dayNumber);
      return tpl ? tpl.template_body : null;
    }

    const endpoint = getTelnyxEndpoint(channel);

    let sent = 0;
    let failed = 0;
    let completed = 0;
    let agentMode = 0;
    let legacyMode = 0;
    const results = [];

    for (const contact of processNow) {
      const dayIndex = contact.follow_up_count || 0;
      const sequenceLength = contact.assigned_agent_id ? 15 : LEGACY_PLAYBOOK.length;

      // Sequence complete
      if (dayIndex >= sequenceLength) {
        await base44.asServiceRole.entities.XtremeCrmContact.update(contact.id, {
          follow_up_enabled: false,
          notes: (contact.notes || '') + ' | Sequence completed',
        });
        completed++;
        continue;
      }

      // Determine the template and from number
      let templateText: string;
      let fromNumber: string;

      if (contact.assigned_agent_id) {
        // ── AGENT MODE: use persona's templates ──
        const dayTemplate = await getTemplateForDay(contact.assigned_agent_id, dayIndex + 1);
        if (dayTemplate) {
          templateText = dayTemplate;
          agentMode++;
        } else {
          // Fallback to legacy if agent templates missing
          templateText = LEGACY_PLAYBOOK[dayIndex] || LEGACY_PLAYBOOK[0];
        }
        fromNumber = contact.follow_up_from_number || defaultFromNumber;
      } else {
        // ── LEGACY MODE: use hardcoded playbook ──
        templateText = LEGACY_PLAYBOOK[dayIndex] || LEGACY_PLAYBOOK[0];
        fromNumber = defaultFromNumber;
        legacyMode++;
      }

      const message = personalize(templateText, contact);

      try {
        const sendRes = await sendTelnyx(telnyxKey, endpoint, {
          from: fromNumber,
          to: contact.phone,
          text: message,
        });

        if (!sendRes.ok) {
          results.push({ contact_id: contact.id, name: contact.full_name, day: dayIndex + 1, status: 'failed', error: sendRes.data?.errors?.[0]?.detail || 'unknown' });
          failed++;
          continue;
        }

        // Schedule next follow-up: 1 day from now
        const nextFollowUp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await base44.asServiceRole.entities.XtremeCrmContact.update(contact.id, {
          last_contacted_at: now,
          last_contact_channel: channel,
          follow_up_count: dayIndex + 1,
          next_follow_up_at: nextFollowUp,
          lifecycle_stage: dayIndex === 0 ? 'contacted' : contact.lifecycle_stage,
        });

        await base44.asServiceRole.entities.CommsEvent.create({
          tenant_id: tenant.id,
          channel,
          direction: 'outbound',
          from_number: fromNumber,
          to_number: contact.phone,
          body: message,
          status: 'queued',
          contact_id: contact.id,
          event_type: contact.assigned_agent_id ? 'agent_follow_up' : 'follow_up_sequence',
        });

        results.push({ contact_id: contact.id, name: contact.full_name, day: dayIndex + 1, status: 'sent', mode: contact.assigned_agent_id ? 'agent' : 'legacy' });
        sent++;

        // Rate limit: 0.5 sec between messages
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        results.push({ contact_id: contact.id, name: contact.full_name, day: dayIndex + 1, status: 'failed', error: err.message });
        failed++;
      }
    }

    return Response.json({
      status: 'completed',
      checked: allDue.length,
      due: dueContacts.length,
      processed: processNow.length,
      deferred,
      sent,
      failed,
      completed_sequences: completed,
      agent_mode: agentMode,
      legacy_mode: legacyMode,
      results: results.slice(0, 100),
      next_step: deferred > 0 ? `${deferred} contacts still queued — run again to process the next batch` : undefined,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
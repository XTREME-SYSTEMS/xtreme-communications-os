import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Daily Follow-Up Sequence Engine — finds contacts due for their next follow-up
// and sends the appropriate day's message from the 15-day playbook.
// Called by a scheduled workflow (daily) or manually with an API key.
// Calls Telnyx directly for message dispatch (no API key needed in workflow mode).

const PLAYBOOK = [
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

function personalize(template, contact) {
  const firstName = (contact.full_name || '').split(' ')[0] || 'there';
  const company = contact.company || 'your company';
  return template.replace(/\{\{first_name\}\}/gi, firstName).replace(/\{\{company\}\}/gi, company);
}

async function sendTelnyx(telnyxKey, endpoint, payload) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + telnyxKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
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

    const fromNumber = body.from_number || '+18334843799';
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

    const endpoint = channel === 'whatsapp'
      ? 'https://api.telnyx.com/v2/whatsapp_messages'
      : 'https://api.telnyx.com/v2/messages';

    let sent = 0;
    let failed = 0;
    let completed = 0;
    const results = [];

    for (const contact of dueContacts) {
      const dayIndex = contact.follow_up_count || 0;

      // Sequence complete after 15 days
      if (dayIndex >= 15) {
        await base44.asServiceRole.entities.XtremeCrmContact.update(contact.id, {
          follow_up_enabled: false,
          notes: (contact.notes || '') + ' | 15-day sequence completed',
        });
        completed++;
        continue;
      }

      const template = PLAYBOOK[dayIndex];
      const message = personalize(template, contact);

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
          event_type: 'follow_up_sequence',
        });

        results.push({ contact_id: contact.id, name: contact.full_name, day: dayIndex + 1, status: 'sent' });
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
      sent,
      failed,
      completed_sequences: completed,
      results: results.slice(0, 100),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
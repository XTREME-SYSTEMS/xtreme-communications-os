import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action;

    // ── SYNC CONTACTS from Google People API ──
    if (action === 'sync_contacts' || action === 'full_sync') {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_contacts');
      const res = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=1000',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return Response.json({ error: 'Google People API error', detail: err }, { status: 502 });
      }
      const data = await res.json();
      const connections = data.connections || [];

      let synced = 0;
      for (const person of connections) {
        const resourceName = person.resourceName;
        const name = person.names?.[0];
        const fullName = name?.displayName || '';
        const email = person.emailAddresses?.[0]?.value || '';
        const phone = person.phoneNumbers?.[0]?.value || '';
        const org = person.organizations?.[0];
        const company = org?.name || '';
        const title = org?.title || '';
        const photoUrl = person.photos?.[0]?.url || '';

        if (!fullName && !email && !phone) continue;

        const existing = await base44.asServiceRole.entities.GoogleContact.filter({ google_resource_name: resourceName });
        const contactData: any = {
          google_resource_name: resourceName,
          full_name: fullName,
          given_name: name?.givenName || '',
          family_name: name?.familyName || '',
          email,
          phone,
          company,
          title,
          photo_url: photoUrl,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.GoogleContact.update(existing[0].id, contactData);
        } else {
          await base44.asServiceRole.entities.GoogleContact.create(contactData);
        }
        synced++;
      }

      // If full_sync, also cross-reference with calendar
      if (action === 'full_sync') {
        try {
          await crossReferenceCalendar(base44);
        } catch (e) { /* calendar cross-ref is best-effort */ }
        try {
          await crossReferenceGmail(base44);
        } catch (e) { /* gmail cross-ref is best-effort */ }
      }

      return Response.json({ action: 'full_sync', status: 'completed', contacts_synced: synced, total_from_google: connections.length });
    }

    // ── GET CONTACTS (with optional filter) ──
    if (action === 'get_contacts') {
      const { allowed_only, search } = body;
      let contacts = await base44.asServiceRole.entities.GoogleContact.list('-last_synced_at', 500);
      if (allowed_only) {
        contacts = contacts.filter((c: any) => c.agent_allowed);
      }
      if (search) {
        const q = search.toLowerCase();
        contacts = contacts.filter((c: any) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.company?.toLowerCase().includes(q)
        );
      }
      return Response.json({ action: 'get_contacts', contacts, count: contacts.length });
    }

    // ── SET PERMISSION for a single contact ──
    if (action === 'set_permission') {
      const { contact_id, agent_allowed, allowed_agents } = body;
      if (!contact_id) return Response.json({ error: 'contact_id required' }, { status: 400 });
      const update: any = {};
      if (agent_allowed !== undefined) update.agent_allowed = agent_allowed;
      if (allowed_agents !== undefined) update.allowed_agents = allowed_agents;
      await base44.asServiceRole.entities.GoogleContact.update(contact_id, update);
      return Response.json({ action: 'set_permission', status: 'updated', contact_id, ...update });
    }

    // ── BULK SET PERMISSION ──
    if (action === 'bulk_set_permission') {
      const { contact_ids, agent_allowed } = body;
      if (!contact_ids?.length) return Response.json({ error: 'contact_ids required' }, { status: 400 });
      for (const id of contact_ids) {
        await base44.asServiceRole.entities.GoogleContact.update(id, { agent_allowed });
      }
      return Response.json({ action: 'bulk_set_permission', status: 'updated', count: contact_ids.length });
    }

    // ── CROSS-REFERENCE WITH CALENDAR ──
    if (action === 'cross_reference_calendar') {
      const updated = await crossReferenceCalendar(base44);
      return Response.json({ action: 'cross_reference_calendar', status: 'completed', contacts_updated: updated });
    }

    // ── CROSS-REFERENCE WITH GMAIL ──
    if (action === 'cross_reference_gmail') {
      const updated = await crossReferenceGmail(base44);
      return Response.json({ action: 'cross_reference_gmail', status: 'completed', contacts_updated: updated });
    }

    // ── CROSS-REFERENCE WITH TASKS ──
    if (action === 'cross_reference_tasks') {
      const { accessToken: tasksToken } = await base44.asServiceRole.connectors.getConnection('googletasks');
      const tasksRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${tasksToken}` },
      });
      const tasksData = await tasksRes.json();
      const taskLists = tasksData.items || [];
      let totalTasks = 0;
      for (const list of taskLists) {
        const listRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?maxResults=100`, {
          headers: { Authorization: `Bearer ${tasksToken}` },
        });
        const listData = await listRes.json();
        totalTasks += (listData.items || []).length;
      }
      return Response.json({ action: 'cross_reference_tasks', status: 'completed', task_lists: taskLists.length, total_tasks: totalTasks });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: cross-reference contacts with calendar events ──
async function crossReferenceCalendar(base44: any): Promise<number> {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const calData = await calRes.json();
  const events = calData.items || [];

  const contacts = await base44.asServiceRole.entities.GoogleContact.list('-last_synced_at', 500);
  let updated = 0;
  for (const contact of contacts) {
    if (!contact.email) continue;
    const matching = events.filter((e: any) =>
      (e.attendees || []).some((a: any) => a.email === contact.email)
    );
    if (matching.length > 0) {
      const calEvents = matching.map((e: any) => ({
        event_id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
      }));
      await base44.asServiceRole.entities.GoogleContact.update(contact.id, { calendar_events: calEvents });
      updated++;
    }
  }
  return updated;
}

// ── Helper: cross-reference contacts with Gmail ──
async function crossReferenceGmail(base44: any): Promise<number> {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
  const contacts = await base44.asServiceRole.entities.GoogleContact.list('-last_synced_at', 500);
  let updated = 0;
  for (const contact of contacts) {
    if (!contact.email) continue;
    try {
      const gmailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:${contact.email}+OR+to:${contact.email}&maxResults=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const gmailData = await gmailRes.json();
      const threadCount = gmailData.resultSizeEstimate || 0;
      if (threadCount > 0) {
        await base44.asServiceRole.entities.GoogleContact.update(contact.id, { gmail_threads: threadCount });
        updated++;
      }
    } catch (e) { /* skip individual contact errors */ }
  }
  return updated;
}
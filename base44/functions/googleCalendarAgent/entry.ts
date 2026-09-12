import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action;
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // ── VIEW SCHEDULE: list upcoming events ──
    if (action === 'view_schedule') {
      const { days_ahead } = body;
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + (days_ahead || 7) * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50&orderBy=startTime&singleEvents=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const events = (data.items || []).map((e: any) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location,
        attendees: (e.attendees || []).map((a: any) => a.email),
        status: e.status,
      }));
      return Response.json({ action: 'view_schedule', events, count: events.length });
    }

    // ── BLOCK TIME: create a calendar event for an agent task ──
    if (action === 'block_time') {
      const { title, start_time, end_time, description, agent_name } = body;
      if (!title || !start_time || !end_time) {
        return Response.json({ error: 'title, start_time, end_time required' }, { status: 400 });
      }
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `🤖 ${title}`,
          description: description || `Blocked by ${agent_name || 'AI Agent'} for communications task`,
          start: { dateTime: start_time },
          end: { dateTime: end_time },
          colorId: '6',
        }),
      });
      const data = await res.json();
      return Response.json({
        action: 'block_time',
        status: res.ok ? 'blocked' : 'failed',
        event_id: data.id,
        event: { summary: data.summary, start: data.start, end: data.end },
      });
    }

    // ── FIND FREE SLOTS ──
    if (action === 'find_free_slots') {
      const { date, duration_minutes } = body;
      const dur = duration_minutes || 30;
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(9, 0, 0, 0);
      const timeMin = targetDate.toISOString();
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(17, 0, 0, 0);
      const timeMax = endOfDay.toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50&orderBy=startTime&singleEvents=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const events = data.items || [];

      const slots: any[] = [];
      let currentTime = new Date(timeMin);
      for (const event of events) {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        const eventEnd = new Date(event.end?.dateTime || event.end?.date);
        const gap = eventStart.getTime() - currentTime.getTime();
        if (gap >= dur * 60 * 1000) {
          slots.push({
            start: currentTime.toISOString(),
            end: eventStart.toISOString(),
            duration_minutes: Math.floor(gap / 60000),
          });
        }
        if (eventEnd > currentTime) currentTime = eventEnd;
      }
      const gap = endOfDay.getTime() - currentTime.getTime();
      if (gap >= dur * 60 * 1000) {
        slots.push({
          start: currentTime.toISOString(),
          end: endOfDay.toISOString(),
          duration_minutes: Math.floor(gap / 60000),
        });
      }
      return Response.json({ action: 'find_free_slots', date: timeMin, slots, count: slots.length });
    }

    // ── CHECK AVAILABILITY ──
    if (action === 'check_availability') {
      const { start_time, end_time } = body;
      if (!start_time || !end_time) {
        return Response.json({ error: 'start_time, end_time required' }, { status: 400 });
      }
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start_time}&timeMax=${end_time}&maxResults=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const events = data.items || [];
      return Response.json({
        action: 'check_availability',
        start_time,
        end_time,
        is_free: events.length === 0,
        conflicting_events: events.length,
        events: events.map((e: any) => ({ summary: e.summary, start: e.start?.dateTime, end: e.end?.dateTime })),
      });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
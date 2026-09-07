import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Checks the builder's Google Calendar for busy times on a given date and
// returns available meeting slots. Used during voice calls when someone
// requests a meeting — the system checks availability and proposes a time.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const { date, duration_minutes = 30, timezone = "America/New_York" } = body;
    if (!date) return Response.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const timeMin = new Date(`${date}T00:00:00Z`).toISOString();
    const timeMax = new Date(`${date}T23:59:59Z`).toISOString();

    const freeBusyRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin, timeMax, items: [{ id: "primary" }] })
    });

    if (!freeBusyRes.ok) {
      const err = await freeBusyRes.json().catch(() => ({}));
      return Response.json({ error: "calendar query failed", detail: err }, { status: 502 });
    }

    const freeBusyData = await freeBusyRes.json();
    const busyTimes = freeBusyData.calendars?.primary?.busy || [];

    const slots = [];
    const dayStart = new Date(`${date}T09:00:00`);
    const dayEnd = new Date(`${date}T17:00:00`);
    const durationMs = duration_minutes * 60 * 1000;

    let current = new Date(dayStart);
    while (current.getTime() + durationMs <= dayEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMs);
      const isBusy = busyTimes.some(busy => {
        const bStart = new Date(busy.start);
        const bEnd = new Date(busy.end);
        return current.getTime() < bEnd.getTime() && slotEnd.getTime() > bStart.getTime();
      });
      if (!isBusy) {
        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          label: current.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone })
        });
      }
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return Response.json({
      date,
      busy_times: busyTimes,
      available_slots: slots.slice(0, 5),
      duration_minutes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
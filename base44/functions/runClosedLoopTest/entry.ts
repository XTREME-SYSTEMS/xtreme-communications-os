import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Closed-loop AI-to-AI test system with real Google Calendar scheduling,
// email invite dispatch via Gmail, and human notification.
function encodeBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRfc2822({ from, to, subject, body, html }) {
  const lines = [];
  lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  lines.push(`Subject: =?UTF-8?B?${encodeBase64Url(subject)}?=`);
  lines.push("MIME-Version: 1.0");
  if (html) {
    const boundary = "xtr_" + Math.random().toString(36).slice(2);
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("", `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 7bit", "", body || "", "");
    lines.push(`--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: 7bit", "", html, "", `--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 7bit", "", body || "");
  }
  return lines.join("\r\n");
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const personaA = body.persona_a || { name: "Agent A", system_prompt: "", tone: "professional", personality_traits: [], voice_id: "river", assigned_context: "initiator" };
    const personaB = body.persona_b || { name: "Agent B", system_prompt: "", tone: "friendly", personality_traits: [], voice_id: "sunny", assigned_context: "responder" };
    const channel = body.channel || "voice";
    const scenario = body.scenario || "sales inquiry call";
    const maxTurns = Math.min(body.max_turns || 6, 12);
    const generateAudio = channel === "voice" && body.generate_audio !== false;
    const fromNumber = body.from_number || "test-agent-a";
    const toNumber = body.to_number || "test-agent-b";
    const enableScheduling = body.enable_scheduling !== false;
    const tz = "America/New_York";

    // ── Step 1: Check real Google Calendar availability ──
    let calendarSlots = [];
    let calendarDate = null;
    let calendarError = null;

    if (enableScheduling) {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        calendarDate = tomorrow.toISOString().split('T')[0];

        const { accessToken: calToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
        const timeMin = new Date(`${calendarDate}T00:00:00Z`).toISOString();
        const timeMax = new Date(`${calendarDate}T23:59:59Z`).toISOString();

        const freeBusyRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: "POST",
          headers: { Authorization: `Bearer ${calToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ timeMin, timeMax, items: [{ id: "primary" }] })
        });

        if (freeBusyRes.ok) {
          const freeBusyData = await freeBusyRes.json();
          const busyTimes = freeBusyData.calendars?.primary?.busy || [];
          const dayStart = new Date(`${calendarDate}T09:00:00`);
          const dayEnd = new Date(`${calendarDate}T17:00:00`);
          const durationMs = 30 * 60 * 1000;
          let current = new Date(dayStart);
          while (current.getTime() + durationMs <= dayEnd.getTime()) {
            const slotEnd = new Date(current.getTime() + durationMs);
            const isBusy = busyTimes.some(busy => {
              const bStart = new Date(busy.start);
              const bEnd = new Date(busy.end);
              return current.getTime() < bEnd.getTime() && slotEnd.getTime() > bStart.getTime();
            });
            if (!isBusy) {
              calendarSlots.push({
                start: current.toISOString(),
                end: slotEnd.toISOString(),
                label: current.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
              });
            }
            current = new Date(current.getTime() + 30 * 60 * 1000);
          }
          calendarSlots = calendarSlots.slice(0, 5);
        } else {
          calendarError = `Calendar query failed (HTTP ${freeBusyRes.status})`;
        }
      } catch (e) {
        calendarError = e.message;
      }
    }

    // ── Step 2: Generate conversation with real calendar context ──
    const calendarContext = enableScheduling && calendarSlots.length > 0
      ? `REAL CALENDAR AVAILABILITY for ${calendarDate} (these are actual open slots from Google Calendar):
${calendarSlots.map((s, i) => `  Option ${i+1}: ${s.label} (ISO: ${s.start})`).join('\n')}

IMPORTANT SCHEDULING INSTRUCTIONS:
- The conversation should naturally progress toward scheduling a follow-up.
- Agent A should propose one of these REAL available times.
- Agent A should ask for Agent B's email address to send a calendar invite.
- Agent B should provide a realistic email address (use a realistic-looking but fake email like prospect.name@example.com).
- Agent A should confirm the scheduling and mention sending the invite.`
      : enableScheduling && calendarError
        ? `Calendar check failed (${calendarError}). The agent should still attempt to schedule and ask for email, proposing a reasonable time.`
        : `Scheduling is disabled for this test. Generate a natural conversation without scheduling.`;

    const convRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Create a realistic ${channel} conversation between two AI agents for a closed-loop test.

AGENT A (Caller/Sender): ${personaA.name}
- Role: ${personaA.assigned_context || "initiator"}
- Tone: ${personaA.tone || "professional"}
- Personality: ${(personaA.personality_traits || []).join(", ") || "professional, clear"}
- Instructions: ${personaA.system_prompt || "Be natural, human, and conversational."}

AGENT B (Receiver): ${personaB.name}
- Role: ${personaB.assigned_context || "responder"}
- Tone: ${personaB.tone || "friendly"}
- Personality: ${(personaB.personality_traits || []).join(", ") || "friendly, helpful"}
- Instructions: ${personaB.system_prompt || "Be natural, human, and conversational."}

SCENARIO: ${scenario}
CHANNEL: ${channel}
MAXIMUM TURNS: ${maxTurns}

${calendarContext}

Rules:
- Agent A initiates the conversation.
- Alternate turns between A and B.
- ${channel === "voice" ? "Use natural spoken language — contractions, filler words, natural rhythm, empathy." : "Use natural texting language — concise, casual, with appropriate abbreviations."}
- Make it sound like a real ${channel} exchange, not a script.
- Each turn should be realistic length for the channel.
- End naturally after scheduling is confirmed (or after max turns if scheduling is disabled).

Return a JSON object with:
- "turns": array of { role: "a"|"b", speaker_name, text }
- "captured_email": the email address collected during the conversation (string or null)
- "scheduled_slot_index": index (0-based) of the chosen slot from the availability list above, or null
- "scheduling_summary": brief summary of what was scheduled (string or empty)
- "summary": overall conversation summary
- "outcome": conversation outcome`,
      response_json_schema: {
        type: "object",
        properties: {
          turns: { type: "array", items: { type: "object", properties: { role: { type: "string", enum: ["a", "b"] }, speaker_name: { type: "string" }, text: { type: "string" } }, required: ["role", "speaker_name", "text"] } },
          captured_email: { type: "string" },
          scheduled_slot_index: { type: "integer" },
          scheduling_summary: { type: "string" },
          summary: { type: "string" },
          outcome: { type: "string" }
        },
        required: ["turns"]
      }
    });

    const turns = convRes.turns || [];
    const capturedEmail = convRes.captured_email || null;
    const scheduledSlotIndex = convRes.scheduled_slot_index;
    const schedulingSummary = convRes.scheduling_summary || "";
    const scheduledSlot = (scheduledSlotIndex != null && calendarSlots[scheduledSlotIndex])
      ? calendarSlots[scheduledSlotIndex]
      : (calendarSlots.length > 0 ? calendarSlots[0] : null);

    // ── Step 3: Generate TTS audio for voice tests ──
    if (generateAudio && turns.length > 0) {
      const voiceMap = { river: "river", honey: "honey", sunny: "sunny", storm: "storm", spark: "spark" };
      const audioPromises = turns.map(turn => {
        const voice = turn.role === "a"
          ? (voiceMap[personaA.voice_id] || "river")
          : (voiceMap[personaB.voice_id] || "sunny");
        return base44.asServiceRole.integrations.Core.GenerateSpeech({
          text: turn.text.slice(0, 5000), voice, language_code: "en"
        });
      });
      const audioResults = await Promise.all(audioPromises);
      turns.forEach((turn, i) => { turn.audio_url = audioResults[i]?.url || null; });
    }

    // ── Step 4: Create Google Calendar event ──
    let calendarEvent = null;
    let calendarEventError = null;

    if (scheduledSlot && enableScheduling) {
      try {
        const { accessToken: calToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
        const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: "POST",
          headers: { Authorization: `Bearer ${calToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: `Follow-up: ${scenario.slice(0, 60)}`,
            description: `Scheduled via XTREME Test Lab — ${personaA.name} → ${personaB.name}\n\n${schedulingSummary}\n\nScenario: ${scenario}`,
            start: { dateTime: scheduledSlot.start, timeZone: tz },
            end: { dateTime: scheduledSlot.end, timeZone: tz },
            attendees: capturedEmail ? [{ email: capturedEmail }] : [],
            sendUpdates: capturedEmail ? "all" : "none",
            reminders: { useDefault: true }
          })
        });

        if (eventRes.ok) {
          calendarEvent = await eventRes.json();
        } else {
          const err = await eventRes.json().catch(() => ({}));
          calendarEventError = err?.error?.message || `HTTP ${eventRes.status}`;
        }
      } catch (e) {
        calendarEventError = e.message;
      }
    }

    // ── Step 5: Send invite email to prospect via Gmail ──
    let inviteEmailStatus = null;

    if (capturedEmail && scheduledSlot) {
      try {
        const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const dateFormatted = new Date(scheduledSlot.start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        const timeFormatted = new Date(scheduledSlot.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

        const emailBody = `Hi,\n\nYou're receiving this calendar invite from ${personaA.name}.\n\nFollow-up Meeting Scheduled:\nDate: ${dateFormatted}\nTime: ${timeFormatted}\nDuration: 30 minutes\nPurpose: ${scenario}\n\nA calendar event has also been created in Google Calendar.\n\nBest regards,\n${personaA.name}\nXTREME Communications OS`;

        const emailHtml = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
<h2 style="color:#ff6b00">📅 Calendar Invite</h2>
<p>Hi,</p>
<p>You're receiving this calendar invite from <strong>${personaA.name}</strong>.</p>
<div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #ff6b00">
<p style="margin:0;font-size:16px;font-weight:bold">Follow-up Meeting</p>
<p style="margin:8px 0 4px">📅 ${dateFormatted}</p>
<p style="margin:4px 0">🕐 ${timeFormatted}</p>
<p style="margin:4px 0">⏱ 30 minutes</p>
<p style="margin:4px 0">📋 ${scenario}</p>
</div>
<p>A calendar event has also been created in Google Calendar.</p>
<p>Best regards,<br><strong>${personaA.name}</strong><br>XTREME Communications OS</p>
</div>`;

        const raw = buildRfc2822({
          from: `${personaA.name} <me>`,
          to: capturedEmail,
          subject: `Calendar Invite: Follow-up Meeting — ${dateFormatted} at ${timeFormatted}`,
          body: emailBody, html: emailHtml
        });

        const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${gmailToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encodeBase64Url(raw) })
        });

        if (sendRes.ok) {
          const sendData = await sendRes.json();
          inviteEmailStatus = { status: "sent", message_id: sendData.id, recipient: capturedEmail };
          await base44.asServiceRole.entities.CommsEvent.create({
            channel: "email", direction: "outbound",
            from_addr: personaA.name, to_addr: capturedEmail,
            status: "completed", classification: "LIVE",
            summary: `Calendar invite sent to ${capturedEmail} for ${dateFormatted} at ${timeFormatted}`
          });
        } else {
          const err = await sendRes.json().catch(() => ({}));
          inviteEmailStatus = { status: "failed", error: err?.error?.message || `HTTP ${sendRes.status}`, recipient: capturedEmail };
        }
      } catch (e) {
        inviteEmailStatus = { status: "failed", error: e.message, recipient: capturedEmail };
      }
    }

    // ── Step 6: Notify the human (app user) ──
    let humanNotificationStatus = null;

    try {
      const slotStr = scheduledSlot
        ? new Date(scheduledSlot.start).toLocaleString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Not scheduled';

      const notifyBody = `A meeting was scheduled by AI agent ${personaA.name} during a closed-loop test.

TEST DETAILS:
- Agent A (Caller): ${personaA.name}
- Agent B (Receiver): ${personaB.name}
- Channel: ${channel.toUpperCase()}
- Scenario: ${scenario}

SCHEDULING RESULTS:
- Prospect Email: ${capturedEmail || 'Not collected'}
- Scheduled Time: ${slotStr}
- Google Calendar Event: ${calendarEvent ? 'Created ✓ (ID: ' + calendarEvent.id + ')' : calendarEventError ? 'Failed: ' + calendarEventError : 'N/A'}
- Invite Email to Prospect: ${inviteEmailStatus?.status === 'sent' ? 'Sent ✓' : inviteEmailStatus?.status === 'failed' ? 'Failed: ' + (inviteEmailStatus.error || '') : 'Not sent'}
- Scheduling Summary: ${schedulingSummary || 'N/A'}

CONVERSATION SUMMARY:
${convRes.summary || ''}

This notification was generated automatically by the XTREME Test Lab.`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `[XTREME] Meeting Scheduled by AI Agent — ${personaB.name} — ${slotStr}`,
        body: notifyBody
      });

      humanNotificationStatus = { status: "sent", method: "email", recipient: user.email };
    } catch (e) {
      humanNotificationStatus = { status: "failed", method: "email", error: e.message };
    }

    // ── Step 7: Log the test as a CommsEvent ──
    try {
      await base44.asServiceRole.entities.CommsEvent.create({
        channel, direction: "outbound", from_addr: fromNumber, to_addr: toNumber,
        status: "completed", classification: "SANDBOX",
        summary: `Closed-loop: ${personaA.name} → ${personaB.name} | ${scenario} | Scheduled: ${scheduledSlot ? 'Yes' : 'No'} | Email: ${capturedEmail || 'None'} | Cal: ${calendarEvent ? 'Created' : 'N/A'}`,
        duration_sec: channel === "voice" ? turns.length * 8 : 0,
      });
    } catch (_) {}

    return Response.json({
      channel, scenario, turns,
      summary: convRes.summary || "",
      outcome: convRes.outcome || "",
      persona_a: personaA.name, persona_b: personaB.name,
      from_number: fromNumber, to_number: toNumber,
      audio_generated: generateAudio,
      scheduling: {
        enabled: enableScheduling,
        calendar_date: calendarDate,
        calendar_error: calendarError,
        available_slots: calendarSlots,
        scheduled_slot: scheduledSlot,
        captured_email: capturedEmail,
        scheduling_summary: schedulingSummary,
        calendar_event: calendarEvent ? {
          id: calendarEvent.id,
          html_link: calendarEvent.htmlLink,
          summary: calendarEvent.summary,
          start: calendarEvent.start?.dateTime,
          end: calendarEvent.end?.dateTime,
        } : null,
        calendar_event_error: calendarEventError,
        invite_email: inviteEmailStatus,
        human_notification: humanNotificationStatus,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
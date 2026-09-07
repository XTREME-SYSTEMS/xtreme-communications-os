import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// AI-generated campaign: personalizes messages in the replica's voice,
// sends via Gmail (email) or Telnyx (SMS), logs to Google Sheets, schedules follow-ups.
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

    const { replica_id, contacts, channel, scenario, tone,
           spreadsheet_id, batch_size, from_number } = body;

    if (!replica_id) return Response.json({ error: 'replica_id is required' }, { status: 400 });
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0)
      return Response.json({ error: 'contacts array is required' }, { status: 400 });

    // ── Get the AI replica ──
    const replica = await base44.entities.UserReplica.get(replica_id);
    if (!replica) return Response.json({ error: 'Replica not found' }, { status: 404 });

    const batchSize = Math.min(batch_size || 10, 50);
    const contactsToProcess = contacts.slice(0, batchSize);
    const ch = channel || 'email';

    // ── Generate personalized campaign content ──
    const contentRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are ${replica.full_name}. Generate personalized ${ch} messages for a sales campaign.

YOUR STYLE & PERSONALITY:
${replica.communication_style || ''}

YOUR AI REPLICA PROMPT:
${replica.ai_replica_prompt || ''}

CAMPAIGN SCENARIO: ${scenario || 'Sales outreach'}
TONE: ${tone || 'professional'}

CONTACTS TO MESSAGE:
${contactsToProcess.map((c, i) => `${i}. Name: ${c.full_name}, Email: ${c.email || 'N/A'}, Phone: ${c.phone || 'N/A'}, Company: ${c.company || 'N/A'}, Title: ${c.title || 'N/A'}, Notes: ${c.notes || 'N/A'}`).join('\n')}

Rules:
- Personalize each message to the specific contact
- Reference their company/role if available
- Sound natural and human — like a real sales person wrote it
- Include a clear but soft call to action
- ${ch === 'email' ? 'Include subject line + body. Keep body 100-200 words.' : 'Keep under 160 characters. Natural texting language.'}
- Do NOT use spammy phrases or excessive exclamation marks
- Drop hints about new products or offer discounts where appropriate
- Make it feel like a personal 1-on-1 message, not a blast

Return JSON with a "messages" array, one per contact (match by contact_index).`,
      response_json_schema: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                contact_index: { type: "integer" },
                subject: { type: "string" },
                body: { type: "string" },
                html: { type: "string" }
              },
              required: ["contact_index", "body"]
            }
          }
        },
        required: ["messages"]
      }
    });

    const messages = contentRes.messages || [];
    const results = [];
    const telnyxKey = secrets.get('TELNYX_API_KEY');
    const senderNumber = from_number || '+19548848885';

    // ── Send each message ──
    for (const msg of messages) {
      const contact = contactsToProcess[msg.contact_index];
      if (!contact) continue;

      let sendStatus = 'pending';
      let sendError = null;
      let messageId = null;

      try {
        if (ch === 'email' && contact.email) {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
          const html = msg.html || `<div style="font-family:sans-serif;max-width:600px"><p>${(msg.body || '').replace(/\n/g, '<br>')}</p></div>`;
          const raw = buildRfc2822({
            from: `${replica.full_name} <me>`,
            to: contact.email,
            subject: msg.subject || `Following up — ${replica.full_name}`,
            body: msg.body, html
          });
          const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encodeBase64Url(raw) })
          });
          if (sendRes.ok) {
            const data = await sendRes.json();
            sendStatus = 'sent';
            messageId = data.id;
          } else {
            const err = await sendRes.json().catch(() => ({}));
            sendStatus = 'failed';
            sendError = err?.error?.message || `HTTP ${sendRes.status}`;
          }
        } else if (ch === 'sms' && contact.phone) {
          if (!telnyxKey) {
            sendStatus = 'failed';
            sendError = 'TELNYX_API_KEY not configured';
          } else {
            const smsRes = await fetch('https://api.telnyx.com/v2/messages', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${telnyxKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: senderNumber, to: contact.phone, text: msg.body })
            });
            if (smsRes.ok) {
              const data = await smsRes.json();
              sendStatus = 'sent';
              messageId = data.data?.id;
            } else {
              const err = await smsRes.json().catch(() => ({}));
              sendStatus = 'failed';
              sendError = err?.errors?.[0]?.detail || `HTTP ${smsRes.status}`;
            }
          }
        } else {
          sendStatus = 'skipped';
          sendError = `No ${ch} address for this contact`;
        }
      } catch (e) {
        sendStatus = 'failed';
        sendError = e.message;
      }

      results.push({
        contact_id: contact.id,
        contact_name: contact.full_name,
        contact_email: contact.email,
        contact_phone: contact.phone,
        status: sendStatus,
        error: sendError,
        message_id: messageId,
        subject: msg.subject,
        message_preview: (msg.body || '').slice(0, 120),
      });

      // Update contact status if sent
      if (contact.id && sendStatus === 'sent') {
        try {
          await base44.entities.CampaignContact.update(contact.id, {
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
            last_contact_channel: ch,
            follow_up_stage: 1,
            next_follow_up_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } catch (_) {}
      }
    }

    // ── Log to Google Sheets ──
    let sheetsLogged = false;
    if (spreadsheet_id) {
      try {
        const { accessToken: sheetsToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
        const range = 'CampaignLog!A:K';
        const values = results.map(r => [
          new Date().toISOString(),
          r.contact_name,
          r.contact_email || '',
          r.contact_phone || '',
          ch,
          r.subject || '',
          r.message_preview,
          r.status,
          r.error || '',
          replica.full_name,
          scenario || '',
        ]);
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${range}?valueInputOption=RAW`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values })
        });
        sheetsLogged = true;
      } catch (_) {}
    }

    // ── Log to CommsEvent ──
    try {
      await base44.asServiceRole.entities.CommsEvent.create({
        channel: ch, direction: 'outbound',
        from_addr: replica.full_name,
        to_addr: `${results.length} contacts`,
        status: 'completed', classification: 'LIVE',
        summary: `Campaign: ${scenario || 'outreach'} | ${results.filter(r => r.status === 'sent').length} sent, ${results.filter(r => r.status === 'failed').length} failed`
      });
    } catch (_) {}

    return Response.json({
      channel: ch,
      scenario,
      tone,
      replica_name: replica.full_name,
      total_processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      sheets_logged: sheetsLogged,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
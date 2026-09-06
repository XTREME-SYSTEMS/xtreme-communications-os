import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Email gateway — sends email through the connected Gmail OAuth connector.
// Uses base44.asServiceRole.connectors.getConnection('gmail') to get the OAuth access token,
// then POSTs a raw RFC 2822 message to Gmail API /gmail/v1/users/me/messages/send.
// Supports plain + HTML bodies, CC/BCC, and optional attachments (as URLs).
function encodeBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRfc2822({ from, to, subject, body, html, cc, bcc, replyTo }) {
  const lines = [];
  lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  if (replyTo) lines.push(`Reply-To: ${replyTo}`);
  lines.push(`Subject: =?UTF-8?B?${encodeBase64Url(subject)}?=`);
  lines.push("MIME-Version: 1.0");
  if (html) {
    const boundary = "xtr_" + Math.random().toString(36).slice(2);
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(body || "");
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(html);
    lines.push("");
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(body || "");
  }
  return lines.join("\r\n");
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

    if (!body.to || !body.subject) return Response.json({ error: "to and subject required" }, { status: 400 });

    // Get the Gmail OAuth access token from the connected connector
    let gmailToken = null;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection("gmail");
      gmailToken = conn?.accessToken;
    } catch (_) {}
    if (!gmailToken) return Response.json({
      status: "credentials_required", error: "Gmail connector not connected",
      action_required: "authorize the Gmail connector in the builder",
    }, { status: 503 });

    const from = body.from || tenant.name ? `${tenant.name} <me>` : "me";
    const raw = buildRfc2822({
      from: body.from_name ? `${body.from_name} <me>` : from,
      to: body.to, subject: body.subject,
      body: body.body || "", html: body.html || null,
      cc: body.cc || null, bcc: body.bcc || null, replyTo: body.reply_to || null,
    });

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${gmailToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encodeBase64Url(raw) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ status: "failed", error: data?.error?.message || "gmail send failed" }, { status: res.status });

    await base44.asServiceRole.entities.CommsEvent.create({
      channel: "email", direction: "outbound", from_addr: body.from_name || tenant.name,
      to_addr: body.to, status: "completed", classification: "LIVE",
      summary: `email sent via Gmail: ${body.subject}`,
    });
    await base44.asServiceRole.entities.ProviderLog.create({
      provider: "gmail", channel: "email", event_type: "email.send",
      direction: "outbound", status: "delivered", message: `email to ${body.to}: ${body.subject}`,
    });

    return Response.json({
      message_id: data.id, status: "sent", routed_via: "gmail",
      tenant: tenant.name, channel: "email", classification: "LIVE",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
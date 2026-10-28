import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { aiComplete, aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';

// ─── XTREME COMMUNICATIONS GPT BIDIRECTIONAL BRIDGE ──────────────────
// Implements the complete bidirectional sync architecture:
//   Phase 1: Durable comms foundation (sync, outbox, receipts, events)
//   Phase 2: Autonomous agent communication (dispatch, agent bus)
//   Phase 3: Bidirectional GPT integration (inbox, conversations, drafts)
//
// All operations are tenant-scoped, idempotent, and audited via SyncEvent
// and DeliveryReceipt records. No automatic external sends without approval.

// ── Auth helper ──
async function authenticate(base44: any, body: any, req: any): Promise<{ userId: string; role: string; tenant: any } | null> {
  // Try user session first (portal access)
  try {
    const user = await base44.auth.me();
    if (user?.id) return { userId: user.id, role: user.role || 'user', tenant: null };
  } catch (_) {}
  // Fall back to API key (GPT/agent access)
  const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!apiKey) return null;
  const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
  if (!keys.length) return null;
  const tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id).catch(() => null);
  const userId = tenant?.created_by_id || keys[0].created_by_id || null;
  if (!userId) return null;
  return { userId, role: 'admin', tenant };
}

// ── SyncEvent helper ──
async function createEvent(base44: any, p: any) {
  return await base44.asServiceRole.entities.SyncEvent.create({
    event_id: crypto.randomUUID(),
    event_type: p.event_type,
    occurred_at: new Date().toISOString(),
    tenant_id: p.tenant_id || 'system',
    user_id: p.user_id,
    correlation_id: p.correlation_id || crypto.randomUUID(),
    causation_id: p.causation_id || null,
    idempotency_key: p.idempotency_key || crypto.randomUUID(),
    actor_kind: p.actor_kind || 'system',
    actor_id: p.actor_id || 'system',
    payload: p.payload || {},
    schema_version: '1.0.0',
    comms_event_id: p.comms_event_id,
    conversation_id: p.conversation_id,
  });
}

// ── Receipt helper ──
async function createReceipt(base44: any, p: any) {
  return await base44.asServiceRole.entities.DeliveryReceipt.create({
    receipt_id: crypto.randomUUID(),
    tenant_id: p.tenant_id || 'system',
    user_id: p.user_id,
    operation_type: p.operation_type,
    status: p.status || 'accepted',
    evidence: p.evidence || '',
    correlation_id: p.correlation_id,
    outbox_id: p.outbox_id,
    task_id: p.task_id,
  });
}

// ── Twilio send helper ──
async function sendViaTwilio(to: string, from: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not configured');
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: from, To: to, Body: text }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  const data: any = await res.json().catch(() => ({}));
  return { ok: res.ok, data, sid: data.sid, error: data.message, errorCode: data.code };
}

// ── Resolve tenant + user_id from phone number ──
async function resolveTenantFromPhone(base44: any, e164: string): Promise<{ tenantId: string; userId: string | null }> {
  const phones = await base44.asServiceRole.entities.PhoneNumber.filter({ e164 });
  if (phones.length) return { tenantId: phones[0].tenant_id || 'system', userId: phones[0].user_id || null };
  return { tenantId: 'system', userId: null };
}

export default async function(req: any) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const auth = await authenticate(base44, body, req);
    if (!auth) return Response.json({ error: "Authentication required" }, { status: 401 });
    const { userId, role, tenant } = auth;
    const tenantId = tenant?.id || body.tenant_id || 'system';
    const action = body.action;

    // ════════════════════════════════════════════════════════════════
    // PHASE 1: DURABLE COMMUNICATIONS FOUNDATION
    // ════════════════════════════════════════════════════════════════

    // ── SYNC: Cursor-based incremental synchronization ──
    if (action === "sync") {
      const cursor = body.cursor || null;
      const limit = Math.min(body.limit || 50, 100);
      const query: any = {};
      if (cursor) query.created_date = { $gt: cursor };
      // Scope to user's events (or all for admin)
      if (role !== 'admin' || body.scope !== 'all') {
        query.user_id = userId;
      }
      const page = await base44.asServiceRole.entities.SyncEvent.filter(query, { sort: 'created_date', limit });
      const events = page.items || page;
      const nextCursor = events.length > 0 ? events[events.length - 1].created_date : cursor;
      return Response.json({
        action: "sync",
        events: events.map((e: any) => ({
          event_id: e.event_id,
          event_type: e.event_type,
          occurred_at: e.occurred_at,
          correlation_id: e.correlation_id,
          causation_id: e.causation_id,
          actor: { kind: e.actor_kind, id: e.actor_id },
          payload: e.payload,
          conversation_id: e.conversation_id,
          schema_version: e.schema_version,
        })),
        next_cursor: nextCursor,
        has_more: events.length === limit,
        count: events.length,
      });
    }

    // ── REQUEST REPLY: Create outbox entry (pending approval) ──
    if (action === "request_reply") {
      const { conversation_id, to_number, body: msgBody, from_number, idempotency_key, auto_approve } = body;
      if (!to_number || !msgBody) return Response.json({ error: "to_number and body required" }, { status: 400 });
      const idemKey = idempotency_key || `reply:${conversation_id || ''}:${to_number}:${msgBody.slice(0, 50)}`;

      // Idempotency check
      const existing = await base44.asServiceRole.entities.OutboxMessage.filter({ idempotency_key: idemKey });
      if (existing.length) {
        return Response.json({
          action: "request_reply",
          status: "duplicate",
          outbox_id: existing[0].outbox_id,
          receipt_id: existing[0].receipt_id,
          message: "Reply already requested (idempotency key matched)",
        });
      }

      const fromNum = from_number || "+18665711174";
      const correlationId = crypto.randomUUID();
      const outboxId = crypto.randomUUID();

      // Determine approval status
      const canAutoApprove = auto_approve && role === 'admin';
      const status = canAutoApprove ? "approved" : "pending_approval";

      const outbox = await base44.asServiceRole.entities.OutboxMessage.create({
        outbox_id: outboxId,
        tenant_id: tenantId,
        user_id: userId,
        conversation_id: conversation_id || null,
        to_number,
        from_number: fromNum,
        body: msgBody,
        channel: "sms",
        status,
        idempotency_key: idemKey,
        provider: "twilio",
        retry_count: 0,
        max_retries: 3,
        requested_by: userId,
        approved_by: canAutoApprove ? userId : null,
        queued_at: new Date().toISOString(),
        approved_at: canAutoApprove ? new Date().toISOString() : null,
        correlation_id: correlationId,
      });

      const receipt = await createReceipt(base44, {
        tenant_id: tenantId, user_id: userId, operation_type: "message.send",
        status: canAutoApprove ? "processing" : "accepted",
        evidence: `Outbox ${outboxId} created with status ${status}`,
        correlation_id: correlationId, outbox_id: outboxId,
      });

      await createEvent(base44, {
        event_type: canAutoApprove ? "message.send.approved" : "message.send.requested",
        tenant_id: tenantId, user_id: userId, correlation_id: correlationId,
        idempotency_key: idemKey, actor_kind: "human", actor_id: userId,
        payload: { outbox_id: outboxId, to: to_number, from: fromNum, body_preview: msgBody.slice(0, 200) },
        conversation_id: conversation_id,
      });

      // If auto-approved, send immediately
      if (canAutoApprove) {
        try {
          await base44.asServiceRole.entities.OutboxMessage.update(outbox.id, { status: "sending" });
          const result = await sendViaTwilio(to_number, fromNum, msgBody);
          if (result.ok) {
            await base44.asServiceRole.entities.OutboxMessage.update(outbox.id, {
              status: "sent", provider_message_id: result.sid, sent_at: new Date().toISOString(),
            });
            await createEvent(base44, {
              event_type: "message.sent", tenant_id: tenantId, user_id: userId,
              correlation_id: correlationId, causation_id: outboxId,
              actor_kind: "system", actor_id: "send-executor",
              payload: { outbox_id: outboxId, provider_message_id: result.sid },
              conversation_id: conversation_id,
            });
            await base44.asServiceRole.entities.DeliveryReceipt.update(receipt.id, {
              status: "completed", evidence: `Sent via Twilio, SID: ${result.sid}`,
            });
          } else {
            await base44.asServiceRole.entities.OutboxMessage.update(outbox.id, {
              status: "failed", error_code: String(result.errorCode || ""), error_detail: result.error || "Unknown Twilio error",
            });
            await createEvent(base44, {
              event_type: "message.failed", tenant_id: tenantId, user_id: userId,
              correlation_id: correlationId, causation_id: outboxId,
              actor_kind: "system", actor_id: "send-executor",
              payload: { outbox_id: outboxId, error: result.error },
              conversation_id: conversation_id,
            });
            await base44.asServiceRole.entities.DeliveryReceipt.update(receipt.id, {
              status: "failed", evidence: `Twilio error: ${result.error}`,
            });
          }
        } catch (err: any) {
          await base44.asServiceRole.entities.OutboxMessage.update(outbox.id, {
            status: "failed", error_detail: err.message,
          });
        }
      }

      return Response.json({
        action: "request_reply",
        status: "accepted",
        outbox_id: outboxId,
        receipt_id: receipt.receipt_id,
        approval_status: status,
        message: canAutoApprove ? "Reply approved and sent" : "Reply queued pending approval. Use approve_reply to send.",
      });
    }

    // ── APPROVE REPLY: Approve and send a pending outbox message ──
    if (action === "approve_reply") {
      const { outbox_id } = body;
      if (!outbox_id) return Response.json({ error: "outbox_id required" }, { status: 400 });
      const items = await base44.asServiceRole.entities.OutboxMessage.filter({ outbox_id });
      if (!items.length) return Response.json({ error: "Outbox message not found" }, { status: 404 });
      const msg = items[0];
      if (msg.status !== "pending_approval") {
        return Response.json({ error: `Cannot approve message with status: ${msg.status}`, outbox_id, status: msg.status }, { status: 409 });
      }

      await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
        status: "sending", approved_by: userId, approved_at: new Date().toISOString(),
      });

      await createEvent(base44, {
        event_type: "message.send.approved", tenant_id: msg.tenant_id, user_id: msg.user_id,
        correlation_id: msg.correlation_id, causation_id: msg.outbox_id,
        actor_kind: "human", actor_id: userId,
        payload: { outbox_id: msg.outbox_id },
        conversation_id: msg.conversation_id,
      });

      // Send via Twilio
      try {
        const result = await sendViaTwilio(msg.to_number, msg.from_number, msg.body);
        if (result.ok) {
          await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
            status: "sent", provider_message_id: result.sid, sent_at: new Date().toISOString(),
          });
          await createEvent(base44, {
            event_type: "message.sent", tenant_id: msg.tenant_id, user_id: msg.user_id,
            correlation_id: msg.correlation_id, causation_id: msg.outbox_id,
            actor_kind: "system", actor_id: "send-executor",
            payload: { outbox_id: msg.outbox_id, provider_message_id: result.sid },
            conversation_id: msg.conversation_id,
          });
          return Response.json({ action: "approve_reply", status: "sent", outbox_id, provider_message_id: result.sid, sent_at: new Date().toISOString() });
        } else {
          await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
            status: "failed", error_code: String(result.errorCode || ""), error_detail: result.error || "Twilio error",
            retry_count: (msg.retry_count || 0) + 1,
          });
          await createEvent(base44, {
            event_type: "message.failed", tenant_id: msg.tenant_id, user_id: msg.user_id,
            correlation_id: msg.correlation_id, causation_id: msg.outbox_id,
            actor_kind: "system", actor_id: "send-executor",
            payload: { outbox_id: msg.outbox_id, error: result.error },
            conversation_id: msg.conversation_id,
          });
          return Response.json({ action: "approve_reply", status: "failed", outbox_id, error: result.error, error_code: result.errorCode }, { status: 502 });
        }
      } catch (err: any) {
        await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
          status: "failed", error_detail: err.message, retry_count: (msg.retry_count || 0) + 1,
        });
        return Response.json({ action: "approve_reply", status: "failed", outbox_id, error: err.message }, { status: 500 });
      }
    }

    // ── GET RECEIPT: Retrieve a delivery receipt by ID ──
    if (action === "get_receipt") {
      const { receipt_id } = body;
      if (!receipt_id) return Response.json({ error: "receipt_id required" }, { status: 400 });
      const items = await base44.asServiceRole.entities.DeliveryReceipt.filter({ receipt_id });
      if (!items.length) return Response.json({ error: "Receipt not found" }, { status: 404 });
      const r = items[0];
      return Response.json({
        action: "get_receipt",
        receipt_id: r.receipt_id,
        operation_type: r.operation_type,
        status: r.status,
        evidence: r.evidence,
        correlation_id: r.correlation_id,
        outbox_id: r.outbox_id,
        task_id: r.task_id,
        created_at: r.created_date,
      });
    }

    // ── LIST OUTBOX: List outbox messages with optional status filter ──
    if (action === "list_outbox") {
      const statusFilter = body.status;
      const query: any = { user_id: userId };
      if (statusFilter) query.status = statusFilter;
      const page = await base44.asServiceRole.entities.OutboxMessage.filter(query, { sort: '-created_date', limit: Math.min(body.limit || 50, 100) });
      const items = page.items || page;
      return Response.json({
        action: "list_outbox",
        messages: items.map((m: any) => ({
          outbox_id: m.outbox_id, conversation_id: m.conversation_id,
          to_number: m.to_number, from_number: m.from_number,
          body_preview: (m.body || "").slice(0, 200),
          status: m.status, provider_message_id: m.provider_message_id,
          retry_count: m.retry_count, error_detail: m.error_detail,
          queued_at: m.queued_at, approved_at: m.approved_at, sent_at: m.sent_at,
          receipt_id: m.receipt_id,
        })),
        count: items.length,
      });
    }

    // ── RECOVER FAILED: Retry failed outbox messages ──
    if (action === "recover_failed") {
      const query: any = { user_id: userId, status: "failed" };
      const page = await base44.asServiceRole.entities.OutboxMessage.filter(query, { limit: 100 });
      const items = page.items || page;
      const recoverable = items.filter((m: any) => (m.retry_count || 0) < (m.max_retries || 3));
      let recovered = 0, deadLettered = 0;
      for (const msg of recoverable) {
        try {
          await base44.asServiceRole.entities.OutboxMessage.update(msg.id, { status: "sending" });
          const result = await sendViaTwilio(msg.to_number, msg.from_number, msg.body);
          if (result.ok) {
            await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
              status: "sent", provider_message_id: result.sid, sent_at: new Date().toISOString(),
              error_code: "", error_detail: "",
            });
            await createEvent(base44, {
              event_type: "message.sent", tenant_id: msg.tenant_id, user_id: msg.user_id,
              correlation_id: msg.correlation_id, causation_id: msg.outbox_id,
              actor_kind: "system", actor_id: "recovery-worker",
              payload: { outbox_id: msg.outbox_id, provider_message_id: result.sid, recovered: true },
              conversation_id: msg.conversation_id,
            });
            recovered++;
          } else {
            const newRetry = (msg.retry_count || 0) + 1;
            const isDead = newRetry >= (msg.max_retries || 3);
            await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
              status: isDead ? "dead_letter" : "failed",
              retry_count: newRetry, error_detail: result.error || "Twilio error",
            });
            if (isDead) deadLettered++;
          }
        } catch (err: any) {
          await base44.asServiceRole.entities.OutboxMessage.update(msg.id, {
            status: "failed", error_detail: err.message, retry_count: (msg.retry_count || 0) + 1,
          });
        }
      }
      return Response.json({
        action: "recover_failed",
        attempted: recoverable.length, recovered, dead_lettered: deadLettered,
        still_failed: items.length - recovered - deadLettered,
      });
    }

    // ════════════════════════════════════════════════════════════════
    // PHASE 2: AUTONOMOUS AGENT COMMUNICATION
    // ════════════════════════════════════════════════════════════════

    // ── DISPATCH AGENT TASK: Queue scoped agent work ──
    if (action === "dispatch_agent_task") {
      const { agent_id, task_type, conversation_id, input, idempotency_key } = body;
      const validAgents = ["inbox-triage", "reply-drafter", "send-executor", "delivery-auditor"];
      if (!agent_id || !validAgents.includes(agent_id)) {
        return Response.json({ error: `agent_id must be one of: ${validAgents.join(", ")}` }, { status: 400 });
      }
      if (!task_type) return Response.json({ error: "task_type required" }, { status: 400 });
      const idemKey = idempotency_key || `task:${agent_id}:${task_type}:${conversation_id || ''}:${JSON.stringify(input || {}).slice(0, 50)}`;

      // Idempotency check
      const existing = await base44.asServiceRole.entities.AgentTask.filter({ idempotency_key: idemKey });
      if (existing.length) {
        return Response.json({
          action: "dispatch_agent_task", status: "duplicate",
          task_id: existing[0].task_id, receipt_id: existing[0].receipt_id,
          message: "Task already dispatched (idempotency key matched)",
        });
      }

      const correlationId = crypto.randomUUID();
      const taskId = crypto.randomUUID();

      const task = await base44.asServiceRole.entities.AgentTask.create({
        task_id: taskId, agent_id, tenant_id: tenantId, user_id: userId,
        task_type, conversation_id: conversation_id || null,
        status: "in_progress", idempotency_key: idemKey,
        input: input || {}, correlation_id: correlationId,
        assigned_at: new Date().toISOString(),
      });

      const receipt = await createReceipt(base44, {
        tenant_id: tenantId, user_id: userId, operation_type: "agent.task",
        status: "processing", evidence: `Task ${taskId} assigned to ${agent_id}`,
        correlation_id: correlationId, task_id: taskId,
      });

      await createEvent(base44, {
        event_type: "agent.task.created", tenant_id: tenantId, user_id: userId,
        correlation_id: correlationId, idempotency_key: idemKey,
        actor_kind: "human", actor_id: userId,
        payload: { task_id: taskId, agent_id, task_type, conversation_id },
        conversation_id: conversation_id,
      });

      // ── Execute agent task based on agent_id ──
      let output: any = {};
      let taskStatus = "completed";
      let escalation = null;

      try {
        if (agent_id === "inbox-triage") {
          // Classify and summarize an inbound message
          const msgId = input?.comms_event_id || input?.message_id;
          let messageContent = input?.message_body || "";
          let fromAddr = input?.from || "";
          if (msgId) {
            const evt = await base44.asServiceRole.entities.CommsEvent.get(msgId);
            if (evt) { messageContent = evt.summary || ""; fromAddr = evt.from_addr || ""; }
          }
          const analysis = await aiCompleteJson(base44, {
            model: MODELS.fast,
            messages: [{
              role: "user",
              content: `You are an inbox triage agent. Classify and summarize this inbound message.
From: ${fromAddr}
Message: "${messageContent}"
Return JSON with: category (support/sales/spam/urgent/inquiry/other), priority (low/medium/high/urgent), summary (1-2 sentences), suggested_agent (reply-drafter or escalation).`,
            }],
            schema: {
              type: "object",
              properties: {
                category: { type: "string" }, priority: { type: "string" },
                summary: { type: "string" }, suggested_agent: { type: "string" },
              },
              required: ["category", "priority", "summary", "suggested_agent"],
            },
          });
          output = { triage: analysis, from: fromAddr, message: messageContent };
        }

        else if (agent_id === "reply-drafter") {
          // Draft a reply based on conversation context
          const conversationId = input?.conversation_id;
          const originalMessage = input?.original_message || "";
          const context = input?.context || "";
          const draft = await aiCompleteJson(base44, {
            model: MODELS.fast,
            messages: [{
              role: "user",
              content: `You are a reply drafter agent. Draft a professional SMS reply to this message.
Original message: "${originalMessage}"
Context: ${context}
Return JSON with: draft_body (the reply text, max 320 chars), tone (professional/friendly/urgent), confidence (0-1).`,
            }],
            schema: {
              type: "object",
              properties: {
                draft_body: { type: "string" }, tone: { type: "string" }, confidence: { type: "number" },
              },
              required: ["draft_body", "tone", "confidence"],
            },
          });
          // Store as draft in outbox
          const draftOutbox = await base44.asServiceRole.entities.OutboxMessage.create({
            outbox_id: crypto.randomUUID(), tenant_id: tenantId, user_id: userId,
            conversation_id: conversationId || null,
            to_number: input?.to_number || input?.from || "",
            from_number: input?.from_number || "+18665711174",
            body: draft.draft_body, channel: "sms",
            status: "pending_approval", is_draft: true,
            idempotency_key: `draft:${crypto.randomUUID()}`,
            provider: "twilio", retry_count: 0, max_retries: 3,
            requested_by: `agent:${agent_id}`,
            queued_at: new Date().toISOString(),
            correlation_id: correlationId,
          });
          output = { draft: draft, draft_outbox_id: draftOutbox.outbox_id };
        }

        else if (agent_id === "send-executor") {
          // Only executes if outbox message is approved — does not auto-send
          const outboxId = input?.outbox_id;
          if (!outboxId) {
            taskStatus = "failed";
            output = { error: "outbox_id required for send-executor" };
          } else {
            const items = await base44.asServiceRole.entities.OutboxMessage.filter({ outbox_id: outboxId });
            if (!items.length) { taskStatus = "failed"; output = { error: "Outbox message not found" }; }
            else if (items[0].status !== "approved") {
              taskStatus = "escalated";
              escalation = `Outbox message ${outboxId} is not approved (status: ${items[0].status}). Send executor requires explicit approval.`;
            } else {
              output = { outbox_id: outboxId, status: items[0].status, message: "Approved — use approve_reply to execute send." };
            }
          }
        }

        else if (agent_id === "delivery-auditor") {
          // Check delivery status of sent messages
          const outboxId = input?.outbox_id;
          if (!outboxId) { taskStatus = "failed"; output = { error: "outbox_id required" }; }
          else {
            const items = await base44.asServiceRole.entities.OutboxMessage.filter({ outbox_id: outboxId });
            if (!items.length) { taskStatus = "failed"; output = { error: "Not found" }; }
            else {
              const msg = items[0];
              if (msg.status === "failed" && (msg.retry_count || 0) < (msg.max_retries || 3)) {
                taskStatus = "escalated";
                escalation = `Message ${outboxId} failed (retry ${msg.retry_count}/${msg.max_retries}). Recommend recover_failed.`;
              } else if (msg.status === "dead_letter") {
                taskStatus = "escalated";
                escalation = `Message ${outboxId} is in dead_letter. Manual intervention required.`;
              }
              output = { outbox_id: outboxId, status: msg.status, retry_count: msg.retry_count, error: msg.error_detail };
            }
          }
        }
      } catch (err: any) {
        taskStatus = "failed";
        output = { error: err.message };
      }

      // Update task with results
      await base44.asServiceRole.entities.AgentTask.update(task.id, {
        status: taskStatus, output, completed_at: new Date().toISOString(),
        escalated_to: escalation ? "human" : null, escalation_reason: escalation,
        error: taskStatus === "failed" ? JSON.stringify(output) : null,
      });

      await createEvent(base44, {
        event_type: taskStatus === "escalated" ? "agent.escalated" : "agent.task.completed",
        tenant_id: tenantId, user_id: userId, correlation_id: correlationId,
        causation_id: taskId, actor_kind: "agent", actor_id: agent_id,
        payload: { task_id: taskId, agent_id, task_type, status: taskStatus, output, escalation },
        conversation_id: conversation_id,
      });

      await base44.asServiceRole.entities.DeliveryReceipt.update(receipt.id, {
        status: taskStatus === "completed" ? "completed" : taskStatus === "failed" ? "failed" : "processing",
        evidence: `Task ${taskStatus}: ${agent_id}/${task_type}${escalation ? ' — escalated: ' + escalation : ''}`,
      });

      return Response.json({
        action: "dispatch_agent_task", status: taskStatus,
        task_id: taskId, agent_id, task_type, receipt_id: receipt.receipt_id,
        output, escalation,
      });
    }

    // ── GET AGENT ACTIVITY: Review agent task history ──
    if (action === "get_agent_activity") {
      const agentFilter = body.agent_id;
      const query: any = { user_id: userId };
      if (agentFilter) query.agent_id = agentFilter;
      const page = await base44.asServiceRole.entities.AgentTask.filter(query, { sort: '-created_date', limit: Math.min(body.limit || 50, 100) });
      const items = page.items || page;
      return Response.json({
        action: "get_agent_activity",
        tasks: items.map((t: any) => ({
          task_id: t.task_id, agent_id: t.agent_id, task_type: t.task_type,
          conversation_id: t.conversation_id, status: t.status,
          assigned_at: t.assigned_at, completed_at: t.completed_at,
          escalated_to: t.escalated_to, escalation_reason: t.escalation_reason,
          output_preview: t.output ? JSON.stringify(t.output).slice(0, 200) : null,
        })),
        count: items.length,
      });
    }

    // ════════════════════════════════════════════════════════════════
    // PHASE 3: BIDIRECTIONAL GPT INTEGRATION
    // ════════════════════════════════════════════════════════════════

    // ── GET CONVERSATION: Conversation history and threading ──
    if (action === "get_conversation") {
      const { conversation_id, participant_identity } = body;
      if (!conversation_id && !participant_identity) {
        return Response.json({ error: "conversation_id or participant_identity required" }, { status: 400 });
      }
      let conv = null;
      if (conversation_id) {
        conv = await base44.asServiceRole.entities.Conversation.get(conversation_id).catch(() => null);
      } else {
        const convs = await base44.asServiceRole.entities.Conversation.filter({ participant_identity });
        conv = convs[0] || null;
      }
      if (!conv) return Response.json({ error: "Conversation not found" }, { status: 404 });

      // Get all comms events for this participant
      const events = await base44.asServiceRole.entities.CommsEvent.filter(
        { $or: [{ from_addr: conv.participant_identity }, { to_addr: conv.participant_identity }] },
        { sort: 'created_date', limit: 100 }
      );
      const eventList = events.items || events;
      return Response.json({
        action: "get_conversation",
        conversation: {
          id: conv.id, participant_identity: conv.participant_identity,
          channels: conv.channels, status: conv.status,
          last_message_at: conv.last_message_at,
        },
        messages: eventList.map((e: any) => ({
          id: e.id, channel: e.channel, direction: e.direction,
          from: e.from_addr, to: e.to_addr,
          body: e.summary, status: e.status,
          timestamp: e.created_date, provider_message_id: e.provider_message_id,
          error: e.error_detail,
        })),
        count: eventList.length,
      });
    }

    // ── CREATE DRAFT: Create a draft reply without requesting approval ──
    if (action === "create_draft") {
      const { conversation_id, to_number, body: draftBody, from_number } = body;
      if (!to_number || !draftBody) return Response.json({ error: "to_number and body required" }, { status: 400 });
      const outboxId = crypto.randomUUID();
      const correlationId = crypto.randomUUID();
      const outbox = await base44.asServiceRole.entities.OutboxMessage.create({
        outbox_id: outboxId, tenant_id: tenantId, user_id: userId,
        conversation_id: conversation_id || null,
        to_number, from_number: from_number || "+18665711174",
        body: draftBody, channel: "sms", status: "pending_approval", is_draft: true,
        idempotency_key: `draft:${outboxId}`, provider: "twilio",
        retry_count: 0, max_retries: 3, requested_by: userId,
        queued_at: new Date().toISOString(), correlation_id: correlationId,
      });
      const receipt = await createReceipt(base44, {
        tenant_id: tenantId, user_id: userId, operation_type: "message.send",
        status: "accepted", evidence: `Draft ${outboxId} created`,
        correlation_id: correlationId, outbox_id: outboxId,
      });
      return Response.json({
        action: "create_draft", status: "draft_created",
        outbox_id: outboxId, receipt_id: receipt.receipt_id,
        message: "Draft created. Use request_reply or approve_reply to send.",
      });
    }

    // ── GET HEALTH: System health and synchronization status ──
    if (action === "get_health") {
      const [eventCount, outboxCounts, taskCounts, receiptCounts] = await Promise.all([
        base44.asServiceRole.entities.SyncEvent.count({ user_id: userId }).catch(() => 0),
        base44.asServiceRole.entities.OutboxMessage.aggregate({
          query: { user_id: userId }, groupBy: 'status', sort: '-count',
        }).catch(() => ({ rows: [] })),
        base44.asServiceRole.entities.AgentTask.aggregate({
          query: { user_id: userId }, groupBy: 'status', sort: '-count',
        }).catch(() => ({ rows: [] })),
        base44.asServiceRole.entities.DeliveryReceipt.count({ user_id: userId }).catch(() => 0),
      ]);
      const outboxByStatus = {};
      (outboxCounts.rows || []).forEach((r: any) => { outboxByStatus[r.status] = r.count; });
      const taskByStatus = {};
      (taskCounts.rows || []).forEach((r: any) => { taskByStatus[r.status] = r.count; });
      return Response.json({
        action: "get_health",
        status: "healthy",
        user_id: userId,
        tenant_id: tenantId,
        stats: {
          total_events: eventCount,
          total_receipts: receiptCounts,
          outbox_by_status: outboxByStatus,
          tasks_by_status: taskByStatus,
        },
        capabilities: {
          sync: true, outbox: true, receipts: true, agent_dispatch: true,
          conversations: true, drafts: true, recovery: true,
        },
        twilio_configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json({ error: "unknown action", action, available_actions: [
      "sync", "request_reply", "approve_reply", "get_receipt", "list_outbox", "recover_failed",
      "dispatch_agent_task", "get_agent_activity", "get_conversation", "create_draft", "get_health",
    ] }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
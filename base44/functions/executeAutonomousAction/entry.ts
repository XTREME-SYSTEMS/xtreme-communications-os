import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiCompleteJson, aiComplete, MODELS } from '../../shared/aiGateway.ts';
import { sendTelnyx, getTelnyxEndpoint, personalize } from '../../shared/telnyxMessaging.ts';
import { isConfigured as bbConfigured, runAgent as bbRunAgent, pollAgentRun as bbPoll, createSession as bbCreateSession, getSession as bbGetSession, endSession as bbEndSession } from '../../shared/browserbase.ts';

// ─── AUTONOMOUS ACTION EXECUTOR ────────────────────────────────────
// Real trigger → real task → real action → real result.
// Executes SMS, voice calls, WhatsApp, AI tasks, web scraping,
// web interaction (AI-powered form analysis), and lead creation.
// All actions are logged as CommsEvent records for audit trail.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });
    const tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id);
    const now = new Date().toISOString();
    const action = body.action;

    // ── CAPABILITY STATUS: Check what's live ──
    if (action === "capability_status") {
      return Response.json({
        capabilities: {
          sms: { live: !!process.env.TELNYX_API_KEY, label: "SMS via Telnyx", detail: "Real SMS messaging" },
          voice: { live: !!process.env.TELNYX_API_KEY, label: "Voice Calls via Telnyx", detail: "AI voice call initiation" },
          whatsapp: { live: !!process.env.TELNYX_API_KEY, label: "WhatsApp via Telnyx", detail: "WhatsApp Business messaging" },
          ai_gateway: { live: !!process.env.VERCEL_AI_GATEWAY_API_KEY, label: "Vercel AI Gateway", detail: "Multi-model LLM routing" },
          web_scrape: { live: true, label: "Web Scraper", detail: "Fetch & extract page content" },
          web_interact: { live: !!process.env.VERCEL_AI_GATEWAY_API_KEY, label: "AI Web Interaction", detail: "AI-powered form analysis & action planning" },
          cloud_browser: { live: bbConfigured(), label: "Cloud Browser (Browserbase)", detail: bbConfigured() ? "Full browser automation — navigate, fill forms, click" : "Needs BROWSERBASE_API_KEY" },
          email: { live: false, label: "Email", detail: "Blocked by credit exhaustion until 2026-09-12" },
          lead_creation: { live: true, label: "CRM Lead Creation", detail: "Create contacts in XTREME CRM" },
        },
      });
    }

    // ── SEND SMS ──
    if (action === "send_sms") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });
      const { from_number, to_number, message } = body;
      if (!to_number || !message) return Response.json({ error: "to_number and message required" }, { status: 400 });
      const endpoint = getTelnyxEndpoint("sms");
      const result = await sendTelnyx(telnyxKey, endpoint, { from: from_number || "+18334843799", to: to_number, text: message });
      await base44.asServiceRole.entities.CommsEvent.create({
        tenant_id: tenant.id, channel: "sms", direction: "outbound",
        from_number: from_number || "+18334843799", to_number, body: message,
        status: result.ok ? "sent" : "failed", event_type: "autonomous_action_test",
      });
      return Response.json({ action: "send_sms", status: result.ok ? "sent" : "failed", ok: result.ok, response: result.data, to: to_number, message });
    }

    // ── SEND WHATSAPP ──
    if (action === "send_whatsapp") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });
      const { from_number, to_number, message } = body;
      if (!to_number || !message) return Response.json({ error: "to_number and message required" }, { status: 400 });
      const endpoint = getTelnyxEndpoint("whatsapp");
      const result = await sendTelnyx(telnyxKey, endpoint, { from: from_number || "+18334843799", to: to_number, text: message });
      await base44.asServiceRole.entities.CommsEvent.create({
        tenant_id: tenant.id, channel: "whatsapp", direction: "outbound",
        from_number: from_number || "+18334843799", to_number, body: message,
        status: result.ok ? "sent" : "failed", event_type: "autonomous_action_test",
      });
      return Response.json({ action: "send_whatsapp", status: result.ok ? "sent" : "failed", ok: result.ok, response: result.data });
    }

    // ── MAKE VOICE CALL (Telnyx Call Control) ──
    if (action === "make_call") {
      const telnyxKey = process.env.TELNYX_API_KEY;
      if (!telnyxKey) return Response.json({ error: "TELNYX_API_KEY not configured" }, { status: 503 });
      const { from_number, to_number, connection_id, webhook_url } = body;
      if (!to_number) return Response.json({ error: "to_number required" }, { status: 400 });
      const res = await fetch("https://api.telnyx.com/v2/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${telnyxKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_id: connection_id || process.env.TELNYX_CONNECTION_ID || "",
          to: to_number,
          from: from_number || "+19549102671",
          webhook_url: webhook_url || "https://xtreme-comms.base44.app/functions/telnyxWebhook",
        }),
      });
      let data: any = {};
      try { data = await res.json(); } catch (_) {}
      await base44.asServiceRole.entities.CommsEvent.create({
        tenant_id: tenant.id, channel: "voice", direction: "outbound",
        from_number: from_number || "+19549102671", to_number, body: `AI voice call`,
        status: res.ok ? "call_initiated" : "failed", event_type: "autonomous_action_test",
      });
      return Response.json({ action: "make_call", status: res.ok ? "call_initiated" : "failed", ok: res.ok, response: data });
    }

    // ── AI TASK (Vercel AI Gateway) ──
    if (action === "ai_task") {
      const { prompt, model, schema } = body;
      if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });
      if (schema) {
        const result = await aiCompleteJson({ model: model || MODELS.fast, messages: [{ role: "user", content: prompt }], schema });
        return Response.json({ action: "ai_task", status: "completed", result, model: model || MODELS.fast });
      } else {
        const result = await aiComplete({ model: model || MODELS.fast, messages: [{ role: "user", content: prompt }] });
        return Response.json({ action: "ai_task", status: "completed", result, model: model || MODELS.fast });
      }
    }

    // ── WEB SCRAPE (fetch + extract) ──
    if (action === "web_scrape") {
      const { url } = body;
      if (!url) return Response.json({ error: "url required" }, { status: 400 });
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; XTREME-AI/1.0)" } });
      const html = await res.text();
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
      const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]).filter(l => l.startsWith("http")).slice(0, 20);
      const forms = [...html.matchAll(/<form[^>]*>/gi)].length;
      return Response.json({ action: "web_scrape", status: "completed", url, title, content: text.slice(0, 5000), content_length: text.length, links_found: links.length, links, forms_found: forms });
    }

    // ── WEB INTERACT (AI-powered form analysis & action planning) ──
    if (action === "web_interact") {
      const { url, goal } = body;
      if (!url) return Response.json({ error: "url required" }, { status: 400 });
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; XTREME-AI/1.0)" } });
      const html = await res.text();
      const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const formMatches = [...html.matchAll(/<form[^>]*>[\s\S]*?<\/form>/gi)];
      const inputs = [...html.matchAll(/<(?:input|textarea|select)[^>]*name=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);

      const analysis = await aiCompleteJson({
        model: MODELS.fast,
        messages: [{
          role: "user",
          content: `You are an autonomous web interaction agent. Analyze this web page and determine actions.
URL: ${url}
GOAL: ${goal || "Extract information and identify actionable forms"}

PAGE CONTENT (first 3000 chars):
${text.slice(0, 3000)}

FORM INPUTS FOUND: ${inputs.join(", ") || "none"}
FORMS FOUND: ${formMatches.length}

Provide a JSON analysis with:
- page_type: What type of page (landing, contact_form, login, directory, article, etc.)
- key_information: Key information found
- forms: Array of {action, method, fields} for each form
- form_data: If forms exist, suggest data to fill based on the goal
- recommended_actions: What the AI agent should do next
- links_to_follow: Relevant links to visit next
- ready_to_submit: true if form data is ready to be submitted`,
        }],
        schema: {
          type: "object",
          properties: {
            page_type: { type: "string" },
            key_information: { type: "string" },
            forms: { type: "array", items: { type: "object", properties: { action: { type: "string" }, method: { type: "string" }, fields: { type: "array", items: { type: "string" } } } } },
            form_data: { type: "object" },
            recommended_actions: { type: "array", items: { type: "string" } },
            links_to_follow: { type: "array", items: { type: "string" } },
            ready_to_submit: { type: "boolean" },
          },
          required: ["page_type", "key_information", "recommended_actions", "ready_to_submit"],
        },
      });
      return Response.json({ action: "web_interact", status: "completed", url, analysis, forms_found: formMatches.length, inputs_found: inputs });
    }

    // ── CREATE LEAD ──
    if (action === "create_lead") {
      const { name, phone, email, company, industry } = body;
      if (!name) return Response.json({ error: "name required" }, { status: 400 });
      const contact = await base44.asServiceRole.entities.XtremeCrmContact.create({
        full_name: name, phone: phone || "", email: email || "", company: company || "",
        industry: industry || "", lead_source: "autonomous_action", lifecycle_stage: "lead",
      });
      return Response.json({ action: "create_lead", status: "created", contact_id: contact.id, name });
    }

    // ── AUTONOMOUS SEQUENCE: Trigger → Task → Action chain ──
    if (action === "autonomous_sequence") {
      const { trigger, steps } = body;
      const results: any[] = [];
      const executedSteps = steps || [
        { type: "ai_task", prompt: `Analyze this trigger and determine the best action: ${trigger}` },
        { type: "web_scrape", url: body.target_url || "https://httpbin.org/get" },
        { type: "create_lead", name: body.lead_name || "Test Lead", phone: body.lead_phone || "", company: body.lead_company || "" },
        { type: "send_sms", to_number: body.test_number || "", message: body.test_message || "Autonomous action test from XTREME AI" },
      ];

      for (const step of executedSteps) {
        try {
          let stepResult: any;
          if (step.type === "ai_task") {
            stepResult = await aiComplete({ model: MODELS.fast, messages: [{ role: "user", content: step.prompt }] });
          } else if (step.type === "web_scrape") {
            const r = await fetch(step.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; XTREME-AI/1.0)" } });
            const html = await r.text();
            stepResult = { title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "", content_length: html.length };
          } else if (step.type === "create_lead") {
            const c = await base44.asServiceRole.entities.XtremeCrmContact.create({
              full_name: step.name || "Auto Lead", phone: step.phone || "", company: step.company || "", lead_source: "autonomous_sequence",
            });
            stepResult = { contact_id: c.id };
          } else if (step.type === "send_sms") {
            const telnyxKey = process.env.TELNYX_API_KEY;
            if (telnyxKey && step.to_number) {
              const r = await sendTelnyx(telnyxKey, getTelnyxEndpoint("sms"), { from: step.from_number || "+18334843799", to: step.to_number, text: step.message });
              stepResult = { sent: r.ok };
            } else {
              stepResult = { skipped: "no telnyx key or number" };
            }
          } else {
            stepResult = { skipped: "unknown step type" };
          }
          results.push({ step: step.type, status: "completed", result: stepResult });
        } catch (err: any) {
          results.push({ step: step.type, status: "failed", error: err.message });
        }
      }
      return Response.json({ action: "autonomous_sequence", trigger, status: "completed", steps_executed: results.length, results });
    }

    // ── BROWSER AGENT: Natural language task → Browserbase runs it ──
    // e.g. "Go to https://example.com/contact, fill name field with 'John Doe', email with 'john@test.com', and click submit"
    if (action === "browser_agent") {
      const { task, wait_for_completion } = body;
      if (!task) return Response.json({ error: "task required" }, { status: 400 });
      if (!bbConfigured()) return Response.json({ error: "BROWSERBASE_API_KEY not configured" }, { status: 503 });
      const run = await bbRunAgent(task);
      // If wait_for_completion is true, poll until done (up to 120s)
      if (wait_for_completion && run.id) {
        try {
          const completed = await bbPoll(run.id, 120000, 3000);
          return Response.json({ action: "browser_agent", status: "completed", run_id: run.id, task, result: completed });
        } catch (err: any) {
          return Response.json({ action: "browser_agent", status: "timeout_or_error", run_id: run.id, task, error: err.message });
        }
      }
      return Response.json({ action: "browser_agent", status: "started", run_id: run.id, task, run });
    }

    // ── BROWSER AGENT STATUS: Check on a running agent ──
    if (action === "browser_agent_status") {
      const { run_id } = body;
      if (!run_id) return Response.json({ error: "run_id required" }, { status: 400 });
      if (!bbConfigured()) return Response.json({ error: "BROWSERBASE_API_KEY not configured" }, { status: 503 });
      const run = await bbGetSession(run_id);
      return Response.json({ action: "browser_agent_status", run_id, status: run.status, run });
    }

    // ── BROWSER SESSION: Create a raw browser session ──
    if (action === "browser_session_create") {
      if (!bbConfigured()) return Response.json({ error: "BROWSERBASE_API_KEY not configured" }, { status: 503 });
      const session = await bbCreateSession({ keepAlive: true, timeout: 300 });
      return Response.json({ action: "browser_session_create", status: "created", session_id: session.id, connect_url: session.connectUrl, session });
    }

    // ── BROWSER SESSION STATUS ──
    if (action === "browser_session_status") {
      const { session_id } = body;
      if (!session_id) return Response.json({ error: "session_id required" }, { status: 400 });
      if (!bbConfigured()) return Response.json({ error: "BROWSERBASE_API_KEY not configured" }, { status: 503 });
      const session = await bbGetSession(session_id);
      return Response.json({ action: "browser_session_status", session_id, status: session.status, session });
    }

    // ── BROWSER SESSION END ──
    if (action === "browser_session_end") {
      const { session_id } = body;
      if (!session_id) return Response.json({ error: "session_id required" }, { status: 400 });
      if (!bbConfigured()) return Response.json({ error: "BROWSERBASE_API_KEY not configured" }, { status: 503 });
      const result = await bbEndSession(session_id);
      return Response.json({ action: "browser_session_end", session_id, ended: true, result });
    }

    // ── BROWSER FILL FORM: AI plans + Browserbase executes ──
    // Combines AI analysis with browser automation:
    // 1. AI determines what data to fill based on the goal
    // 2. Browserbase agent navigates and fills the form
    if (action === "browser_fill_form") {
      const { url, goal, form_data } = body;
      if (!url) return Response.json({ error: "url required" }, { status: 400 });
      if (!bbConfigured()) return Response.json({ error: "BROWSERBASE_API_KEY not configured" }, { status: 503 });

      // If form_data provided, use it directly. Otherwise, use AI to determine what to fill.
      let dataToFill = form_data || {};
      if (!form_data) {
        // First, fetch the page to understand its structure
        const pageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; XTREME-AI/1.0)" } });
        const html = await pageRes.text();
        const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const inputs = [...html.matchAll(/<(?:input|textarea|select)[^>]*name=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);

        // AI determines form data
        const aiResult = await aiCompleteJson({
          model: MODELS.fast,
          messages: [{
            role: "user",
            content: `Analyze this form page and determine what data to fill.
URL: ${url}
GOAL: ${goal || "Fill out the form appropriately"}
FORM FIELDS: ${inputs.join(", ") || "none detected"}
PAGE CONTENT: ${text.slice(0, 2000)}

Return a JSON object with field names as keys and appropriate values to fill.`,
          }],
          schema: {
            type: "object",
            properties: { form_data: { type: "object" }, task_description: { type: "string" } },
            required: ["form_data", "task_description"],
          },
        });
        dataToFill = aiResult.form_data || {};
      }

      // Build the natural language task for Browserbase
      const dataStr = Object.entries(dataToFill).map(([k, v]) => `'${k}' with '${v}'`).join(", ");
      const task = `Go to ${url}. Fill the form with: ${dataStr}. Then submit the form. Goal: ${goal || "Complete the form submission"}.`;

      const run = await bbRunAgent(task);
      // Poll for completion (up to 120s)
      try {
        const completed = await bbPoll(run.id, 120000, 3000);
        return Response.json({ action: "browser_fill_form", status: "completed", url, goal, form_data: dataToFill, task, run_id: run.id, result: completed });
      } catch (err: any) {
        return Response.json({ action: "browser_fill_form", status: "timeout_or_error", url, run_id: run.id, error: err.message });
      }
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
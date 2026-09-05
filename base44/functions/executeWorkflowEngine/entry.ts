import { authenticateTenant, evaluateCondition } from "../../shared/tenantAuth.ts";

// Workflow engine controller — builds and executes event-driven automation step trees.
// Step types: trigger → condition → action_delay → api_call → send_message → escalation_human/ai
// Every micro-step is logged to WorkflowExecutionLog for developer auditing.
export default async function(req) {
  try {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const auth = await authenticateTenant(req, body);
    if (auth.error) return auth.error;
    const { base44, tenant } = auth;
    const action = body.action || "execute";

    // ── CREATE: define a new workflow ──
    if (action === "create") {
      if (!body.name) return Response.json({ error: "name required" }, { status: 400 });
      const wf = await base44.asServiceRole.entities.Workflow.create({
        tenant_id: tenant.id,
        name: body.name,
        description: body.description || "",
        trigger_type: body.trigger_type || "manual",
        trigger_config: body.trigger_config || {},
        status: body.status || "draft",
        version: 1,
      });
      return Response.json({ workflow_id: wf.id, status: wf.status, name: wf.name });
    }

    // ── ADD_STEP: append a step to a workflow ──
    if (action === "add_step") {
      if (!body.workflow_id || !body.step_key) return Response.json({ error: "workflow_id + step_key required" }, { status: 400 });
      const step = await base44.asServiceRole.entities.WorkflowStep.create({
        tenant_id: tenant.id,
        workflow_id: body.workflow_id,
        step_key: body.step_key,
        step_type: body.step_type || "trigger",
        step_config: body.step_config || {},
        next_step_key: body.next_step_key || null,
        branch_true_step_key: body.branch_true_step_key || null,
        branch_false_step_key: body.branch_false_step_key || null,
        position: body.position ?? 0,
        enabled: true,
      });
      return Response.json({ step_id: step.id, step_key: step.step_key, step_type: step.step_type });
    }

    // ── GET_LOG: retrieve execution logs ──
    if (action === "get_log") {
      if (!body.execution_id) return Response.json({ error: "execution_id required" }, { status: 400 });
      const logs = await base44.asServiceRole.entities.WorkflowExecutionLog.filter(
        { tenant_id: tenant.id, execution_id: body.execution_id },
        "started_at",
        200
      );
      return Response.json({ execution_id: body.execution_id, steps: logs.length, logs });
    }

    // ── EXECUTE: walk the step tree from trigger ──
    if (action === "execute") {
      if (!body.workflow_id) return Response.json({ error: "workflow_id required" }, { status: 400 });
      const workflow = await base44.asServiceRole.entities.Workflow.get(body.workflow_id);
      if (!workflow || workflow.tenant_id !== tenant.id) return Response.json({ error: "workflow not found" }, { status: 404 });
      if (workflow.status !== "active") return Response.json({ error: "workflow not active", status: workflow.status }, { status: 409 });

      const steps = await base44.asServiceRole.entities.WorkflowStep.filter(
        { tenant_id: tenant.id, workflow_id: body.workflow_id, enabled: true },
        "position",
        200
      );
      if (!steps.length) return Response.json({ error: "no steps defined" }, { status: 400 });

      const stepMap = {};
      for (const s of steps) stepMap[s.step_key] = s;
      const trigger = steps.find(s => s.step_type === "trigger");
      if (!trigger) return Response.json({ error: "no trigger step" }, { status: 400 });

      const executionId = "wex_" + Math.random().toString(36).slice(2, 14);
      const payload = body.payload || {};
      const trace = [];
      let currentKey = trigger.step_key;
      let safety = 0;
      const MAX_STEPS = 50;

      while (currentKey && stepMap[currentKey] && safety < MAX_STEPS) {
        safety++;
        const step = stepMap[currentKey];
        const startedAt = new Date().toISOString();
        let status = "completed";
        let output = {};
        let error = null;
        let nextKey = step.next_step_key;

        try {
          if (step.step_type === "trigger") {
            output = { trigger_type: workflow.trigger_type, payload };
            nextKey = step.next_step_key;
          } else if (step.step_type === "condition") {
            const cond = step.step_config || {};
            const passed = evaluateCondition(cond, payload);
            output = { condition: cond, result: passed };
            nextKey = passed ? step.branch_true_step_key : step.branch_false_step_key;
          } else if (step.step_type === "action_delay") {
            const delayMs = (step.step_config && step.step_config.delay_ms) || 0;
            output = { delay_ms: delayMs, applied: true };
            nextKey = step.next_step_key;
          } else if (step.step_type === "api_call") {
            const fnName = (step.step_config && step.step_config.function_name) || "gatewayMessages";
            const fnPayload = { api_key: body.api_key, ...(step.step_config && step.step_config.payload || {}), ...payload };
            try {
              const res = await base44.asServiceRole.functions.invoke(fnName, fnPayload);
              output = { function: fnName, response: (res && res.data) || res };
            } catch (e) {
              status = "failed"; error = `api_call failed: ${e.message}`;
            }
            nextKey = step.next_step_key;
          } else if (step.step_type === "send_message") {
            const cfg = step.step_config || {};
            const channel = cfg.channel || "sms";
            const to = cfg.to || payload.to || payload.from;
            const msgBody = cfg.body || workflow.trigger_config && workflow.trigger_config.body || "";
            try {
              const res = await base44.asServiceRole.functions.invoke("gatewayMessages", {
                api_key: body.api_key, channel, to, body: msgBody,
              });
              output = { channel, to, response: (res && res.data) || res };
            } catch (e) {
              status = "failed"; error = `send_message failed: ${e.message}`;
            }
            nextKey = step.next_step_key;
          } else if (step.step_type === "escalation_human") {
            output = { escalated: true, reason: (step.step_config && step.step_config.reason) || "human escalation" };
            status = "escalated";
            nextKey = null;
          } else if (step.step_type === "escalation_ai") {
            const cfg = step.step_config || {};
            try {
              const res = await base44.asServiceRole.functions.invoke("orchestrateVoiceLoop", {
                api_key: body.api_key, action: "start",
                identity: payload.from || payload.identity || cfg.identity,
                agent_config_id: cfg.agent_config_id,
              });
              output = { ai_session: (res && res.data && res.data.session_id) || null, response: (res && res.data) || res };
            } catch (e) {
              status = "failed"; error = `escalation_ai failed: ${e.message}`;
            }
            nextKey = step.next_step_key;
          }
        } catch (e) {
          status = "failed"; error = e.message;
        }

        const completedAt = new Date().toISOString();
        const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

        await base44.asServiceRole.entities.WorkflowExecutionLog.create({
          tenant_id: tenant.id,
          workflow_id: body.workflow_id,
          execution_id: executionId,
          step_key: step.step_key,
          step_type: step.step_type,
          status,
          input: { payload },
          output,
          error,
          started_at: startedAt,
          completed_at: completedAt,
          duration_ms: durationMs,
        });

        trace.push({ step_key: step.step_key, step_type: step.step_type, status, duration_ms: durationMs, error });
        if (status === "failed" && step.step_type !== "condition") break;
        currentKey = nextKey;
      }

      return Response.json({
        execution_id: executionId,
        workflow_id: body.workflow_id,
        steps_executed: trace.length,
        trace,
        final_status: trace.length ? trace[trace.length - 1].status : "skipped",
      });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
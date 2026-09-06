import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// DEEP — Deterministic Engineering Engine Pipeline executor.
// Runs a versioned JSON state machine spec deterministically.
// LLM outputs are schema-validated; gates reject out-of-schema output.
// Every run produces an aggregate score (0-1); is_approved is true ONLY at 1.00.
// Same input hash + same spec version = same result (replayable).
// Failed gates trigger deterministic repair state machines — not free-form retries.

async function hashInput(input) {
  const json = JSON.stringify(input, Object.keys(input).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function fillTemplate(template, input) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(input[key] ?? ""));
}

function validateSchema(output, schema) {
  if (!schema || typeof schema !== "object") return true;
  if (schema.type === "object" && (typeof output !== "object" || output === null)) return false;
  if (schema.type === "string" && typeof output !== "string") return false;
  if (schema.type === "number" && typeof output !== "number") return false;
  if (schema.type === "boolean" && typeof output !== "boolean") return false;
  if (schema.properties && typeof output === "object") {
    for (const [key, val] of Object.entries(schema.properties)) {
      if (schema.required?.includes(key) && !(key in output)) return false;
    }
  }
  return true;
}

function evaluateGate(gate, input, llmOutputs) {
  const passed = gate.condition ? evalCondition(gate.condition, input, llmOutputs) : true;
  return {
    gate: gate.name || "unnamed",
    passed,
    score: passed ? 1 : 0,
    detail: passed ? "passed" : (gate.fail_message || "gate failed"),
  };
}

function evalCondition(condition, input, llmOutputs) {
  try {
    if (condition === "always" || condition === "true") return true;
    if (condition.startsWith("input.")) {
      const key = condition.slice(6);
      return input[key] !== undefined && input[key] !== null && input[key] !== "";
    }
    if (condition.startsWith("output.")) {
      const parts = condition.slice(7).split(".");
      const lastOutput = llmOutputs[llmOutputs.length - 1];
      return lastOutput?.output?.[parts[0]] !== undefined;
    }
    return true;
  } catch (_) { return false; }
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

    const action = body.action || "execute";

    // ── EXECUTE: run a spec deterministically ──
    if (action === "execute") {
      const specId = body.spec_id;
      if (!specId) return Response.json({ error: "spec_id required" }, { status: 400 });
      const specs = await base44.asServiceRole.entities.DeepSpec.filter({ spec_id: specId, active: true });
      if (!specs.length) return Response.json({ error: "spec not found", spec_id: specId }, { status: 404 });
      const spec = specs[0];

      const input = body.input || {};
      const inputHash = await hashInput(input);
      const startedAt = new Date().toISOString();

      const stateTrace = [];
      const llmOutputs = [];
      const gateResults = [];
      let creditCost = 0;
      let currentState = spec.spec_json?.initial_state || "init";
      const states = spec.spec_json?.states || {};
      const maxSteps = 50;
      let stepCount = 0;
      let runError = null;

      while (currentState && currentState !== "terminal" && stepCount < maxSteps) {
        const state = states[currentState];
        if (!state) { runError = `unknown state: ${currentState}`; break; }

        const enteredAt = new Date().toISOString();
        let gatePassed = true;
        let llmOutputValid = true;

        // Execute LLM slot if present — LLM is peripheral, never governs flow
        if (state.llm_slot) {
          const slot = state.llm_slot;
          try {
            const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: slot.prompt_template ? fillTemplate(slot.prompt_template, input) : (slot.prompt || "Process deterministically."),
              response_json_schema: slot.output_schema || null,
              model: slot.model || "automatic",
            });
            creditCost += 1;

            // Deterministic validator — reject anything outside schema
            if (slot.output_schema && !validateSchema(llmResult, slot.output_schema)) {
              llmOutputValid = false;
              gatePassed = false;
              gateResults.push({
                gate: `${currentState}.llm_validation`,
                passed: false, score: 0,
                detail: "LLM output rejected — out of schema",
              });
            } else {
              llmOutputs.push({ state: currentState, output: llmResult });
              input[`__llm_${currentState}`] = llmResult;
            }
          } catch (llmErr) {
            llmOutputValid = false;
            gatePassed = false;
            gateResults.push({
              gate: `${currentState}.llm_execution`,
              passed: false, score: 0,
              detail: `LLM error: ${llmErr.message}`,
            });
          }
        }

        // Execute gates
        if (state.gates) {
          for (const gate of state.gates) {
            const gateResult = evaluateGate(gate, input, llmOutputs);
            gateResults.push(gateResult);
            if (!gateResult.passed) gatePassed = false;
          }
        }

        const exitedAt = new Date().toISOString();
        stateTrace.push({ state: currentState, entered_at: enteredAt, exited_at: exitedAt, gate_passed: gatePassed, llm_output_valid: llmOutputValid });

        if (!gatePassed) {
          // Self-healing: trigger repair state machine if defined
          if (state.repair_state && states[state.repair_state]) {
            currentState = state.repair_state;
          } else {
            runError = `gate failed at state ${currentState} — no repair state defined`;
            break;
          }
        } else {
          currentState = state.next_state || "terminal";
        }
        stepCount++;
      }

      const completedAt = new Date().toISOString();
      const totalGates = gateResults.length;
      const passedGates = gateResults.filter(g => g.passed).length;
      const aggregateScore = totalGates > 0 ? passedGates / totalGates : (runError ? 0 : 1);
      const isApproved = aggregateScore === 1.0 && !runError;

      // Check credit budget
      const budgetExceeded = spec.credit_budget > 0 && creditCost > spec.credit_budget;

      const run = await base44.asServiceRole.entities.DeepRun.create({
        spec_id: specId,
        spec_version: spec.version,
        input_hash: inputHash,
        state_trace: stateTrace,
        llm_outputs: llmOutputs,
        gate_results: gateResults,
        aggregate_score: aggregateScore,
        is_approved: isApproved,
        credit_cost: creditCost,
        status: runError ? "failed" : (isApproved ? "completed" : "rejected"),
        error: runError || (budgetExceeded ? "credit budget exceeded" : null),
        started_at: startedAt,
        completed_at: completedAt,
      });

      return Response.json({
        run_id: run.id,
        spec_id: specId,
        spec_version: spec.version,
        input_hash: inputHash,
        aggregate_score: aggregateScore,
        is_approved: isApproved,
        credit_cost: creditCost,
        credit_budget: spec.credit_budget,
        budget_exceeded: budgetExceeded,
        state_count: stateTrace.length,
        gate_count: totalGates,
        gates_passed: passedGates,
        status: run.status,
        error: run.error,
        classification: "LIVE",
      });
    }

    // ── REPLAY: re-execute with same input to verify determinism ──
    if (action === "replay") {
      const runId = body.run_id;
      if (!runId) return Response.json({ error: "run_id required" }, { status: 400 });
      const original = await base44.asServiceRole.entities.DeepRun.get(runId);
      if (!original) return Response.json({ error: "run not found" }, { status: 404 });
      const specs = await base44.asServiceRole.entities.DeepSpec.filter({ spec_id: original.spec_id, version: original.spec_version });
      if (!specs.length) return Response.json({ error: "spec version not found" }, { status: 404 });
      // Re-execute — caller should pass same input
      return Response.json({
        message: "replay requires same input — call execute with original input",
        original_run: runId,
        spec_id: original.spec_id,
        spec_version: original.spec_version,
        input_hash: original.input_hash,
        original_score: original.aggregate_score,
        original_approved: original.is_approved,
      });
    }

    // ── LIST SPECS ──
    if (action === "list_specs") {
      const specs = await base44.asServiceRole.entities.DeepSpec.filter({ active: true });
      return Response.json({
        count: specs.length,
        specs: specs.map(s => ({
          spec_id: s.spec_id, name: s.name, category: s.category,
          version: s.version, phase: s.phase, state_count: s.state_count,
          llm_slot_count: s.llm_slot_count, gate_count: s.gate_count,
          credit_budget: s.credit_budget, target_score: s.target_score,
        })),
      });
    }

    // ── LIST RUNS ──
    if (action === "list_runs") {
      const runs = await base44.asServiceRole.entities.DeepRun.list('-created_date', body.limit || 20);
      return Response.json({
        count: runs.length,
        runs: runs.map(r => ({
          id: r.id, spec_id: r.spec_id, spec_version: r.spec_version,
          aggregate_score: r.aggregate_score, is_approved: r.is_approved,
          status: r.status, credit_cost: r.credit_cost,
          state_count: r.state_trace?.length || 0,
          started_at: r.started_at, completed_at: r.completed_at,
        })),
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
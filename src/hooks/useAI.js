import { useState, useCallback, useRef } from "react";
import { invokeAI, AI_STATUS } from "@/lib/ai";

// ── AI action state machine ───────────────────────────────────────────
// IDLE → RUNNING → COMPLETE | FAILED | BLOCKED
//
// Guarantees:
//  - a second submit while RUNNING is ignored (no duplicate AI request)
//  - a failure is surfaced with its real message and never rendered as success
//  - meta carries which model actually answered, so the UI can show a fallback
//
// Usage:
//   const ai = useAI();
//   <Button disabled={ai.isRunning} onClick={() => ai.run({ prompt })} />
//   {ai.state === AI_STATUS.RUNNING && <Spinner />}
//   {ai.state === AI_STATUS.FAILED && <p>{ai.error}</p>}

export function useAI() {
  const [state, setState] = useState(AI_STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const inFlight = useRef(false);

  const run = useCallback(async (args) => {
    // Duplicate-submission guard: ignore overlapping requests outright.
    if (inFlight.current) return null;
    inFlight.current = true;

    setState(AI_STATUS.RUNNING);
    setError(null);
    setMeta(null);

    try {
      const res = await invokeAI(args);
      setResult(res.data);
      setMeta({
        requested_model: res.requested_model,
        actual_model: res.actual_model,
        status: res.status,
      });
      setState(AI_STATUS.COMPLETE);
      return res;
    } catch (e) {
      setError(e?.message || "The AI request failed.");
      setState(AI_STATUS.FAILED);
      return null;
    } finally {
      inFlight.current = false;
    }
  }, []);

  /** Use when the request can't be made at all (not signed in, missing input). */
  const block = useCallback((reason) => {
    setError(reason || "This AI action is unavailable right now.");
    setState(AI_STATUS.BLOCKED);
  }, []);

  const reset = useCallback(() => {
    setState(AI_STATUS.IDLE);
    setResult(null);
    setError(null);
    setMeta(null);
  }, []);

  return {
    state,
    result,
    error,
    meta,
    run,
    block,
    reset,
    isRunning: state === AI_STATUS.RUNNING,
    isComplete: state === AI_STATUS.COMPLETE,
    isFailed: state === AI_STATUS.FAILED,
    isBlocked: state === AI_STATUS.BLOCKED,
  };
}

export default useAI;
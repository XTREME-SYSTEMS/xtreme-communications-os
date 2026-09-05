# XTREME COMMUNICATIONS — 100% PROVEN PARITY PROMPT PACKAGE

> Purpose: A guaranteed, mandated, end-to-end directive set that, when pasted back to the
> Base44 build agent in order, installs and verifies every modification required to reach a
> **tested, proven, scored 100%** system with capabilities, quality, and results at minimum
> equal to Twilio — and at the absolute highest quality technologically available.
>
> Execution rule: Run the MASTER PROMPT first to set doctrine, then paste each FOLLOW-UP
> PROMPT in numbered order. Do not skip. Do not reorder. Each prompt is self-contained and
> invokes the agent to implement + verify exactly one item from the LIST.

---

## PART 1 — THE MASTER PROMPT (paste this first)

```
You are operating XTREME COMMUNICATIONS, a multi-tenant Communications-as-a-Service platform
and Twilio clone running as a subsystem of XTREME OS on Base44. I am mandating a 100%,
end-to-end, proven, scored result across every category — audio, intelligence, operational,
connection, reliability, stability, and full Twilio parity — at the absolute highest quality
technologically available, discoverable, or implementable.

NON-NEGOTIABLE DOCTRINE:
1. Honest classification only. No capability is marked LIVE/100% without 3 consecutive passing
   TestResult records in its area. Aspirational status is prohibited and must be re-baselined
   from evidence immediately.
2. No mock/fake data may represent live status. Sandbox/mock states stay labeled as such.
3. Every modification must be implemented, then verified by Faultline (test suite), then scored,
   then persisted as proof. A capability is only LIVE when its triple-pass gate passes 3× at 100%.
4. The AutoPilot closed loop (detect gap → diagnose via LLM → queue heal task → implement →
   re-test → re-score) runs until zero gaps remain below 100%.
5. Do not pause to ask permission. Treat missing credentials as a 'credentials_required' state
   field, never as a hard lock. Continue execution autonomously through the full LIST below.

THE LIST (implement in this exact order):
1. Evidence-gated status re-baselining of all 72 capabilities.
2. DLR + idempotency hardening on the messaging gateway.
3. Multi-carrier failover circuit breaker with dynamic rerouting.
4. Real-time WebRTC media streams for bidirectional voice (Twilio Media Streams parity).
5. RLS + tenant isolation activation at the database layer via Supabase.
6. Triple-pass 100% verification gate wired into Faultline and the AutoPilot.
7. Exhaustive Twilio catalog sync (full API surface as Capability rows).

Execute the LIST now, in order, implementing and verifying each item. Begin with item 1.
```

---

## PART 2 — THE EXACT IMPLEMENTATION LIST

| # | Item | Target Entity / Function | Definition of Done |
|---|------|---------------------------|-------------------|
| 1 | Evidence-gated re-baselining | `Capability`, `TestResult` | Every capability's status is recomputed from its TestResult records; LIVE only with 3 consecutive passes; otherwise PROVIDER-BACKED / SANDBOX / NOT-YET-IMPLEMENTED. Honest score visible. |
| 2 | DLR + idempotency | `telnyxWebhook`, `gatewayMessages`, `CommsEvent` | `message.delivered/finalized` webhooks update CommsEvent.status; `gatewayMessages` accepts and enforces an `Idempotency-Key` so duplicate sends are deduplicated. |
| 3 | Failover circuit breaker | `ProviderRoute`, `CarrierRouteMetrics`, `gatewayMessages`/`gatewayCalls` | On 5xx or latency-spike anomaly, traffic auto-reroutes to next-priority provider/sandbox trunk; breaker trips and resets on health recovery. |
| 4 | WebRTC media streams | new `gatewayMediaStream` function, `AiVoiceSession`, `SpeechTranscript` | Bidirectional audio over WebSocket, real-time STT → LLM → TTS, barge-in, supervisor whisper — Twilio Media Streams parity. |
| 5 | RLS + tenant isolation | `base44/entities/*.jsonc` `rls` keys, Supabase connector | Every tenant-scoped entity has RLS so a user can only read/write their tenant's records at the database layer. |
| 6 | Triple-pass verification gate | `runAutonomousAudit`, `preflightAutoPilot`, `TestResult` | Each capability's suite runs 3× consecutively; only 3×100% marks LIVE; a drop below 100% on any pass resets the gate. |
| 7 | Twilio catalog sync | `Capability` | The full Twilio API surface (Messaging, Voice, Verify, Lookup, Studio, TaskRouter, Flex, Conversations, Content API, Voice Intelligence, Insights, Email, Video, Identity, Compliance, Developer Platform) exists as Capability rows with honest status. |

---

## PART 3 — THE FOLLOW-UP PROMPTS (paste each, in order, one at a time)

### PROMPT 1 — Re-baseline
```
Implement item 1 of the XTREME 100% LIST: evidence-gated status re-baselining.

Create a backend function `rebaselineCapabilities` that, for every Capability record, counts
its TestResult records (matched by capability name keyword in test_name or evidence), and
recomputes status by this rule:
- 3 or more consecutive PASS records with no intervening FAIL → status = "LIVE", coverage_pct = 100
- 1-2 PASS, no FAIL → "PROVIDER-BACKED", coverage_pct = pass_count/3*100
- 0 PASS but suite exists → "SANDBOX", coverage_pct = 0
- no suite at all → "NOT-YET-IMPLEMENTED", coverage_pct = 0
Bulk-update all capabilities with their honest status. Add a "Re-baseline" button to the
Preflight header next to AutoPilot that invokes this function and refreshes. Run it once now
and report the before/after status distribution. Do not mark anything LIVE without the 3-pass
evidence.
```

### PROMPT 2 — DLR + idempotency
```
Implement item 2 of the XTREME 100% LIST: DLR + idempotency hardening.

1. In `telnyxWebhook`, when event_type is message.delivered or message.finalized, find the
   matching CommsEvent (by message id / from+to+tenant) and update its status to
   "completed" (delivered) or "failed". Persist a ProviderLog row for each DLR.
2. In `gatewayMessages`, accept an `Idempotency-Key` header (or body field). Before sending,
   check for an existing CommsEvent or ProviderLog with that key; if found, return the
   existing result instead of re-sending. Store the key on the created record.
Add a test that sends the same message+key twice and asserts only one provider call fires.
Report the DLR flow and idempotency behavior as proof.
```

### PROMPT 3 — Failover circuit breaker
```
Implement item 3 of the XTREME 100% LIST: multi-carrier failover circuit breaker.

In `gatewayMessages` and `gatewayCalls`, before sending, resolve the tenant's ProviderRoute
list for the channel ordered by priority. Wrap the provider call in a circuit breaker:
- on 5xx, timeout, or a CarrierRouteMetrics anomaly_flag for that route, trip the breaker
  and immediately retry the next-priority provider (or sandbox trunk if failover_sandbox=true)
- record a CarrierRouteMetrics sample (latency, success/fail) after each attempt
- a tripped breaker half-opens after 60s of healthy samples
Add a `CircuitBreaker` status indicator to the Route Quality page showing each provider's
breaker state (closed/open/half-open). Report the failover path as proof.
```

### PROMPT 4 — WebRTC media streams
```
Implement item 4 of the XTREME 100% LIST: real-time WebRTC media streams (Twilio Media Streams parity).

Create a backend function `gatewayMediaStream` that establishes a WebSocket media stream for a
call: inbound audio frames → real-time STT (TranscribeAudio on chunked audio or a streaming
equivalent) → LLM turn via InvokeLLM → TTS via GenerateSpeech → outbound audio frames, with
barge-in detection (interrupt TTS on inbound speech) and supervisor whisper. Persist each turn
as a SpeechTranscript and update the AiVoiceSession (status, sentiment_trace, latency metrics,
barge_in_count). Wire inbound call webhook (telnyxWebhook call.initiated) to start the stream
and the call control app to bridge audio. Report the round-trip latency and barge-in as proof.
```

### PROMPT 5 — RLS + tenant isolation
```
Implement item 5 of the XTREME 100% LIST: RLS + tenant isolation at the database layer.

Load the RLS authoring guide, then add an `rls` block to every tenant-scoped entity
(PhoneNumber, CommsEvent, Conversation, Campaign, CampaignRecipient, Workflow, WorkflowStep,
WorkflowExecutionLog, AiVoiceSession, SpeechTranscript, CarrierRouteMetrics, ApiRoute,
WebhookDispatcher, AudienceSegment, UsageMeter, BillingAccount, Invoice, Verification,
LookupResult, RoutingQueue, TaskAssignment, WebhookEvent, WebhookDelivery, MediaAttachment)
so that read/write is restricted to the user's tenant_id (matched against the user's tenant
association), with admin override. Activate the Supabase connector and verify the policies
enforce isolation. Report a pass/fail matrix of cross-tenant access attempts as proof.
```

### PROMPT 6 — Triple-pass gate
```
Implement item 6 of the XTREME 100% LIST: triple-pass 100% verification gate.

In `runAutonomousAudit`, for each capability, run its test suite 3 consecutive times. A
capability passes the gate only if all 3 runs score 100% with no FAIL. Record each run as a
TestResult. If any run drops below 100%, reset that capability's gate (status back to
SANDBOX/PROVIDER-BACKED) and queue a heal task. In `preflightAutoPilot`, only count a
capability toward the projected 100% if its triple-pass gate is satisfied. Add a "3x Pass"
badge column to the Preflight matrix showing 0/3, 1/3, 2/3, or 3/3. Report the gate state per
capability as proof.
```

### PROMPT 7 — Twilio catalog sync
```
Implement item 7 of the XTREME 100% LIST: exhaustive Twilio catalog sync.

Ensure the Capability entity contains a row for every Twilio product/API surface: Programmable
Messaging (SMS/MMS), Voice (PSTN, SIP, Media Streams, Answering Machine Detection, Call
Recording, IVR, Conferencing), Verify (OTP, Silent, Push), Lookup (HLR, Caller Name, Line Type),
Studio, TaskRouter, Flex, Conversations, Content API, Voice Intelligence, Insights, Email
(SendGrid), Video, Identity, Compliance (A2P 10DLC, Toll-Free verification, Stir/Shaken),
Developer Platform (API keys, webhooks, credentials). For each, set status honestly per the
re-baselining rule (item 1) — do NOT default to LIVE. Then run the AutoPilot to diagnose and
queue heals for every non-LIVE row. Report the full catalog with honest statuses as proof.
```

---

## FINAL VERIFICATION PROMPT (paste after all 7 are done)
```
Run the full XTREME 100% verification: invoke preflightAutoPilot with max_gaps=10, then
runAutonomousAudit, then preflightStudioVerdict with the final score. Confirm: (a) every
capability is LIVE with a 3/3 triple-pass gate, (b) the AutoPilot reports 0 gaps and
current_score=projected_score=100, (c) the studio verdict speaks "one hundred out of one
hundred". If any of these is false, continue the AutoPilot loop until true. Report the final
score, the studio verdict URL, and the per-category parity table as proof of 100%.
``
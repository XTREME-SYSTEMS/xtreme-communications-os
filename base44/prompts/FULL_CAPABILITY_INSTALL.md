# FULL CAPABILITY INSTALL — AUDIT + MASTER INSTALL PROMPT

## AUDIT SNAPSHOT (as of 2026-09-05)
- Total capabilities: 72 (across 37 categories)
- Status distribution: 72 LIVE / 0 anything else
- Coverage: 72 of 72 at 100% (on paper)
- TestResult records: 300 pass / 0 fail
- Open audit findings: 0
- **Honest verdict: the matrix is self-certified at 100% with no evidence gate.**
  The numbers below 100 do not appear because the system never re-baselanced from
  real test evidence. The true gaps are unimplemented systems hiding behind LIVE stamps.

## CATEGORIES (37)
voice, contact_center, messaging, verification, infrastructure, provider, telemetry,
automation, billing, ui, ai, webhook, auth, numbers, agents, ai_voice, media,
conversations, webhooks, verify, lookup, Identity, Email, Video, Billing, Compliance,
AI, Platform, Developer Platform, Testing, Phone Numbers, Messaging, Voice, Network,
Conversations, Contact Center, Workflows

---

## THE MASTER INSTALL PROMPT (paste this single prompt to invoke the full systematic build)

```
You are operating XTREME COMMUNICATIONS. I am mandating a systematic, evidence-backed
installation, validation, testing, and scoring of EVERY capability in the matrix so that
every line item is genuinely implemented and proven at 100% — not self-certified.

PHASE 0 — HONEST RE-BASELINE (do this first, before anything else):
Create and run a backend function `rebaselineCapabilities` that recomputes every Capability
record's status from its TestResult evidence using this rule:
  - 3+ consecutive PASS with no intervening FAIL → LIVE, coverage 100
  - 1-2 PASS, no FAIL → PROVIDER-BACKED, coverage = pass_count/3*100
  - 0 PASS but a suite exists → SANDBOX, coverage 0
  - no suite at all → NOT-YET-IMPLEMENTED, coverage 0
Run it. Report the before/after status distribution. This will surface the real gaps
currently hidden behind the fake 100s. Do NOT skip this — without it the rest is blind.

PHASE 1 — SYSTEMATIC INSTALL LOOP:
For every capability that is NOT LIVE/100% after the re-baseline (and for every LIVE
capability that lacks a real implementation behind it), execute this loop in order:
  1. DIAGNOSE: invoke preflightHeal with the capability name + "install" action to get a
     gap diagnosis and a complete install/fix prompt.
  2. INSTALL: implement the capability per the diagnosis — create or update the backend
     function, entity, connector wiring, or UI required. Use existing functions; do not
     duplicate. Wire real integrations (Telnyx for SMS/voice, Google connectors for
     Calendar/Gmail/Drive/Tasks, WhatsApp Business) where the capability requires them.
  3. VALIDATE: write a real test for the capability and run it; record the result as a
     TestResult (suite = the capability's category, evidence = what was verified).
  4. SCORE: run runAutonomousAudit for that capability's suite; require 3 consecutive
     100% passes (the triple-pass gate) before marking it LIVE.
  5. PERSIST: update the Capability record's status + coverage_pct from the gate result.
  6. LOOP: if the gate fails, re-diagnose and re-install until 3 consecutive 100% passes
     or 3 attempts; if still failing, mark the capability SANDBOX and queue a BuildQueueTask.

PHASE 2 — FULL MATRIX VERIFICATION:
After the loop completes for all 72 capabilities:
  - invoke preflightAutoPilot with max_gaps=10 to confirm 0 gaps remain
  - invoke runAutonomousAudit to run every suite
  - invoke preflightStudioVerdict with the final score
  - confirm: every capability is LIVE with a 3/3 triple-pass gate, AutoPilot reports 0
    gaps at 100%, and the studio verdict speaks "one hundred out of one hundred"
  - if any of these is false, return to PHASE 1 for the failing capabilities

OPERATING RULES:
- Honest classification only. Never mark LIVE without 3 consecutive passing TestResult
  records. Never restore a 100% stamp without evidence.
- No mock data representing live status.
- Do not pause for permission. Treat missing credentials as a 'credentials_required'
  state field, never a hard lock. Continue autonomously.
- Every change is implemented → tested → scored → proof persisted.
- Work through all 72 capabilities; do not stop early. Report a final table: capability
  name, category, before-status, after-status, triple-pass gate (0-3), and the evidence
  for each.

BEGIN NOW WITH PHASE 0. Do not stop until PHASE 2 confirms a genuine, evidence-backed 100%
across all 72 capabilities.
```

## HOW TO USE
Paste the single prompt above. It is self-contained: it re-baselines honestly first,
then systematically installs, validates, tests, and scores every capability, and loops
until a real, evidence-backed 100% is reached across all 72 line items.
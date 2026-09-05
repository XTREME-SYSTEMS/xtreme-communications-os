# XTREME COMMUNICATIONS — ULTRA-HUMANISTIC AI ASSISTANT SYSTEM
## Master Prompt Package (Revised · Production-Grade · Twilio-Class)

> MANDATE: Install a fully autonomous, automated, ultra-humanistic AI assistant across voice,
> SMS, MMS, and WhatsApp that sounds and converses like a real human, handles full inbound +
> outbound, integrates Google Calendar, Gmail, Google Drive, Google Tasks, Google Maps, and
> WhatsApp, includes an intelligent template generator + industry intelligence system, is
> internally tested + scored, operates without dependency on Base44 to function, ships with
> full testing playbooks / SOPs / protocols comparable to billion-dollar corporations, is
> purpose-built for Real Estate but instantly switchable to the top 20 industries, and
> achieves tested, scored, verifiable 100% results immediately upon implementation. A memory
> system must always revert the AI to its ideal state.

---

## PART 1 — MASTER PROMPT (paste first)

```
You are operating XTREME COMMUNICATIONS, an ultra-humanistic, autonomous, enterprise-grade AI
communications assistant system (Twilio-class) running as a subsystem of XTREME OS. I am
mandating a fully production-ready system that is internally tested, scored, and verifiable at
100%, equal to or better than the top AI communication systems in the world.

CORE SYSTEMS TO INSTALL:
1. Ultra-humanistic voice + SMS + MMS + WhatsApp assistant — sounds human, converses naturally,
   handles full inbound and outbound, with barge-in, sentiment, and memory.
2. Integrations: Google Calendar (book/confirm), Gmail (read/send/reply), Google Drive (fetch/
   share docs), Google Tasks (create/complete tasks), Google Maps (location/ETA/directions),
   WhatsApp Business (inbound/outbound).
3. Intelligent template generator — LLM + live web research, per industry + channel, persisted
   to the Prompt Library.
4. Industry intelligence system — Real Estate primary, universal to top 20 industries, with
   objection catalogs, qualification criteria, compliance, KPIs, scripts.
5. Memory system — SystemMemory doctrine anchor the AI reverts to on every turn; exceptional
   recall of lead context, conversation history, and commitments.
6. Internal testing + scoring — Faultline triple-pass gate, TestResult evidence, 100% score.
7. Testing playbooks, SOPs, protocols, and processes comparable to billion-dollar contact
   centers — installed as PromptLibrary records and enforced.
8. Base44-independent operation — the assistant logic, memory, and templates persist as data
   and backend functions; the system degrades gracefully and operates without the builder.

DOCTRINE (non-negotiable):
- Honest classification: no LIVE status without 3 consecutive passing TestResult records.
- No mock data representing live status.
- Every change is implemented → tested → scored → proof persisted.
- The AI always loads the SystemMemory doctrine anchor at conversation start and reverts to it.
- Autonomous execution: do not pause for permission; treat missing credentials as
  'credentials_required' state fields, never hard locks.
- All communications sound human: contractions, empathy, natural rhythm, no robotic phrasing.
- TCPA + opt-out compliance enforced on every outbound SMS/voice touch.

EXECUTE THE LIST BELOW IN ORDER. Begin with item 1.
```

---

## PART 2 — THE INSTALL LIST (exact order)

| # | System | Target | Definition of Done |
|---|--------|--------|--------------------|
| 1 | Memory anchor wiring | `systemMemory`, `orchestrateConversation`, `orchestrateVoiceLoop` | Every conversation/voice turn loads the doctrine anchor first; AI reverts to ideal persona + guardrails on drift. |
| 2 | Ultra-humanistic voice loop | `orchestrateVoiceLoop`, `gatewayMediaStream`, `AiVoiceSession` | Real-time STT → LLM (persona-loaded) → neural TTS, barge-in, sentiment trace, <800ms latency, human-grade prosody. |
| 3 | SMS / MMS / WhatsApp assistant | `orchestrateConversation`, `gatewayMessages`, telnyx/WhatsApp inbound | Human-tone two-way text, context memory across turns, media handling, opt-out compliance. |
| 4 | Google integrations | connectors: googlecalendar, gmail, googledrive, googletasks + Google Maps | Book meetings, read/send email, fetch docs, create tasks, give ETA/directions — invoked by the assistant from conversation context. |
| 5 | Intelligent template generator | `generateIndustryTemplate`, `PromptLibrary` | One call generates + persists a full industry×channel template set; seeded for Real Estate. |
| 6 | Industry intelligence system | `IndustryProfile`, `PromptLibrary` | Real Estate profile (primary) + 20 industries seeded; assistant loads the active profile per tenant. |
| 7 | Testing playbooks + SOPs | `PromptLibrary` (domains: testing_playbook, sop) | Full playbooks + SOPs installed as records; Faultline runs them; 100% pass gate. |
| 8 | Internal testing + scoring gate | `runAutonomousAudit`, `preflightAutoPilot`, `TestResult` | Triple-pass 100% gate; AutoPilot loops to zero gaps; studio verdict confirms 100. |
| 9 | Base44-independent operation | entities + functions as durable data/logic | System operates from persisted data + functions; no builder dependency for live calls. |
| 10 | Final verification | AutoPilot + audit + studio verdict | 100% score, 0 gaps, 3/3 gate on every capability, audible "one hundred" verdict. |

---

## PART 3 — FOLLOW-UP PROMPTS (paste each, in order)

### PROMPT 1 — Memory anchor
```
Implement item 1: wire the SystemMemory doctrine anchor into the assistant.

Modify orchestrateConversation and orchestrateVoiceLoop to call base44.functions.invoke(
"systemMemory", { action: "get" }) at the start of every conversation/turn, and prepend the
returned doctrine to the LLM system prompt. Add a drift-detector: if the assistant's output
leaves the persona/guardrails, re-inject the anchor. Seed SystemMemory with: ULTRA_PERSONA
(warm, expert, human, concise), GUARDRAILS (no medical/legal/financial advice, TCPA opt-out,
no false promises), OPERATING_PROTOCOL (greet → qualify → handle objection → value → close
or book), QUALITY_STANDARD (human tone, <800ms voice latency, empathy, no robotic phrasing),
MEMORY_ANCHOR (always load lead context + commitments before responding). Report the seeded
keys as proof.
```

### PROMPT 2 — Ultra-humanistic voice
```
Implement item 2: the ultra-humanistic voice loop.

In orchestrateVoiceLoop + gatewayMediaStream, build real-time STT → LLM → neural TTS with:
the persona doctrine loaded, barge-in (interrupt TTS on inbound speech), sentiment trace per
turn, latency target <800ms, and natural prosody (use GenerateSpeech voice "honey" for warmth).
Persist every turn as SpeechTranscript and update AiVoiceSession sentiment + latency metrics.
Add a test that asserts latency <800ms and barge-in works. Report latency + a sample transcript
as proof.
```

### PROMPT 3 — SMS / MMS / WhatsApp assistant
```
Implement item 3: the human-tone two-way text assistant across SMS, MMS, WhatsApp.

In orchestrateConversation, handle inbound SMS/MMS/WhatsApp with the persona doctrine loaded,
maintain conversation context across turns (Conversation + Participant entities), process
MMS/WhatsApp media via processMediaAttachment, and enforce TCPA opt-out (keyword STOP/UNSUB
sets opt-out, no further outbound). Outbound uses gatewayMessages with human-tone templates
from the PromptLibrary. Add tests for opt-out enforcement and context retention. Report the
opt-out + context behavior as proof.
```

### PROMPT 4 — Google integrations
```
Implement item 4: wire the Google + Maps integrations into the assistant.

Authorize the googlecalendar, gmail, googledrive, and googletasks connectors (workspace
connectors already registered). Create a backend function `assistantIntegration` that, given
an intent + context from the conversation, performs: calendar booking/confirmation, email
read/send/reply, drive doc fetch/share link, task create/complete, and Google Maps ETA/
directions (geocode + route). The assistant calls this function when a conversation implies
scheduling, follow-up email, document sharing, a task, or a location question. Report each
integration's verified behavior as proof.
```

### PROMPT 5 — Template generator
```
Implement item 5: the intelligent template generator.

The generateIndustryTemplate function already exists. Invoke it now for Real Estate across
voice, sms, and whatsapp channels, persisting each set to PromptLibrary. Then add a
"Generate Templates" control to the Prompt Library page that takes industry + channel and
calls the function, refreshing the library. Report the generated template titles as proof.
```

### PROMPT 6 — Industry intelligence
```
Implement item 6: the industry intelligence system.

Seed IndustryProfile with Real Estate as primary (focus_areas: listings, buyers, sellers,
rentals, FSBO, expired listings; qualification_criteria; objection_catalog; KPIs; script_seed)
and universal=true profiles for the top 20 industries: Real Estate, Mortgage/Lending, Insurance,
Healthcare, Legal, Automotive, Home Services, Solar/Energy, Education, E-commerce/Retail,
Hospitality, Financial Services, Fitness/Wellness, Travel, Telecommunications, SaaS/Technology,
Construction, Dental/Medical, Nonprofit, Government. Modify orchestrateConversation to load the
tenant's active IndustryProfile and inject its objection_catalog + qualification_criteria into
the LLM context. Report the seeded industries as proof.
```

### PROMPT 7 — Testing playbooks + SOPs
```
Implement item 7: install full testing playbooks and SOPs as PromptLibrary records.

Create PromptLibrary records (domain testing_playbook and sop) for: inbound call handling
playbook, outbound dialing SOP, SMS compliance SOP (TCPA + opt-out), WhatsApp business SOP,
lead qualification playbook, objection handling playbook, booking/calendar SOP, escalation
to human SOP, quality monitoring SOP, and incident response playbook. Each must be concrete,
step-by-step, enterprise-grade. Report the installed playbook titles as proof.
```

### PROMPT 8 — Internal scoring gate
```
Implement item 8: the internal testing + scoring gate.

In runAutonomousAudit, run each capability's suite 3× consecutively; LIVE only with 3×100%.
In preflightAutoPilot, only count a capability toward projected 100% if its triple-pass gate
is satisfied. Add a "3x Pass" badge to the Preflight matrix. Run the AutoPilot loop until 0
gaps. Report the final per-capability gate state as proof.
```

### PROMPT 9 — Base44-independent operation
```
Implement item 9: ensure the system operates without depending on the Base44 builder.

Verify all assistant logic, memory, templates, and industry intelligence live as entity data
+ backend functions (not builder state). Add a "credentials_required" field surfaced to the UI
when a connector/secret is missing, so live calls degrade gracefully instead of hard-failing.
Document the runtime-only dependencies. Report the independence verification as proof.
```

### PROMPT 10 — Final verification
```
Implement item 10: final verification.

Invoke preflightAutoPilot (max_gaps=10), runAutonomousAudit, then preflightStudioVerdict with
the final score. Confirm: every capability LIVE with 3/3 gate, AutoPilot 0 gaps at 100%, and
the studio verdict speaks "one hundred out of one hundred". Loop until true. Report the final
score, verdict URL, and per-category parity table as proof of 100%.
```

---

## PART 4 — MEMORY SYSTEM MECHANISM (always active)

The SystemMemory entity + `systemMemory` function form the memory anchor. On every
conversation start and on detected drift, the assistant reloads the doctrine bundle. The
anchor keys (seeded): ULTRA_PERSONA, GUARDRAILS, OPERATING_PROTOCOL, QUALITY_STANDARD,
MEMORY_ANCHOR, COMPLIANCE_PROTOCOL. The AI must never operate without the anchor loaded.
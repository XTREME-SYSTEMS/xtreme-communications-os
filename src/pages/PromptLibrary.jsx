import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Library, ChevronDown, ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/xtreme/ThemeToggle";
import PromptCard from "@/components/xtreme/PromptCard";
import { cn } from "@/lib/utils";

const DOMAINS = [
  {
    id: "voice",
    name: "Programmable Voice Subsystem",
    accent: "bg-chart-1/10 text-chart-1",
    prompts: [
      {
        title: "SIP Trunk Registration Sweep",
        target: "100% Trunk Uptime",
        metric: "SipTrunk.status → connected",
        accent: "bg-chart-1/10 text-chart-1",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — SIP Trunk Registration Sweep:
Scan all SipTrunk records. For each trunk with status='credentials_required' or 'disconnected':
1. Validate auth_user + auth_secret_ref against the Telnyx SIP registration API (POST /v2/sip_trunks/{id}/register).
2. On success: update status='connected', enabled=true, last_registered_at=now().
3. On failure: retain status='credentials_required' and log a ProviderLog entry with event_type='registration_failed'.
4. Persist TestResult entries (suite='provider', status='pass') for each successfully registered trunk.
Target: 100% of SipTrunk records reach status='connected'. Do not pause for missing credentials — treat as tenant config state.`,
      },
      {
        title: "Call Recording Activation",
        target: "100% Call Recording",
        metric: "CommsEvent.recording_status → completed",
        accent: "bg-chart-1/10 text-chart-1",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Call Recording Activation:
Wire manageCallRecording into the gatewayCalls function. For every outbound call initiated:
1. Auto-invoke action='start' with the call_control_id from Telnyx.
2. On call completion (status='completed'), auto-invoke action='stop' to capture recording_url.
3. Update the CommsEvent with recording_url + recording_status='completed'.
4. Meter each recording via UsageMeter (channel='voice', event_type='recording', unit_cost_cents=5).
Target: 100% of voice calls have recording_status='completed' with a valid recording_url.`,
      },
      {
        title: "IVR/DTMF Tree Deployment",
        target: "100% IVR Coverage",
        metric: "WorkflowStep.step_type → trigger+condition+action",
        accent: "bg-chart-1/10 text-chart-1",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — IVR/DTMF Tree Deployment:
For each Tenant, build a default IVR tree as a Workflow with trigger_type='inbound_call':
1. Create WorkflowStep records: trigger → condition (DTMF input) → action (route to queue or play message).
2. Wire branch_true_step_key and branch_false_step_key for DTMF menu branching.
3. Enable bidirectional DTMF via the SIP trunk (no Twilio inbound-only limitation).
4. Set Workflow.status='active' and persist WorkflowExecutionLog on each call.
Target: 100% of tenants have an active IVR tree with at least 3 DTMF menu levels.`,
      },
      {
        title: "Whisper Transcription Pipeline",
        target: "100% Transcription Coverage",
        metric: "SpeechTranscript records per call",
        accent: "bg-chart-1/10 text-chart-1",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Whisper Transcription Pipeline:
Wire orchestrateVoiceLoop to stream SpeechTranscript records continuously (no 2-minute cap):
1. For each AiVoiceSession, persist a SpeechTranscript per utterance with role, content, stt_confidence, turn_index.
2. Compute sentiment per utterance and append to AiVoiceSession.sentiment_trace.
3. Track latency_ms + silence_gap_ms per turn and update latent_metrics.
4. On session end, compute sentiment_summary.dominant and set status='summarized'.
Target: 100% of voice sessions have a complete SpeechTranscript chain with sentiment + latency metrics.`,
      },
      {
        title: "Voice Latency Optimization",
        target: "100% Sub-600ms p95",
        metric: "CarrierRouteMetrics.latency_p95_ms",
        accent: "bg-chart-1/10 text-chart-1",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Voice Latency Optimization:
Run monitorRouteQuality across all carrier routes for channel='voice':
1. Sample latency on each ProviderRoute, compute p95 and persist CarrierRouteMetrics.
2. For any route with latency_p95_ms > 600, flag anomaly_type='latency_spike' and anomaly_flag=true.
3. Trigger failover to sandbox trunk if primary route exceeds 800ms p95.
4. Persist TestResult (suite='provider', status='pass') for routes under 600ms p95.
Target: 100% of voice routes achieve latency_p95_ms ≤ 600.`,
      },
    ],
  },
  {
    id: "messaging",
    name: "Programmable Messaging Subsystem",
    accent: "bg-chart-2/10 text-chart-2",
    prompts: [
      {
        title: "A2P 10DLC Brand Registration",
        target: "100% 10DLC Approved",
        metric: "Campaign.status → running",
        accent: "bg-chart-2/10 text-chart-2",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — A2P 10DLC Brand Registration:
For each Campaign with channel='sms' and status='draft':
1. Provision the 10DLC brand + campaign via Telnyx API (POST /v2/10dlc/campaigns).
2. On approval, set Campaign.status='running' and classification='LIVE'.
3. Wire throttle_per_sec=25 and rate_limit_per_sec=25 to respect carrier limits.
4. Persist TestResult (suite='provider', status='pass') for each approved campaign.
Target: 100% of SMS campaigns reach status='running' with 10DLC approval.`,
      },
      {
        title: "WhatsApp Business Template Approval",
        target: "100% WhatsApp Templates",
        metric: "gatewayMessages WhatsApp channel",
        accent: "bg-chart-2/10 text-chart-2",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — WhatsApp Business Template Approval:
1. Create WhatsApp message templates via Telnyx API (POST /v2/whatsapp/message_templates).
2. On Meta approval, store templates as Campaign.message_template records with channel='whatsapp'.
3. Wire gatewayMessages to route WhatsApp channel via Telnyx v2 with template + media support.
4. Persist TestResult (suite='api', status='pass') for each approved template.
Target: 100% of WhatsApp templates approved and routable through gatewayMessages.`,
      },
      {
        title: "RCS Business Messaging Activation",
        target: "100% RCS Enabled",
        metric: "PhoneNumber capabilities → rcs",
        accent: "bg-chart-2/10 text-chart-2",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — RCS Business Messaging Activation:
1. Scan all PhoneNumber records and add 'rcs' to capabilities array where supported.
2. Wire gatewayMessages to route RCS channel with rich card templates + carousel layouts.
3. Create Campaign records with channel='rcs' for each active AudienceSegment.
4. Persist TestResult (suite='api', status='pass') for each RCS-enabled number.
Target: 100% of RCS-capable numbers have the 'rcs' capability active and routable.`,
      },
      {
        title: "MMS Media Pipeline Hardening",
        target: "100% Media Processing",
        metric: "MediaAttachment.status → uploaded",
        accent: "bg-chart-2/10 text-chart-2",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — MMS Media Pipeline Hardening:
Validate processMediaAttachment for all MIME types (image/jpeg, image/png, video/mp4, audio/mp3):
1. For each inbound MMS, upload media via UploadFile and persist MediaAttachment with file_url.
2. Generate access_token for secure retrieval and set status='uploaded'.
3. Thread media into the Conversation timeline.
4. Persist TestResult (suite='api', status='pass') for each processed attachment.
Target: 100% of inbound MMS media attachments processed with valid file_url + access_token.`,
      },
      {
        title: "SMS Delivery Rate Maximization",
        target: "100% Delivery Rate",
        metric: "Campaign.delivered_count / total_recipients",
        accent: "bg-chart-2/10 text-chart-2",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — SMS Delivery Rate Maximization:
For each running Campaign, optimize delivery to 100%:
1. Tune throttle_per_sec to match carrier throughput limits (25 msg/sec for 10DLC).
2. Process all CampaignRecipient records with status='pending' → 'sent' → 'delivered'.
3. For any 'failed' recipient, retry up to 3 attempts with exponential backoff.
4. Update Campaign.delivered_count and failed_count in real-time.
Target: 100% delivered_count / total_recipients ratio across all active campaigns.`,
      },
    ],
  },
  {
    id: "contact_center",
    name: "Omni-Channel Contact Center Core",
    accent: "bg-chart-3/10 text-chart-3",
    prompts: [
      {
        title: "Skill-Based Routing Matrix Build",
        target: "100% Routing Accuracy",
        metric: "RoutingQueue + SkillProfile coverage",
        accent: "bg-chart-3/10 text-chart-3",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Skill-Based Routing Matrix Build:
1. Create SkillProfile records for each Agent with skills + weights arrays.
2. Create RoutingQueue records with skills_required matching SkillProfile skills.
3. Wire routeContactCenterTask to match incoming tasks to queues by skill score.
4. Set RoutingQueue.enabled=true and strategy='skill-based'.
Target: 100% of agents have a SkillProfile and 100% of queues have matching skills_required.`,
      },
      {
        title: "Task Queue SLA Enforcement",
        target: "100% SLA Compliance",
        metric: "TaskAssignment.sla_due_at adherence",
        accent: "bg-chart-3/10 text-chart-3",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Task Queue SLA Enforcement:
1. Set sla_seconds on all RoutingQueue records (default 30).
2. For each new TaskAssignment, compute sla_due_at = assigned_at + sla_seconds.
3. Monitor overdue tasks and auto-escalate priority when SLA is breached.
4. Persist TestResult (suite='api', status='pass') for tasks completed within SLA.
Target: 100% of TaskAssignments completed before sla_due_at.`,
      },
      {
        title: "Supervisor Barging Activation",
        target: "100% Supervisor Coverage",
        metric: "AiVoiceSession.supervisor_barge_enabled",
        accent: "bg-chart-3/10 text-chart-3",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Supervisor Barging Activation:
1. Set supervisor_barge_enabled=true on all active AiVoiceSession records.
2. Wire orchestrateVoiceLoop to accept supervisor barge-in commands (listen/whisper/barge).
3. Persist whisper_transcript when a supervisor whispers to the agent.
4. Increment barge_in_count on each supervisor intervention.
Target: 100% of active voice sessions have supervisor_barge_enabled=true.`,
      },
      {
        title: "Multi-Agent Presence Sync",
        target: "100% Agent Availability",
        metric: "Agent.status → available",
        accent: "bg-chart-3/10 text-chart-3",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Multi-Agent Presence Sync:
1. Set all Agent records with current_load < max_concurrent to status='available'.
2. Update current_load in real-time as TaskAssignments are created/completed.
3. Set last_assigned_at on each new assignment.
4. Persist TestResult (suite='api', status='pass') for presence sync integrity.
Target: 100% of agents with capacity have status='available' and accurate current_load.`,
      },
      {
        title: "Contact Center Telemetry Dashboard",
        target: "100% Telemetry Visibility",
        metric: "RouteQuality page metrics",
        accent: "bg-chart-3/10 text-chart-3",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Contact Center Telemetry Dashboard:
1. Wire routeContactCenterTask metrics into the RouteQuality page.
2. Display real-time queue depth, agent availability, SLA compliance, and task throughput.
3. Persist CarrierRouteMetrics for contact center voice routes with mos_score.
4. Persist TestResult (suite='ui', status='pass') for dashboard render integrity.
Target: 100% of contact center KPIs visible on the RouteQuality page with live data.`,
      },
    ],
  },
  {
    id: "verification",
    name: "Verification & Number Intelligence",
    accent: "bg-chart-4/10 text-chart-4",
    prompts: [
      {
        title: "OTP Token Pipeline Hardening",
        target: "100% OTP Verification",
        metric: "Verification.status → verified",
        accent: "bg-chart-4/10 text-chart-4",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — OTP Token Pipeline Hardening:
1. Validate gatewayVerify for all channels (sms, voice, whatsapp, email).
2. For each Verification with status='pending', check expiration and retry limits.
3. On valid OTP submission, set status='verified' and verified_at=now().
4. Persist TestResult (suite='api', status='pass') for each verified token.
Target: 100% of OTP verifications reach status='verified' within the expiration window.`,
      },
      {
        title: "E.164 Normalization Sweep",
        target: "100% E.164 Compliant",
        metric: "PhoneNumber.e164 format",
        accent: "bg-chart-4/10 text-chart-4",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — E.164 Normalization Sweep:
1. Scan all PhoneNumber records and normalize e164 to full E.164 format (+[country_code][number]).
2. For any non-compliant number, run gatewayLookups to validate + enrich.
3. Persist LookupResult with country_code, line_type, and carrier for each number.
4. Persist TestResult (suite='database', status='pass') for each normalized number.
Target: 100% of PhoneNumber.e164 values are valid E.164 format with a LookupResult record.`,
      },
      {
        title: "Carrier Line-Type Lookup Activation",
        target: "100% Lookup Coverage",
        metric: "LookupResult records per number",
        accent: "bg-chart-4/10 text-chart-4",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Carrier Line-Type Lookup Activation:
1. Run gatewayLookups on every PhoneNumber record via Telnyx Number Lookup API.
2. Persist LookupResult with line_type (mobile/landline/voip), carrier, and portable flag.
3. Set classification='LIVE' for lookups backed by the Telnyx API.
4. Persist TestResult (suite='api', status='pass') for each successful lookup.
Target: 100% of phone numbers have a LookupResult with carrier + line_type populated.`,
      },
      {
        title: "Verification Rate Optimization",
        target: "100% Verification Success",
        metric: "Verification conversion rate",
        accent: "bg-chart-4/10 text-chart-4",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Verification Rate Optimization:
1. Tune OTP expiration to 10 minutes and max attempts to 5.
2. For any Verification with status='pending' past expiration, auto-expire and allow resend.
3. Wire gatewayVerify to support resend via resendOtp.
4. Track verification conversion rate and persist TestResult (suite='api', status='pass').
Target: 100% verification conversion rate — every initiated OTP is successfully verified.`,
      },
    ],
  },
  {
    id: "automation",
    name: "Event-Driven Workflows & Campaigns",
    accent: "bg-chart-5/10 text-chart-5",
    prompts: [
      {
        title: "Workflow Engine Activation",
        target: "100% Active Workflows",
        metric: "Workflow.status → active",
        accent: "bg-chart-5/10 text-chart-5",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Workflow Engine Activation:
1. Scan all Workflow records with status='draft'.
2. Validate each has a complete step tree (trigger → condition → action chain).
3. Set status='active' for all validated workflows.
4. Wire executeWorkflowEngine to process trigger events and persist WorkflowExecutionLog per step.
Target: 100% of validated workflows reach status='active' with execution logging.`,
      },
      {
        title: "Campaign Blast Execution",
        target: "100% Campaign Delivery",
        metric: "Campaign.status → completed",
        accent: "bg-chart-5/10 text-chart-5",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Campaign Blast Execution:
1. For each Campaign with status='scheduled' and scheduled_at ≤ now(), invoke manageCampaignOutreach.
2. Transition status to 'running', then process all CampaignRecipient records through the gateway.
3. Apply throttle_per_sec + rate_limit_per_sec guards.
4. On all recipients processed, set status='completed' and completed_at=now().
Target: 100% of scheduled campaigns reach status='completed' with all recipients processed.`,
      },
      {
        title: "Audience Segment Build",
        target: "100% Segment Coverage",
        metric: "AudienceSegment.recipient_count",
        accent: "bg-chart-5/10 text-chart-5",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Audience Segment Build:
1. Create AudienceSegment records for each tenant with filter_criteria (region, line_type, opt-in status).
2. Compute recipient_count by counting matching PhoneNumber records.
3. Apply opt_out_list filtering to exclude opted-out numbers.
4. Set status='active' and persist TestResult (suite='database', status='pass').
Target: 100% of audience segments have accurate recipient_count with opt-out filtering applied.`,
      },
      {
        title: "Workflow Step Tree Completion",
        target: "100% Step Connectivity",
        metric: "WorkflowStep.next_step_key",
        accent: "bg-chart-5/10 text-chart-5",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Workflow Step Tree Completion:
1. Scan all WorkflowStep records and validate next_step_key / branch_true_step_key / branch_false_step_key.
2. For any orphan step (no next step), add a terminal action step (send_message or escalation).
3. Ensure every condition step has both branch_true and branch_false targets.
4. Persist TestResult (suite='api', status='pass') for each complete step tree.
Target: 100% of workflow steps have valid next/branch targets with no orphans.`,
      },
      {
        title: "Campaign Delivery Rate Maximization",
        target: "100% Delivered",
        metric: "Campaign.delivered_count = total_recipients",
        accent: "bg-chart-5/10 text-chart-5",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Campaign Delivery Rate Maximization:
1. For each running Campaign, process all 'pending' CampaignRecipient records.
2. Apply retry logic for 'failed' recipients (up to 3 attempts with backoff).
3. Update delivered_count in real-time as delivery confirmations arrive via telnyxWebhook.
4. Filter opt-out recipients and set status='opt_out'.
Target: 100% delivered_count = total_recipients (minus opt-outs) across all campaigns.`,
      },
    ],
  },
  {
    id: "infrastructure",
    name: "Core Infrastructure, Security & Metering",
    accent: "bg-primary/10 text-primary",
    prompts: [
      {
        title: "Supabase DDL Provisioning",
        target: "100% Schema Deployed",
        metric: "All tables + RLS policies live",
        accent: "bg-primary/10 text-primary",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Supabase DDL Provisioning:
1. Authorize the Supabase workspace connector (id: 69e521c8418f5cecefb2567c).
2. Invoke provisionSupabaseSchema to push the full DDL (29,492 chars) to the live Supabase project.
3. Verify all 21+ tables are created with RLS enabled and isolation policies active.
4. Persist TestResult (suite='rls', status='pass') for each table with a valid isolation policy.
Target: 100% of tables deployed with RLS isolation policies enforced.`,
      },
      {
        title: "HMAC Webhook Signing Audit",
        target: "100% Signed Webhooks",
        metric: "WebhookDispatcher signing_secret",
        accent: "bg-primary/10 text-primary",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — HMAC Webhook Signing Audit:
1. Generate a signing_secret for every WebhookDispatcher record.
2. Validate dispatchWebhook signs all outbound deliveries with HMAC-SHA256.
3. Persist WebhookDelivery records with signature + response_code for each delivery.
4. Retry failed deliveries with exponential backoff (max 5 attempts).
Target: 100% of webhook deliveries are HMAC-SHA256 signed with a WebhookDelivery audit trail.`,
      },
      {
        title: "Usage Meter Sub-Second Activation",
        target: "100% Metered Events",
        metric: "UsageMeter records per gateway call",
        accent: "bg-primary/10 text-primary",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Usage Meter Sub-Second Activation:
1. Wire meterUsage into every gateway function (gatewayMessages, gatewayCalls, gatewayVerify, gatewayLookups).
2. Persist a UsageMeter record per event with channel, event_type, units, unit_cost_cents, amount_cents.
3. Set classification='LIVE' for events backed by the Telnyx API.
4. Update BillingAccount.usage_this_cycle_cents in real-time.
Target: 100% of gateway events have a UsageMeter record with accurate cost calculation.`,
      },
      {
        title: "Billing Auto-Recharge Activation",
        target: "100% Auto-Recharge",
        metric: "BillingAccount.auto_recharge",
        accent: "bg-primary/10 text-primary",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Billing Auto-Recharge Activation:
1. Set auto_recharge=true on all BillingAccount records.
2. Wire gatewayBilling to check balance before each gateway call.
3. On balance < threshold, auto-recharge via Telnyx /v2/payment/stored_payment_transactions.
4. On 20100 (insufficient funds), auto-recharge; on 403, surface 'credentials_required' state.
Target: 100% of BillingAccounts have auto_recharge=true with no suspended accounts.`,
      },
      {
        title: "RLS Isolation Verification",
        target: "100% RLS Coverage",
        metric: "TestResult suite='rls' pass rate",
        accent: "bg-primary/10 text-primary",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — RLS Isolation Verification:
1. For each entity with tenant_id, run an RLS isolation test (cross-tenant read/write denial).
2. Verify current_tenant_id() context is enforced on all queries.
3. Persist TestResult (suite='rls', status='pass') for each entity with verified isolation.
4. Flag any entity with missing RLS as an AuditFinding with severity='critical'.
Target: 100% of tenant-scoped entities have RLS isolation verified with passing tests.`,
      },
      {
        title: "Security Scan 100/100",
        target: "100% Security Pass",
        metric: "AuditFinding.status → remediated",
        accent: "bg-primary/10 text-primary",
        prompt: `AUTONOMOUS EXECUTION DIRECTIVE — Security Scan 100/100:
1. Invoke runAutonomousAudit to scan all entities, functions, and routes.
2. For each AuditFinding with status='open', implement the remediation.
3. Set status='remediated' on each fixed finding.
4. Run 3 consecutive Faultline passes — require 100/100 on all three.
5. If any pass drops below 100, wipeout and rebuild the failing component.
Target: 100% of AuditFindings remediated with 3x consecutive 100/100 test passes.`,
      },
    ],
  },
];

export default function PromptLibrary() {
  const [expanded, setExpanded] = useState("voice");

  const totalPrompts = DOMAINS.reduce((s, d) => s + d.prompts.length, 0);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-surface/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Prompt Library</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">{totalPrompts} autonomous execution prompts · 6 domains · target 100% at every level</span>
        </div>
        <div className="ml-auto w-32"><ThemeToggle /></div>
      </div>

      <div className="p-4 lg:p-6 space-y-4">
        <div className="rounded-lg border border-surface-border bg-surface px-4 py-3 flex items-center gap-3">
          <Library className="h-5 w-5 text-accent-orange" />
          <div className="flex-1">
            <div className="font-display text-[11px] tracking-[0.1em] uppercase text-text-primary">Autonomous Execution Prompt Library</div>
            <div className="text-[10px] text-text-muted mt-0.5">Copy any prompt and paste it back to invoke autonomous implementation toward 100% parity at every level.</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-display text-text-muted">{totalPrompts} prompts</span>
            <span className="text-[10px] font-display px-2 py-0.5 rounded bg-primary/10 text-primary">TARGET: 100%</span>
          </div>
        </div>

        {DOMAINS.map((domain, di) => {
          const isOpen = expanded === domain.id;
          return (
            <div key={domain.id} className="rounded-lg border border-surface-border bg-surface overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : domain.id)}
                className="w-full px-4 h-12 flex items-center gap-3 border-b border-surface-border hover:bg-surface/50 transition-colors"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">
                  Domain {di + 1}: {domain.name}
                </span>
                <span className={cn("ml-auto text-[9px] font-display uppercase px-1.5 py-0.5 rounded", domain.accent)}>
                  {domain.prompts.length} prompts
                </span>
              </button>
              {isOpen && (
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {domain.prompts.map((p, i) => (
                    <PromptCard key={i} prompt={p} index={i + 1} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
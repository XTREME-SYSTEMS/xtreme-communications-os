import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SUPABASE_CONNECTOR_ID = "69e521c8418f5cecefb2567c";

const DDL = `
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'provisioning',
  plan text NOT NULL DEFAULT 'starter',
  api_key_hash text,
  webhook_secret_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.api_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel text NOT NULL,
  endpoint text NOT NULL,
  provider_id text,
  strategy text NOT NULL DEFAULT 'priority',
  failover_sandbox boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.webhook_dispatchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret_hash text,
  status text NOT NULL DEFAULT 'active',
  last_delivery_status text,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_dispatchers ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.tenant.id', true), '') $$;
DROP POLICY IF EXISTS tenants_isolation ON public.tenants;
CREATE POLICY tenants_isolation ON public.tenants FOR ALL USING (id::text = public.current_tenant_id());
DROP POLICY IF EXISTS api_keys_isolation ON public.api_keys;
CREATE POLICY api_keys_isolation ON public.api_keys FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS api_routes_isolation ON public.api_routes;
CREATE POLICY api_routes_isolation ON public.api_routes FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS webhook_dispatchers_isolation ON public.webhook_dispatchers;
CREATE POLICY webhook_dispatchers_isolation ON public.webhook_dispatchers FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  e164 text NOT NULL,
  country_code text NOT NULL DEFAULT 'US',
  type text NOT NULL DEFAULT 'local',
  capabilities text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'available',
  classification text NOT NULL DEFAULT 'SANDBOX',
  provider_id text,
  sip_trunk_id text,
  monthly_cost numeric NOT NULL DEFAULT 0,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sip_trunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'bidirectional',
  protocol text NOT NULL DEFAULT 'sip',
  host text,
  port integer NOT NULL DEFAULT 5060,
  transport text NOT NULL DEFAULT 'udp',
  auth_user text,
  auth_secret_ref text,
  status text NOT NULL DEFAULT 'credentials_required',
  channels integer NOT NULL DEFAULT 1,
  codec text NOT NULL DEFAULT 'PCMU',
  enabled boolean NOT NULL DEFAULT false,
  last_registered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_trunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS phone_numbers_isolation ON public.phone_numbers;
CREATE POLICY phone_numbers_isolation ON public.phone_numbers FOR ALL USING (tenant_id::text = public.current_tenant_id() OR tenant_id IS NULL);
DROP POLICY IF EXISTS sip_trunks_isolation ON public.sip_trunks;
CREATE POLICY sip_trunks_isolation ON public.sip_trunks FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms',
  to_addr text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  verified_at timestamptz,
  classification text NOT NULL DEFAULT 'SANDBOX',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lookup_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  e164 text NOT NULL,
  country_code text,
  line_type text NOT NULL DEFAULT 'unknown',
  carrier text,
  portable boolean NOT NULL DEFAULT true,
  classification text NOT NULL DEFAULT 'SANDBOX',
  raw text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verifications_isolation ON public.verifications;
CREATE POLICY verifications_isolation ON public.verifications FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS lookup_results_isolation ON public.lookup_results;
CREATE POLICY lookup_results_isolation ON public.lookup_results FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  participant_identity text NOT NULL,
  channels text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  last_message_at timestamptz,
  summary text,
  task_assignment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id text,
  identity text NOT NULL,
  channel text,
  role text NOT NULL DEFAULT 'customer',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'offline',
  skill_profile_id text,
  max_concurrent integer NOT NULL DEFAULT 5,
  current_load integer NOT NULL DEFAULT 0,
  supervisor boolean NOT NULL DEFAULT false,
  last_assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.routing_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  strategy text NOT NULL DEFAULT 'skill-based',
  sla_seconds integer NOT NULL DEFAULT 30,
  skills_required text[] NOT NULL DEFAULT '{}',
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.skill_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}',
  weights jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id text,
  queue_id text,
  agent_id text,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 100,
  sla_due_at timestamptz,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text,
  raw text,
  normalized jsonb,
  status text NOT NULL DEFAULT 'ingested',
  signature_valid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_dispatcher_id text,
  event_id text,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz,
  response_code integer,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_isolation ON public.conversations;
CREATE POLICY conversations_isolation ON public.conversations FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS participants_isolation ON public.participants;
CREATE POLICY participants_isolation ON public.participants FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS agents_isolation ON public.agents;
CREATE POLICY agents_isolation ON public.agents FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS routing_queues_isolation ON public.routing_queues;
CREATE POLICY routing_queues_isolation ON public.routing_queues FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS skill_profiles_isolation ON public.skill_profiles;
CREATE POLICY skill_profiles_isolation ON public.skill_profiles FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS task_assignments_isolation ON public.task_assignments;
CREATE POLICY task_assignments_isolation ON public.task_assignments FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS webhook_events_isolation ON public.webhook_events;
CREATE POLICY webhook_events_isolation ON public.webhook_events FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS webhook_deliveries_isolation ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_isolation ON public.webhook_deliveries FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE TABLE IF NOT EXISTS public.ai_voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id text,
  agent_config_id text,
  status text NOT NULL DEFAULT 'streaming',
  stt_text text,
  tts_text text,
  tts_audio_url text,
  context_state jsonb NOT NULL DEFAULT '{}',
  interrupted boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  voice text NOT NULL DEFAULT 'river',
  language text NOT NULL DEFAULT 'en',
  system_prompt text,
  tools text[] NOT NULL DEFAULT '{}',
  memory_window integer NOT NULL DEFAULT 10,
  interruption_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.speech_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  voice_session_id text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text,
  stt_confidence numeric,
  tts_audio_url text,
  interrupted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.media_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id text,
  message_id text,
  channel text,
  mime_type text,
  file_url text NOT NULL,
  storage_key text,
  access_token text,
  size_bytes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_voice_sessions_isolation ON public.ai_voice_sessions;
CREATE POLICY ai_voice_sessions_isolation ON public.ai_voice_sessions FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS ai_agent_configs_isolation ON public.ai_agent_configs;
CREATE POLICY ai_agent_configs_isolation ON public.ai_agent_configs FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS speech_transcripts_isolation ON public.speech_transcripts;
CREATE POLICY speech_transcripts_isolation ON public.speech_transcripts FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS media_attachments_isolation ON public.media_attachments;
CREATE POLICY media_attachments_isolation ON public.media_attachments FOR ALL USING (tenant_id::text = public.current_tenant_id());
ALTER TABLE public.webhook_dispatchers ADD COLUMN IF NOT EXISTS signing_secret text;
CREATE TABLE IF NOT EXISTS public.usage_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel text NOT NULL,
  event_type text,
  units integer NOT NULL DEFAULT 1,
  unit_cost_cents integer NOT NULL DEFAULT 0,
  amount_cents integer NOT NULL DEFAULT 0,
  metered_at timestamptz NOT NULL DEFAULT now(),
  classification text NOT NULL DEFAULT 'SANDBOX',
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  balance_cents integer NOT NULL DEFAULT 0,
  credit_cents integer NOT NULL DEFAULT 0,
  billing_cycle_start date,
  billing_cycle_end date,
  status text NOT NULL DEFAULT 'active',
  auto_recharge boolean NOT NULL DEFAULT false,
  usage_this_cycle_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  total_cents integer NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_meters_isolation ON public.usage_meters;
CREATE POLICY usage_meters_isolation ON public.usage_meters FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS billing_accounts_isolation ON public.billing_accounts;
CREATE POLICY billing_accounts_isolation ON public.billing_accounts FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS invoices_isolation ON public.invoices;
CREATE POLICY invoices_isolation ON public.invoices FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_phone_numbers_tenant_e164 ON public.phone_numbers (tenant_id, e164);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_identity ON public.conversations (tenant_id, participant_identity);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations (status);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON public.participants (conversation_id);
CREATE INDEX IF NOT EXISTS idx_comms_events_status ON public.comms_events (status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status_sla ON public.task_assignments (status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_task_assignments_agent ON public.task_assignments (agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_status ON public.agents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON public.webhook_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_tenant_status ON public.ai_voice_sessions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_speech_transcripts_session ON public.speech_transcripts (voice_session_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_conversation ON public.media_attachments (conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON public.api_keys (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_api_routes_tenant_channel ON public.api_routes (tenant_id, channel);
CREATE INDEX IF NOT EXISTS idx_verifications_tenant_status ON public.verifications (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_lookup_results_tenant_e164 ON public.lookup_results (tenant_id, e164);
CREATE INDEX IF NOT EXISTS idx_usage_meters_tenant_channel ON public.usage_meters (tenant_id, channel);
CREATE INDEX IF NOT EXISTS idx_usage_meters_metered_at ON public.usage_meters (metered_at);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_tenant ON public.billing_accounts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON public.invoices (tenant_id, status);
ALTER TABLE public.ai_voice_sessions ADD COLUMN IF NOT EXISTS sentiment_trace jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.ai_voice_sessions ADD COLUMN IF NOT EXISTS sentiment_summary jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.ai_voice_sessions ADD COLUMN IF NOT EXISTS latent_metrics jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.ai_voice_sessions ADD COLUMN IF NOT EXISTS barge_in_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.speech_transcripts ADD COLUMN IF NOT EXISTS turn_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.speech_transcripts ADD COLUMN IF NOT EXISTS sentiment jsonb;
ALTER TABLE public.speech_transcripts ADD COLUMN IF NOT EXISTS latency_ms numeric NOT NULL DEFAULT 0;
ALTER TABLE public.speech_transcripts ADD COLUMN IF NOT EXISTS silence_gap_ms numeric NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.carrier_route_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_id text,
  provider_name text,
  channel text NOT NULL,
  route_id text,
  latency_ms numeric NOT NULL DEFAULT 0,
  latency_p95_ms numeric NOT NULL DEFAULT 0,
  packet_loss_pct numeric NOT NULL DEFAULT 0,
  jitter_ms numeric NOT NULL DEFAULT 0,
  delivery_success_pct numeric NOT NULL DEFAULT 100,
  mos_score numeric NOT NULL DEFAULT 0,
  anomaly_flag boolean NOT NULL DEFAULT false,
  anomaly_type text NOT NULL DEFAULT 'none',
  sample_count integer NOT NULL DEFAULT 1,
  measured_at timestamptz NOT NULL DEFAULT now(),
  classification text NOT NULL DEFAULT 'SANDBOX',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carrier_route_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS carrier_route_metrics_isolation ON public.carrier_route_metrics;
CREATE POLICY carrier_route_metrics_isolation ON public.carrier_route_metrics FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_carrier_route_metrics_tenant_channel ON public.carrier_route_metrics (tenant_id, channel);
CREATE INDEX IF NOT EXISTS idx_carrier_route_metrics_anomaly ON public.carrier_route_metrics (anomaly_flag, measured_at);
CREATE INDEX IF NOT EXISTS idx_carrier_route_metrics_measured_at ON public.carrier_route_metrics (measured_at);
CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_sentiment ON public.ai_voice_sessions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_speech_transcripts_turn ON public.speech_transcripts (voice_session_id, turn_index);
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_type text NOT NULL DEFAULT 'trigger',
  step_config jsonb NOT NULL DEFAULT '{}',
  next_step_key text,
  branch_true_step_key text,
  branch_false_step_key text,
  position integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.workflow_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id text NOT NULL,
  step_key text NOT NULL,
  step_type text,
  status text NOT NULL DEFAULT 'pending',
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'sms',
  message_template text,
  voice_script text,
  segment_id text,
  status text NOT NULL DEFAULT 'draft',
  schedule_type text NOT NULL DEFAULT 'immediate',
  scheduled_at timestamptz,
  throttle_per_sec integer NOT NULL DEFAULT 10,
  rate_limit_per_sec integer NOT NULL DEFAULT 25,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  opt_out_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  classification text NOT NULL DEFAULT 'SANDBOX',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.audience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filter_criteria jsonb NOT NULL DEFAULT '{}',
  recipient_count integer NOT NULL DEFAULT 0,
  opt_out_list text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  segment_id text,
  phone_number text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  error text,
  message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflows_isolation ON public.workflows;
CREATE POLICY workflows_isolation ON public.workflows FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS workflow_steps_isolation ON public.workflow_steps;
CREATE POLICY workflow_steps_isolation ON public.workflow_steps FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS workflow_execution_logs_isolation ON public.workflow_execution_logs;
CREATE POLICY workflow_execution_logs_isolation ON public.workflow_execution_logs FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS campaigns_isolation ON public.campaigns;
CREATE POLICY campaigns_isolation ON public.campaigns FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS audience_segments_isolation ON public.audience_segments;
CREATE POLICY audience_segments_isolation ON public.audience_segments FOR ALL USING (tenant_id::text = public.current_tenant_id());
DROP POLICY IF EXISTS campaign_recipients_isolation ON public.campaign_recipients;
CREATE POLICY campaign_recipients_isolation ON public.campaign_recipients FOR ALL USING (tenant_id::text = public.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_status ON public.workflows (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON public.workflow_steps (workflow_id, position);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution ON public.workflow_execution_logs (execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_workflow ON public.workflow_execution_logs (workflow_id, started_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON public.campaigns (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status ON public.campaign_recipients (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_audience_segments_tenant ON public.audience_segments (tenant_id, status);
`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let connection;
    try {
      connection = await base44.asServiceRole.connectors.getWorkspaceConnection(SUPABASE_CONNECTOR_ID);
    } catch (e) {
      return Response.json({
        status: "connector_not_authorized",
        detail: "Authorize the Supabase connector to push the schema live. The full DDL + RLS migration is staged and ready.",
        sql_chars: DDL.length,
        tables: ["tenants", "api_keys", "api_routes", "webhook_dispatchers", "phone_numbers", "sip_trunks", "verifications", "lookup_results", "conversations", "participants", "agents", "routing_queues", "skill_profiles", "task_assignments", "webhook_events", "webhook_deliveries", "ai_voice_sessions", "ai_agent_configs", "speech_transcripts", "media_attachments", "carrier_route_metrics"],
      });
    }

    const accessToken = connection.accessToken;
    const pr = await fetch("https://api.supabase.com/v1/projects", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!pr.ok) return Response.json({ status: "error", detail: `projects list HTTP ${pr.status}` });
    const projects = await pr.json();
    const ref = projects && projects[0] && projects[0].ref;
    if (!ref) return Response.json({ status: "no_project", detail: "No Supabase project found in the connected workspace" });

    const rr = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: DDL }),
    });
    const detail = await rr.text();
    return Response.json({
      status: rr.ok ? "provisioned" : "error",
      ref,
      detail: detail.slice(0, 600),
      tables: ["tenants", "api_keys", "api_routes", "webhook_dispatchers", "phone_numbers", "sip_trunks", "verifications", "lookup_results", "conversations", "participants", "agents", "routing_queues", "skill_profiles", "task_assignments", "webhook_events", "webhook_deliveries", "ai_voice_sessions", "ai_agent_configs", "speech_transcripts", "media_attachments", "carrier_route_metrics"],
    });
  } catch (error) {
    return Response.json({ status: "error", detail: error.message }, { status: 500 });
  }
}
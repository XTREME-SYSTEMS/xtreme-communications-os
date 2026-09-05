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
        tables: ["tenants", "api_keys", "api_routes", "webhook_dispatchers"],
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
      tables: ["tenants", "api_keys", "api_routes", "webhook_dispatchers"],
    });
  } catch (error) {
    return Response.json({ status: "error", detail: error.message }, { status: 500 });
  }
}
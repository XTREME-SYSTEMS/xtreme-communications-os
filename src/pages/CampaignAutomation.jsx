import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Megaphone, Workflow } from "lucide-react";
import CampaignManager from "@/components/xtreme/CampaignManager";
import WorkflowDesigner from "@/components/xtreme/WorkflowDesigner";
import CampaignPerformance from "@/components/xtreme/CampaignPerformance";
import WorkflowTemplateLibrary from "@/components/xtreme/WorkflowTemplateLibrary";

export default function CampaignAutomation() {
  const [campaigns, setCampaigns] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [segments, setSegments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, w, s, t, el] = await Promise.all([
      base44.entities.Campaign.list("-created_date", 50),
      base44.entities.Workflow.list("-created_date", 50),
      base44.entities.AudienceSegment.list("-created_date", 50),
      base44.entities.Tenant.list("-created_date", 50),
      base44.entities.WorkflowExecutionLog.list("-created_date", 200),
    ]);
    setCampaigns(c); setWorkflows(w); setSegments(s); setTenants(t); setExecutionLogs(el); setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-surface-border bg-base/60 backdrop-blur sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-[11px] font-display uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Automations & Campaigns</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">XTREME COMMUNICATIONS · Event-driven workflows + mass outreach engine</span>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-surface-border border-t-accent-orange rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-4 lg:p-6 grid lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2 flex items-center gap-4 text-[10px] font-display uppercase tracking-wider text-text-muted">
            <span className="flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5 text-accent-orange" /> {campaigns.length} Campaigns</span>
            <span className="flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-accent-orange" /> {workflows.length} Workflows</span>
            <span>{segments.length} Segments</span>
          </div>
          <div className="lg:col-span-2"><CampaignPerformance logs={executionLogs} campaigns={campaigns} /></div>
          <WorkflowTemplateLibrary tenants={tenants} onMutate={load} />
          <CampaignManager campaigns={campaigns} segments={segments} tenants={tenants} onMutate={load} />
          <WorkflowDesigner workflows={workflows} tenants={tenants} onMutate={load} />
        </div>
      )}
    </div>
  );
}
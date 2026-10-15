import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, Activity, CheckCircle2, XCircle, Clock, Loader2, Megaphone } from "lucide-react";

export default function ProjectTracker({ project }) {
  const [campaigns, setCampaigns] = useState([]);
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [project?.id]);

  async function load() {
    try {
      const promises = [];
      if (project?.campaign_ids?.length) {
        promises.push(
          base44.entities.Campaign.filter({ id: { $in: project.campaign_ids } }, { limit: 50 })
            .then(r => setCampaigns(r.items || r))
            .catch(() => setCampaigns([]))
        );
      }
      // Load recent comms events for this project's phone number
      if (project?.phone_number_id) {
        promises.push(
          base44.entities.CommsEvent.filter({}, { sort: "-created_date", limit: 20 })
            .then(r => setComms(r.items || r))
            .catch(() => setComms([]))
        );
      }
      await Promise.allSettled(promises);
    } catch (_) {}
    setLoading(false);
  }

  const metrics = project?.metrics || {};
  const metricCards = [
    { label: "Messages Sent", value: metrics.messages_sent || 0, icon: Activity, color: "text-blue-500" },
    { label: "Calls Made", value: metrics.calls_made || 0, icon: Phone, color: "text-purple-500" },
    { label: "Leads Generated", value: metrics.leads_generated || 0, icon: TrendingUp, color: "text-green-500" },
    { label: "Appointments", value: metrics.appointments_booked || 0, icon: CheckCircle2, color: "text-orange-500" },
  ];

  const campaignStats = campaigns.reduce((acc, c) => {
    acc.sent += c.sent_count || 0;
    acc.delivered += c.delivered_count || 0;
    acc.failed += c.failed_count || 0;
    acc.opt_out += c.opt_out_count || 0;
    return acc;
  }, { sent: 0, delivered: 0, failed: 0, opt_out: 0 });

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map(m => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <m.icon className={cn("h-4 w-4", m.color)} />
              <span className="text-2xl font-display font-bold text-foreground">{m.value}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Campaign tracking */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Campaign Tracking</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No campaigns launched yet for this project.</p>
        ) : (
          <>
            {/* Aggregate stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-blue-500/10">
                <p className="text-xl font-bold text-blue-500">{campaignStats.sent}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Sent</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-status-green/10">
                <p className="text-xl font-bold text-status-green">{campaignStats.delivered}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Delivered</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <p className="text-xl font-bold text-destructive">{campaignStats.failed}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                <p className="text-xl font-bold text-yellow-500">{campaignStats.opt_out}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Opt-outs</p>
              </div>
            </div>

            {/* Campaign list */}
            <div className="space-y-2">
              {campaigns.map(c => {
                const deliveryRate = c.sent_count > 0 ? Math.round((c.delivered_count / c.sent_count) * 100) : 0;
                return (
                  <div key={c.id} className="p-3 rounded-lg border border-border bg-accent/30">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.channel} · {c.status}</p>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-full",
                        c.status === "running" ? "bg-status-green/15 text-status-green" :
                        c.status === "completed" ? "bg-blue-500/15 text-blue-500" :
                        "bg-muted text-muted-foreground")}>
                        {deliveryRate}% delivered
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-status-green" style={{ width: `${deliveryRate}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{c.sent_count || 0} sent</span>
                      <span>{c.delivered_count || 0} delivered</span>
                      <span>{c.failed_count || 0} failed</span>
                      <span>{c.opt_out_count || 0} opt-outs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Recent Communication Activity</h3>
        </div>
        {comms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No communication events recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {comms.slice(0, 10).map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30">
                <div className="flex items-center gap-2">
                  {e.direction === "inbound" ? <Activity className="h-3.5 w-3.5 text-blue-500" /> : <Activity className="h-3.5 w-3.5 text-primary" />}
                  <span className="text-xs text-foreground capitalize">{e.channel} · {e.direction}</span>
                  <span className="text-xs text-muted-foreground">{e.from_addr} → {e.to_addr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full",
                    e.status === "delivered" || e.status === "completed" ? "bg-status-green/15 text-status-green" :
                    e.status === "failed" ? "bg-destructive/15 text-destructive" :
                    "bg-muted text-muted-foreground")}>
                    {e.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(e.created_date).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Phone({ className }) {
  return <Activity className={className} />;
}
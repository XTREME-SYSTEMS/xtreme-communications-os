import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import SystemDock from "@/components/xtreme/SystemDock";
import StatusStrip from "@/components/xtreme/StatusStrip";
import MobileNav from "@/components/xtreme/MobileNav";
import {
  Brain,
  Phone,
  Mail,
  Calendar,
  ListTodo,
  Share2,
  BarChart3,
  CreditCard,
  Megaphone,
  Hash,
  KeyRound,
  Radar,
  GitBranch,
  ShieldCheck,
  Network,
  Mailbox,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const APPS = [
  { name: "Communications OS", desc: "Core platform orchestrating all channels", icon: Network, status: "LIVE" },
  { name: "Voice AI Assistant", desc: "AI voice agent with Telnyx Ultra voice", icon: Phone, status: "LIVE" },
  { name: "SMS Gateway", desc: "SMS & MMS messaging pipeline", icon: Mail, status: "LIVE" },
  { name: "Email Automation", desc: "Email tracking and automation", icon: Mailbox, status: "DEV" },
  { name: "Calendar Sync", desc: "Google Calendar availability & scheduling", icon: Calendar, status: "DEV" },
  { name: "Task Manager", desc: "AI-generated task assignments from calls", icon: ListTodo, status: "DEV" },
  { name: "Social Media Manager", desc: "Social media persona management", icon: Share2, status: "DEV" },
  { name: "Analytics Dashboard", desc: "Route quality and performance metrics", icon: BarChart3, status: "LIVE" },
  { name: "Billing & Usage", desc: "Usage metering and invoicing", icon: CreditCard, status: "LIVE" },
  { name: "Campaign Automation", desc: "Workflow and campaign management", icon: Megaphone, status: "LIVE" },
  { name: "Number Management", desc: "Phone number provisioning & SIP", icon: Hash, status: "LIVE" },
  { name: "Developer API", desc: "API keys and endpoint documentation", icon: KeyRound, status: "LIVE" },
  { name: "Route Quality Monitor", desc: "Carrier route telemetry & anomalies", icon: Radar, status: "LIVE" },
  { name: "DEEP Engine", desc: "Deterministic state machine pipeline", icon: GitBranch, status: "LIVE" },
  { name: "Preflight Audit", desc: "System audit and launch readiness", icon: ShieldCheck, status: "LIVE" },
];

const STATUS_BADGE = {
  LIVE: "border-status-green/30 text-status-green bg-status-green/10",
  DEV: "border-chart-4/30 text-chart-4 bg-chart-4/10",
  PLANNED: "border-surface-border text-text-muted",
};

export default function CompanyOverview() {
  const [mobileView, setMobileView] = useState("dispatch");
  const [stats, setStats] = useState({ emails: 0, phoneNumbers: 0, agents: 0, calls: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [emails, numbers, agents, calls] = await Promise.all([
          base44.entities.CommsEvent.filter({ channel: "email" }, "-created_date", 1),
          base44.entities.PhoneNumber.list("-created_date", 1),
          base44.entities.Agent.list("-created_date", 1),
          base44.entities.CommsEvent.filter({ channel: "voice" }, "-created_date", 1),
        ]);
        setStats({
          emails: emails.length,
          phoneNumbers: numbers.length,
          agents: agents.length,
          calls: calls.length,
        });
      } catch (_) {}
    })();
  }, []);

  const trackingStats = [
    { label: "Emails Tracked", value: stats.emails, icon: Mailbox },
    { label: "Phone Numbers", value: stats.phoneNumbers, icon: Hash },
    { label: "Active Agents", value: stats.agents, icon: Users },
    { label: "Calls Handled", value: stats.calls, icon: Phone },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-text-primary">
      <SystemDock activeNode="Company" engineState={{}} />
      <div className="flex-1 flex flex-col min-w-0">
        <StatusStrip
          parityPct={0}
          healthPass={0}
          healthTotal={0}
          queueCount={0}
          activeCount={0}
          onAudit={() => {}}
          auditing={false}
        />
        <div className="flex-1 overflow-y-auto scrollbar-thin grid-hairline">
          <div className="p-4 space-y-4 pb-20 lg:pb-4">
            {/* Hero */}
            <div className="rounded-lg border border-surface-border bg-gradient-to-br from-surface to-base p-6 space-y-2">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-accent-orange" />
                <div>
                  <h1 className="font-display text-2xl tracking-[0.1em] uppercase text-text-primary">
                    Strategic Minds AI
                  </h1>
                  <p className="font-display text-[11px] tracking-[0.25em] uppercase text-accent-orange">
                    Intelligence In Motion
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-text-muted max-w-2xl">
                An autonomous communications ecosystem of 15 strategically designed
                applications working together as one unified operating system — voice,
                SMS, email, social media, and AI-driven engagement with real-time
                observability.
              </p>
            </div>

            {/* Tracking Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trackingStats.map(s => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-lg border border-surface-border bg-surface p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-accent-orange" />
                      <span className="font-display text-[10px] tracking-[0.1em] uppercase text-text-muted">
                        {s.label}
                      </span>
                    </div>
                    <span className="font-display text-2xl text-text-primary">{s.value}</span>
                  </div>
                );
              })}
            </div>

            {/* App Grid */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-muted">
                  Application Ecosystem · 15 Apps
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {APPS.map(app => {
                  const Icon = app.icon;
                  return (
                    <div
                      key={app.name}
                      className="rounded-lg border border-surface-border bg-surface p-4 space-y-2 hover:border-accent-orange/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <Icon className="h-5 w-5 text-accent-orange" />
                        <span
                          className={cn(
                            "text-[9px] font-display tracking-wider uppercase px-2 py-0.5 rounded border",
                            STATUS_BADGE[app.status]
                          )}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div>
                        <div className="font-display text-[13px] tracking-wide text-text-primary">
                          {app.name}
                        </div>
                        <p className="text-[11px] text-text-muted mt-1">{app.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav view={mobileView} setView={setMobileView} />
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { LayoutTemplate, MessageSquare, Phone, Clock, UserPlus, Image, Gavel, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    key: "inbound_sms_reply",
    name: "Inbound SMS Auto-Reply",
    description: "Auto-respond to inbound texts with a templated message",
    icon: MessageSquare,
    trigger_type: "inbound_sms",
    color: "text-status-green",
    steps: [
      { step_key: "receive", step_type: "trigger", next_step_key: "reply" },
      { step_key: "reply", step_type: "send_message", step_config: { template: "Thanks for reaching out! We'll get back to you shortly." } },
    ],
  },
  {
    key: "investor_outbid_call",
    name: "Investor Outbid Voice Call",
    description: "Trigger an AI voice call when an investor is outbid on a property",
    icon: Gavel,
    trigger_type: "bid_event",
    color: "text-accent-orange",
    steps: [
      { step_key: "bid_detected", step_type: "trigger", next_step_key: "check_outbid" },
      { step_key: "check_outbid", step_type: "condition", step_config: { field: "event.outbid", operator: "equals", value: true }, branch_true_step_key: "call_investor", branch_false_step_key: "end" },
      { step_key: "call_investor", step_type: "api_call", step_config: { function: "gatewayCalls", script: "Hi, you've been outbid on a property. Would you like to increase your offer?" }, next_step_key: "end" },
      { step_key: "end", step_type: "action_delay", step_config: { delay_seconds: 0 } },
    ],
  },
  {
    key: "lead_nurture_sequence",
    name: "Lead Nurture Sequence",
    description: "Staggered follow-up messages over 3 days after initial contact",
    icon: Clock,
    trigger_type: "inbound_sms",
    color: "text-chart-4",
    steps: [
      { step_key: "initial", step_type: "trigger", next_step_key: "day1" },
      { step_key: "day1", step_type: "send_message", step_config: { template: "Thanks for your interest! Here's more info." }, next_step_key: "wait1" },
      { step_key: "wait1", step_type: "action_delay", step_config: { delay_seconds: 86400 }, next_step_key: "day2" },
      { step_key: "day2", step_type: "send_message", step_config: { template: "Just checking in — any questions?" }, next_step_key: "wait2" },
      { step_key: "wait2", step_type: "action_delay", step_config: { delay_seconds: 172800 }, next_step_key: "day3" },
      { step_key: "day3", step_type: "send_message", step_config: { template: "Final follow-up — ready to move forward?" } },
    ],
  },
  {
    key: "escalation_human",
    name: "Escalate to Human Agent",
    description: "Route negative-sentiment conversations to a human supervisor",
    icon: UserPlus,
    trigger_type: "webhook_event",
    color: "text-destructive",
    steps: [
      { step_key: "sentiment_check", step_type: "trigger", next_step_key: "is_negative" },
      { step_key: "is_negative", step_type: "condition", step_config: { field: "sentiment.label", operator: "equals", value: "negative" }, branch_true_step_key: "escalate", branch_false_step_key: "end" },
      { step_key: "escalate", step_type: "escalation_human", step_config: { queue: "supervisor", priority: "high" } },
      { step_key: "end", step_type: "action_delay", step_config: { delay_seconds: 0 } },
    ],
  },
  {
    key: "mms_media_capture",
    name: "MMS Media Capture + Thread",
    description: "Capture inbound MMS media and thread into the conversation timeline",
    icon: Image,
    trigger_type: "inbound_mms",
    color: "text-chart-5",
    steps: [
      { step_key: "mms_received", step_type: "trigger", next_step_key: "process_media" },
      { step_key: "process_media", step_type: "api_call", step_config: { function: "processMediaAttachment" } },
    ],
  },
  {
    key: "outbid_voice_loop",
    name: "Outbid AI Voice Loop",
    description: "Orchestrate AI voice calls to outbid investors with real-time negotiation",
    icon: Phone,
    trigger_type: "bid_event",
    color: "text-accent-orange",
    steps: [
      { step_key: "outbid_trigger", step_type: "trigger", next_step_key: "check_bidder" },
      { step_key: "check_bidder", step_type: "condition", step_config: { field: "event.is_outbid", operator: "equals", value: true }, branch_true_step_key: "voice_loop", branch_false_step_key: "end" },
      { step_key: "voice_loop", step_type: "escalation_ai", step_config: { agent: "eden_skye", script: "You've been outbid. Would you like to increase your offer?" } },
      { step_key: "end", step_type: "action_delay", step_config: { delay_seconds: 0 } },
    ],
  },
];

export default function WorkflowTemplateLibrary({ tenants, onMutate }) {
  const { toast } = useToast();
  const [deploying, setDeploying] = useState(null);

  const instantiate = async (tpl) => {
    setDeploying(tpl.key);
    try {
      const wf = await base44.entities.Workflow.create({
        tenant_id: tenants[0]?.id || "demo",
        name: tpl.name,
        description: tpl.description,
        trigger_type: tpl.trigger_type,
        trigger_config: {},
        status: "draft",
        version: 1,
      });
      if (tpl.steps.length) {
        await base44.entities.WorkflowStep.bulkCreate(
          tpl.steps.map((s, i) => ({
            tenant_id: tenants[0]?.id || "demo",
            workflow_id: wf.id,
            step_key: s.step_key,
            step_type: s.step_type,
            step_config: s.step_config || {},
            next_step_key: s.next_step_key || null,
            branch_true_step_key: s.branch_true_step_key || null,
            branch_false_step_key: s.branch_false_step_key || null,
            position: i,
            enabled: true,
          }))
        );
      }
      onMutate();
      toast({ title: `Template deployed: ${tpl.name}`, description: `${tpl.steps.length} steps pre-configured` });
    } catch (e) {
      toast({ title: "Deploy failed", description: String(e.message || e), variant: "destructive" });
    } finally {
      setDeploying(null);
    }
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface">
      <div className="px-4 h-11 flex items-center gap-2 border-b border-surface-border">
        <LayoutTemplate className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase">Workflow Template Library</span>
        <span className="ml-auto text-[10px] text-text-muted font-display">{TEMPLATES.length} templates</span>
      </div>
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <div
              key={tpl.key}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("template", tpl.key)}
              className="group rounded-lg border border-surface-border bg-background p-3 cursor-grab hover:border-accent-orange/40 transition-colors active:cursor-grabbing"
            >
              <div className="flex items-start gap-2.5">
                <div className="rounded-md bg-surface p-2 border border-surface-border">
                  <Icon className={cn("h-4 w-4", tpl.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-text-primary font-medium truncate">{tpl.name}</div>
                  <div className="text-[10px] text-text-muted leading-snug mt-0.5">{tpl.description}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[8px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface border border-surface-border text-text-muted">{tpl.trigger_type}</span>
                    <span className="text-[8px] font-display uppercase tracking-wider text-text-muted">{tpl.steps.length} steps</span>
                  </div>
                </div>
                <button
                  onClick={() => instantiate(tpl)}
                  disabled={deploying === tpl.key}
                  className="shrink-0 flex items-center gap-1 h-7 px-2 rounded border border-accent-orange/40 text-accent-orange text-[9px] font-display uppercase tracking-wider hover:bg-accent-orange/10 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" /> {deploying === tpl.key ? "..." : "Deploy"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
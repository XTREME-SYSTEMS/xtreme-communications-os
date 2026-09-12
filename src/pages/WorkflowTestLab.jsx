import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Image, PhoneCall, MessageCircle, UserPlus, Calendar,
  ListChecks, Bot, Monitor, Zap, Loader2, CheckCircle2, XCircle, Play, Phone, AlertTriangle
} from "lucide-react";
import VisualMessagePreview from "@/components/workflow-test-lab/VisualMessagePreview";

const TARGET_NUMBER = "+17722090266";

const WORKFLOWS = [
  {
    id: 1, name: "SMS Notification", icon: MessageSquare, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/30",
    desc: "Sends a plain text SMS to your number with a test message.",
    tests: "Outbound SMS delivery via Telnyx",
  },
  {
    id: 2, name: "MMS with Image", icon: Image, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30",
    desc: "Sends an MMS with an image URL attached to your number.",
    tests: "Outbound MMS (media attachment) delivery",
  },
  {
    id: 3, name: "AI Voice Call", icon: PhoneCall, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30",
    desc: "Places an AI-powered voice call to your number — answer to hear the greeting.",
    tests: "Outbound voice call with AI greeting",
  },
  {
    id: 4, name: "WhatsApp Message", icon: MessageCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30",
    desc: "Sends a WhatsApp Business message to your number.",
    tests: "Outbound WhatsApp messaging",
  },
  {
    id: 5, name: "Lead Capture Auto-Reply", icon: UserPlus, color: "text-pink-500", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/30",
    desc: "Simulates an inbound SMS from your number, creates a CRM lead, and sends an auto-reply back.",
    tests: "Inbound SMS → CRM lead creation → auto-reply loop",
  },
  {
    id: 6, name: "Appointment Reminder", icon: Calendar, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30",
    desc: "Sends a formatted appointment reminder SMS with date, time, and location.",
    tests: "Templated SMS with dynamic content",
  },
  {
    id: 7, name: "Follow-up Sequence Day 1", icon: ListChecks, color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30",
    desc: "Triggers day 1 of a multi-day follow-up sequence — sends the first outreach message.",
    tests: "Campaign sequence engine — first touch",
  },
  {
    id: 8, name: "AI Summary via SMS", icon: Bot, color: "text-indigo-500", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30",
    desc: "AI generates a business intelligence summary, then delivers it to your number via SMS.",
    tests: "AI task → SMS delivery pipeline",
  },
  {
    id: 9, name: "Browser Agent Report", icon: Monitor, color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30",
    desc: "Browserbase agent visits a website, extracts info, and sends a summary to your number via SMS.",
    tests: "Cloud browser → AI analysis → SMS delivery",
  },
  {
    id: 10, name: "Multi-Channel Blast", icon: Zap, color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/30",
    desc: "Fires SMS + Voice Call + WhatsApp simultaneously to your number — the full stack at once.",
    tests: "Parallel multi-channel orchestration",
  },
];

export default function WorkflowTestLab() {
  const [fromNumber, setFromNumber] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [numbers, setNumbers] = useState([]);
  const [results, setResults] = useState({}); // { [workflowId]: { status, data, error } }
  const [running, setRunning] = useState(new Set());

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [nums, keys] = await Promise.all([
        base44.entities.PhoneNumber.list("-created_date", 20).catch(() => []),
        base44.entities.ApiKey.filter({ status: "active" }).catch(() => []),
      ]);
      setNumbers(nums || []);
      setApiKey(keys?.[0]?.key_value || "");
      // Prefer a number that's on Telnyx (has provider_id) with SMS capability
      const telnyxNum = nums?.find(n => n.provider_id && n.capabilities?.includes("sms"));
      if (telnyxNum) setFromNumber(telnyxNum.e164);
      else if (nums?.length) setFromNumber(nums[0].e164);
    } catch (e) {
      console.error(e);
    }
  };

  const runWorkflow = async (wf) => {
    setRunning((prev) => new Set(prev).add(wf.id));
    setResults((prev) => ({ ...prev, [wf.id]: { status: "running" } }));
    try {
      let res;
      // executeAutonomousAction expects from_number/to_number; gatewayVoiceControl and gatewayMessages expect from/to
      const baseExec = { api_key: apiKey, from_number: fromNumber, to_number: TARGET_NUMBER };
      const baseGW = { api_key: apiKey, from: fromNumber, to: TARGET_NUMBER };

      switch (wf.id) {
        case 1: // SMS
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "send_sms",
            message: "✅ XTREME Test: SMS workflow is working! You should receive this message on your phone.",
          });
          break;
        case 2: // MMS — gatewayMessages uses from/to/body/channel/media_urls
          res = await base44.functions.invoke("gatewayMessages", {
            ...baseGW, channel: "mms",
            body: "📸 XTREME Test: MMS with image attachment is working!",
            media_urls: ["https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400"],
          });
          break;
        case 3: // Voice Call — gatewayVoiceControl uses from/to
          res = await base44.functions.invoke("gatewayVoiceControl", {
            ...baseGW, action: "dial",
          });
          break;
        case 4: // WhatsApp
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "send_whatsapp",
            message: "✅ XTREME Test: WhatsApp messaging is working! You should see this in WhatsApp.",
          });
          break;
        case 5: // Lead Capture
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "create_lead",
            full_name: "Test Lead from Workflow Lab",
            phone: TARGET_NUMBER,
            email: "test+" + Date.now() + "@example.com",
            notes: "Created by Workflow Test Lab — lead capture test",
          });
          // Then send auto-reply SMS
          await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "send_sms",
            message: "Hi! Thanks for reaching out. We've received your inquiry and will follow up shortly. — XTREME AI Team",
          });
          break;
        case 6: // Appointment Reminder
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "send_sms",
            message: "📅 Reminder: You have an appointment tomorrow at 2:00 PM ET with our team. Location: Virtual (Zoom link will be sent 15 min before). Reply C to confirm or R to reschedule. — XTREME AI",
          });
          break;
        case 7: // Follow-up Day 1
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "send_sms",
            message: "Hi! This is Alex from XTREME Communications. I wanted to follow up on your interest in our AI communications platform. Are you available for a quick 10-min call this week? Reply with a good time or STOP to opt out.",
          });
          break;
        case 8: // AI Summary via SMS
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "ai_task",
            prompt: "Generate a 2-sentence executive summary of the top 3 AI communications trends for 2026. Keep it under 160 characters total for SMS.",
            deliver_via: "sms",
            deliver_to: TARGET_NUMBER,
          });
          break;
        case 9: // Browser Agent Report
          res = await base44.functions.invoke("executeAutonomousAction", {
            ...baseExec, action: "browser_agent",
            task: "Go to https://news.ycombinator.com and find the top 3 story titles. Return them as a short summary.",
            wait_for_completion: true,
            deliver_via: "sms",
            deliver_to: TARGET_NUMBER,
          });
          break;
        case 10: // Multi-Channel Blast
          const [smsRes, voiceRes, waRes] = await Promise.allSettled([
            base44.functions.invoke("executeAutonomousAction", {
              ...baseExec, action: "send_sms",
              message: "💥 Multi-channel blast: SMS channel confirmed working!",
            }),
            base44.functions.invoke("gatewayVoiceControl", {
              ...baseGW, action: "dial",
            }),
            base44.functions.invoke("executeAutonomousAction", {
              ...baseExec, action: "send_whatsapp",
              message: "💥 Multi-channel blast: WhatsApp channel confirmed working!",
            }),
          ]);
          res = { data: { sms: smsRes.status === "fulfilled" ? "sent" : smsRes.reason?.message, voice: voiceRes.status === "fulfilled" ? "dialed" : voiceRes.reason?.message, whatsapp: waRes.status === "fulfilled" ? "sent" : waRes.reason?.message } };
          break;
        default:
          throw new Error("Unknown workflow");
      }

      const data = res?.data || res;
      // Enrich with the sent data for visual preview
      const sentData = {
        message: wf.id === 1 ? "✅ XTREME Test: SMS workflow is working! You should receive this message on your phone." :
                 wf.id === 4 ? "✅ XTREME Test: WhatsApp messaging is working! You should see this in WhatsApp." :
                 wf.id === 5 ? "Hi! Thanks for reaching out. We've received your inquiry and will follow up shortly. — XTREME AI Team" :
                 wf.id === 6 ? "📅 Reminder: You have an appointment tomorrow at 2:00 PM ET with our team. Location: Virtual (Zoom link will be sent 15 min before). Reply C to confirm or R to reschedule. — XTREME AI" :
                 wf.id === 7 ? "Hi! This is Alex from XTREME Communications. I wanted to follow up on your interest in our AI communications platform. Are you available for a quick 10-min call this week? Reply with a good time or STOP to opt out." :
                 wf.id === 10 ? "💥 Multi-channel blast: SMS channel confirmed working!" : "",
        from: fromNumber,
        to: TARGET_NUMBER,
        body: wf.id === 2 ? "📸 XTREME Test: MMS with image attachment is working!" : undefined,
        media_urls: wf.id === 2 ? ["https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400"] : undefined,
        task: wf.id === 9 ? "Go to https://news.ycombinator.com and find the top 3 story titles. Return them as a short summary." : undefined,
        phone: wf.id === 5 ? TARGET_NUMBER : undefined,
        email: wf.id === 5 ? "test@example.com" : undefined,
      };
      const enrichedData = { ...data, ...sentData, from_number: data.from_number || fromNumber };
      if (data?.error) {
        setResults((prev) => ({ ...prev, [wf.id]: { status: "error", error: data.error } }));
      } else {
        setResults((prev) => ({ ...prev, [wf.id]: { status: "success", data: enrichedData } }));
      }
    } catch (e) {
      setResults((prev) => ({ ...prev, [wf.id]: { status: "error", error: e.message || "Workflow failed" } }));
    } finally {
      setRunning((prev) => { const next = new Set(prev); next.delete(wf.id); return next; });
    }
  };

  const runAll = async () => {
    for (const wf of WORKFLOWS) {
      await runWorkflow(wf);
      await new Promise((r) => setTimeout(r, 500)); // small gap between workflows
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Workflow Test Lab</h1>
          <p className="text-sm text-muted-foreground mt-1">10 real workflows — all sending to your number to verify every channel works</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target Number</p>
            <p className="text-lg font-display font-bold text-primary">{TARGET_NUMBER}</p>
          </div>
          <button
            onClick={runAll}
            disabled={running.size > 0 || !fromNumber || !apiKey}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              running.size > 0 || !fromNumber || !apiKey
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90"
            )}
          >
            {running.size > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {running.size > 0 ? `Running ${running.size}...` : "Run All 10"}
          </button>
        </div>
      </div>

      {/* From number + API key status */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">From:</span>
          <select
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            {numbers.length === 0 && <option value="">No numbers</option>}
            {numbers.map((n) => (
              <option key={n.id} value={n.e164}>
                {n.e164} {n.provider_id ? "✓ Telnyx" : "⚠ not on Telnyx"} {n.capabilities?.includes("sms") ? "" : "(no SMS)"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", apiKey ? "bg-status-green" : "bg-destructive")} />
          <span className="text-xs text-muted-foreground">{apiKey ? "API Key Active" : "No API Key — create one in API Keys"}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-sm font-mono font-medium text-foreground">{TARGET_NUMBER}</span>
        </div>
      </div>

      {/* Workflow grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WORKFLOWS.map((wf) => {
          const result = results[wf.id];
          const isRunning = running.has(wf.id);
          const Icon = wf.icon;
          return (
            <div
              key={wf.id}
              className={cn(
                "rounded-xl border bg-card p-5 transition-all",
                result?.status === "success" ? "border-status-green/40" :
                result?.status === "error" ? "border-destructive/40" :
                cn(wf.borderColor, "hover:shadow-md")
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", wf.bgColor)}>
                    <Icon className={cn("h-5 w-5", wf.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">#{wf.id}</span>
                      <h3 className="font-semibold text-foreground text-sm">{wf.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{wf.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => runWorkflow(wf)}
                  disabled={isRunning || !fromNumber || !apiKey}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    isRunning || !fromNumber || !apiKey
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {isRunning ? "Running" : "Test"}
                </button>
              </div>

              {/* What it tests */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                <span className="font-medium">Tests:</span>
                <span>{wf.tests}</span>
              </div>

              {/* Result */}
              {result?.status === "success" && (
                <div className="space-y-2">
                  {/* Delivery status banner */}
                  {(() => {
                    const d = result.data || {};
                    const isDelivered = d.delivered || d.to_status === "delivered" || d.to_status === "sent";
                    const isAccepted = d.api_accepted || d.status === "call_initiated" || d.status === "ringing" || d.contact_id;
                    const isDeliveryFailed = d.to_status === "delivery_failed" || d.error_code === "40329";
                    const isVoice = d.call_control_id || d.status === "call_initiated" || d.status === "ringing";
                    const isAi = d.result && d.action === "ai_task";
                    const isBrowser = d.result && d.action === "browser_agent";
                    const isLead = d.contact_id;
                    const isMultiChannel = d.sms !== undefined && d.voice !== undefined;

                    if (isDelivered || isVoice || isAi || isBrowser || isLead || isMultiChannel) {
                      return (
                        <div className={cn(
                          "flex items-start gap-2 p-2.5 rounded-lg border",
                          isDelivered ? "bg-status-green/10 border-status-green/20" :
                          isVoice ? "bg-blue-500/10 border-blue-500/20" :
                          "bg-accent-orange/10 border-accent-orange/20"
                        )}>
                          {isDelivered ? <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" /> :
                           isVoice ? <PhoneCall className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" /> :
                           <Zap className="h-4 w-4 text-accent-orange shrink-0 mt-0.5" />}
                          <div className="text-xs">
                            <p className={cn("font-medium",
                              isDelivered ? "text-status-green" :
                              isVoice ? "text-blue-500" : "text-accent-orange"
                            )}>
                              {isDelivered ? "✅ Delivered to phone" :
                               isVoice ? "📞 Call placed — check your phone" :
                               isAi ? "🤖 AI task completed" :
                               isBrowser ? "🌐 Browser agent completed" :
                               isLead ? "👤 Lead created in CRM" :
                               isMultiChannel ? "💥 Multi-channel blast fired" :
                               "Success"}
                            </p>
                            {d.error_detail && !isDelivered && (
                              <p className="text-muted-foreground mt-0.5 text-[10px]">{d.error_detail}</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (isDeliveryFailed) {
                      return (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-medium text-yellow-600 dark:text-yellow-500">⚠️ Accepted by Telnyx but delivery failed</p>
                            <p className="text-muted-foreground mt-0.5 text-[10px]">
                              {d.error_detail || d.error || "Toll-free number not verified — SMS accepted but carrier rejected delivery"}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-[10px]">
                              Fix: Submit toll-free verification in Telnyx dashboard → Messaging → Toll-Free Verification
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-status-green/10 border border-status-green/20">
                        <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-medium text-status-green">Success</p>
                          {result.data && (
                            <p className="text-muted-foreground mt-0.5 font-mono text-[10px] truncate">
                              {typeof result.data === "object" ? JSON.stringify(result.data).slice(0, 120) : String(result.data).slice(0, 120)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Visual message preview */}
                  <VisualMessagePreview
                    workflowId={wf.id}
                    result={result}
                    workflowData={wf}
                  />

                  {/* Raw API response (collapsible) */}
                  {result.data && (
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw API response</summary>
                      <pre className="mt-1 p-2 rounded bg-muted/50 overflow-x-auto scrollbar-thin font-mono text-[9px] max-h-32">
                        {JSON.stringify(result.data, null, 2).slice(0, 500)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              {result?.status === "error" && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-destructive">Failed</p>
                    <p className="text-muted-foreground mt-0.5">{result.error}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System status — what's live vs blocked */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">System Status — Channel Readiness</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 rounded-lg p-2.5 bg-status-green/5 border border-status-green/20">
            <div className="w-2 h-2 rounded-full bg-status-green tl-led" />
            <div>
              <p className="text-xs font-medium text-foreground">Voice Calls</p>
              <p className="text-[10px] text-muted-foreground">✅ Live — Telnyx Call Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2.5 bg-status-green/5 border border-status-green/20">
            <div className="w-2 h-2 rounded-full bg-status-green tl-led" />
            <div>
              <p className="text-xs font-medium text-foreground">AI Gateway</p>
              <p className="text-[10px] text-muted-foreground">✅ Live — Vercel AI Gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2.5 bg-status-green/5 border border-status-green/20">
            <div className="w-2 h-2 rounded-full bg-status-green tl-led" />
            <div>
              <p className="text-xs font-medium text-foreground">Cloud Browser</p>
              <p className="text-[10px] text-muted-foreground">✅ Live — Browserbase</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2.5 bg-yellow-500/5 border border-yellow-500/20">
            <div className="w-2 h-2 rounded-full bg-yellow-500 tl-led" />
            <div>
              <p className="text-xs font-medium text-foreground">SMS / MMS</p>
              <p className="text-[10px] text-muted-foreground">⚠️ Toll-free verification pending</p>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-yellow-600 dark:text-yellow-500">SMS/MMS:</span> Telnyx accepts messages but Verizon rejects delivery (error 40329 — toll-free number not verified). Submit verification in Telnyx Dashboard → Messaging → Toll-Free Verification. Approval takes 2-5 business days.</p>
          <p><span className="font-medium text-yellow-600 dark:text-yellow-500">WhatsApp:</span> Requires WhatsApp Business Account setup on Telnyx. The number must be WhatsApp-enabled in Telnyx Dashboard → Messaging → WhatsApp.</p>
          <p><span className="font-medium text-status-green">Voice/AI/Browser:</span> These channels are fully operational — tests will show real results.</p>
        </div>
      </div>
    </div>
  );
}
import { MessageSquare, Image, MessageCircle, PhoneCall, Bot, Monitor, UserPlus, Calendar, ListChecks, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Visual SMS bubble — shows what the message looks like on a phone
export function SmsBubble({ from, message, status }) {
  return (
    <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        <span className="font-mono">{from || "+18334843799"}</span>
        <span className="ml-auto">{status === "delivered" ? "🟢 Delivered" : status === "queued" ? "🟡 Queued" : "🔴 Failed"}</span>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-green-500 text-white px-3 py-2 text-sm">
          {message}
        </div>
      </div>
      <div className="text-right text-[9px] text-muted-foreground">
        {new Date().toLocaleTimeString()} • SMS
      </div>
    </div>
  );
}

// Visual MMS bubble — shows message + image attachment
export function MmsBubble({ from, message, mediaUrl, status }) {
  return (
    <div className="rounded-2xl bg-purple-500/5 border border-purple-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Image className="h-3 w-3" />
        <span className="font-mono">{from || "+18334843799"}</span>
        <span className="ml-auto">{status === "delivered" ? "🟢 Delivered" : status === "queued" ? "🟡 Queued" : "🔴 Failed"}</span>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-purple-500 text-white px-3 py-2 text-sm space-y-2">
          {mediaUrl && (
            <div className="rounded-lg overflow-hidden bg-purple-400/50">
              <img src={mediaUrl} alt="MMS attachment" className="w-full h-32 object-cover" />
            </div>
          )}
          {message}
        </div>
      </div>
      <div className="text-right text-[9px] text-muted-foreground">
        {new Date().toLocaleTimeString()} • MMS
      </div>
    </div>
  );
}

// Visual WhatsApp bubble
export function WhatsAppBubble({ from, message, status }) {
  return (
    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <MessageCircle className="h-3 w-3" />
        <span className="font-mono">{from || "+18334843799"}</span>
        <span className="ml-auto">{status === "delivered" ? "🟢 Delivered" : "🟡 Sent"}</span>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 text-white px-3 py-2 text-sm">
          {message}
        </div>
      </div>
      <div className="text-right text-[9px] text-muted-foreground">
        {new Date().toLocaleTimeString()} • WhatsApp
      </div>
    </div>
  );
}

// Voice call status card
export function VoiceCallStatus({ from, to, callControlId, status, error }) {
  return (
    <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <PhoneCall className="h-3 w-3" />
        <span>Outbound Voice Call</span>
        <span className="ml-auto">{status === "call_initiated" || status === "ringing" ? "🟢 Ringing" : "🔴 Failed"}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-blue-600">{from}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono text-blue-600">{to}</span>
        </div>
      </div>
      {callControlId && (
        <div className="text-[10px] font-mono text-muted-foreground truncate">
          Call Control ID: {callControlId}
        </div>
      )}
      {error && (
        <div className="text-[10px] text-destructive">{error}</div>
      )}
      <div className="text-[9px] text-muted-foreground">
        {new Date().toLocaleTimeString()} • Voice via Telnyx Call Control
      </div>
    </div>
  );
}

// AI result card
export function AiResultCard({ result, model, delivered, deliveryStatus }) {
  return (
    <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Bot className="h-3 w-3" />
        <span>AI Generated Content</span>
        <span className="ml-auto">Model: {model || "gpt-5.4-mini"}</span>
      </div>
      <div className="rounded-lg bg-indigo-500/10 p-2.5 text-sm text-foreground whitespace-pre-wrap">
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </div>
      {delivered !== undefined && (
        <div className="text-[10px] text-muted-foreground">
          SMS Delivery: {deliveryStatus === "delivered" ? "🟢 Delivered to phone" : "🔴 Delivery failed (toll-free verification needed)"}
        </div>
      )}
    </div>
  );
}

// Browser agent result card
export function BrowserResultCard({ task, result, delivered, deliveryStatus }) {
  const summary = typeof result === "string" ? result : (result?.output || result?.result || JSON.stringify(result, null, 2));
  return (
    <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Monitor className="h-3 w-3" />
        <span>Browserbase Agent Result</span>
      </div>
      <div className="text-[10px] text-muted-foreground italic">Task: {task}</div>
      <div className="rounded-lg bg-cyan-500/10 p-2.5 text-sm text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
        {String(summary).slice(0, 500)}
      </div>
      {delivered !== undefined && (
        <div className="text-[10px] text-muted-foreground">
          SMS Delivery: {deliveryStatus === "delivered" ? "🟢 Delivered to phone" : "🔴 Delivery failed (toll-free verification needed)"}
        </div>
      )}
    </div>
  );
}

// Lead creation result card
export function LeadResultCard({ contactId, name, phone, email }) {
  return (
    <div className="rounded-2xl bg-pink-500/5 border border-pink-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <UserPlus className="h-3 w-3" />
        <span>CRM Lead Created</span>
        <span className="ml-auto">🟢 Success</span>
      </div>
      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground text-xs">Name:</span> {name}</div>
        <div><span className="text-muted-foreground text-xs">Phone:</span> {phone}</div>
        {email && <div><span className="text-muted-foreground text-xs">Email:</span> {email}</div>}
        {contactId && <div className="text-[10px] font-mono text-muted-foreground">ID: {contactId}</div>}
      </div>
    </div>
  );
}

// Multi-channel blast result
export function MultiChannelCard({ sms, voice, whatsapp }) {
  return (
    <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Multi-Channel Blast Results</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={cn("rounded-lg p-2 text-center", sms === "sent" || sms === "delivered" ? "bg-green-500/10" : "bg-destructive/10")}>
          <MessageSquare className={cn("h-4 w-4 mx-auto mb-1", sms === "sent" || sms === "delivered" ? "text-green-500" : "text-destructive")} />
          <div className="text-[10px] font-medium">SMS</div>
          <div className={cn("text-[9px]", sms === "sent" || sms === "delivered" ? "text-green-500" : "text-destructive")}>
            {sms === "sent" || sms === "delivered" ? "✅ Sent" : "❌ Failed"}
          </div>
        </div>
        <div className={cn("rounded-lg p-2 text-center", voice === "dialed" || voice === "ringing" ? "bg-blue-500/10" : "bg-destructive/10")}>
          <PhoneCall className={cn("h-4 w-4 mx-auto mb-1", voice === "dialed" || voice === "ringing" ? "text-blue-500" : "text-destructive")} />
          <div className="text-[10px] font-medium">Voice</div>
          <div className={cn("text-[9px]", voice === "dialed" || voice === "ringing" ? "text-blue-500" : "text-destructive")}>
            {voice === "dialed" || voice === "ringing" ? "✅ Dialed" : "❌ Failed"}
          </div>
        </div>
        <div className={cn("rounded-lg p-2 text-center", whatsapp === "sent" || whatsapp === "delivered" ? "bg-emerald-500/10" : "bg-destructive/10")}>
          <MessageCircle className={cn("h-4 w-4 mx-auto mb-1", whatsapp === "sent" || whatsapp === "delivered" ? "text-emerald-500" : "text-destructive")} />
          <div className="text-[10px] font-medium">WhatsApp</div>
          <div className={cn("text-[9px]", whatsapp === "sent" || whatsapp === "delivered" ? "text-emerald-500" : "text-destructive")}>
            {whatsapp === "sent" || whatsapp === "delivered" ? "✅ Sent" : "❌ Failed"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main renderer — picks the right visual based on workflow type
export default function VisualMessagePreview({ workflowId, result, workflowData }) {
  if (!result) return null;

  const status = result.status;
  const data = result.data || result;

  // For SMS workflows (1, 5, 6, 7)
  if ([1, 5, 6, 7].includes(workflowId)) {
    return (
      <SmsBubble
        from={data.from_number}
        message={data.message || workflowData?.message}
        status={data.to_status || (data.api_accepted ? "queued" : "failed")}
      />
    );
  }

  // MMS (2)
  if (workflowId === 2) {
    return (
      <MmsBubble
        from={data.from || workflowData?.from}
        message={data.body || workflowData?.body}
        mediaUrl={workflowData?.media_urls?.[0]}
        status={data.status || (data.api_accepted ? "queued" : "failed")}
      />
    );
  }

  // Voice (3)
  if (workflowId === 3) {
    return (
      <VoiceCallStatus
        from={data.from || workflowData?.from}
        to={data.to || workflowData?.to}
        callControlId={data.call_control_id}
        status={data.status}
        error={data.error}
      />
    );
  }

  // WhatsApp (4)
  if (workflowId === 4) {
    return (
      <WhatsAppBubble
        from={data.from_number}
        message={data.message || workflowData?.message}
        status={data.to_status || data.status}
      />
    );
  }

  // AI Summary (8)
  if (workflowId === 8) {
    return (
      <AiResultCard
        result={data.result}
        model={data.model}
        delivered={data.delivered_via === "sms"}
        deliveryStatus={data.delivery_status}
      />
    );
  }

  // Browser Agent (9)
  if (workflowId === 9) {
    return (
      <BrowserResultCard
        task={data.task || workflowData?.task}
        result={data.result}
        delivered={data.delivered_via === "sms"}
        deliveryStatus={data.delivery_status}
      />
    );
  }

  // Multi-Channel Blast (10)
  if (workflowId === 10) {
    return (
      <MultiChannelCard
        sms={data.sms}
        voice={data.voice}
        whatsapp={data.whatsapp}
      />
    );
  }

  // Lead creation (5 — if it's the lead part)
  if (workflowId === 5 && data.contact_id) {
    return (
      <LeadResultCard
        contactId={data.contact_id}
        name={data.name}
        phone={workflowData?.phone}
        email={workflowData?.email}
      />
    );
  }

  return null;
}
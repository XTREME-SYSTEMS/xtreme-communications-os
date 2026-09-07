import { Calendar, Mail, CheckCircle2, XCircle, Clock, User, ExternalLink, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ status, label }) {
  if (status === "sent" || status === "created" || status === "success") {
    return (
      <span className="flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-status-green">
        <CheckCircle2 className="h-3 w-3" /> {label || "Success"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[9px] font-display uppercase tracking-wider text-destructive">
      <XCircle className="h-3 w-3" /> {label || "Failed"}
    </span>
  );
}

export default function SchedulingResults({ scheduling }) {
  if (!scheduling) return null;

  const {
    enabled, calendar_date, calendar_error, available_slots,
    scheduled_slot, captured_email, scheduling_summary,
    calendar_event, calendar_event_error, invite_email, human_notification,
  } = scheduling;

  if (!enabled) {
    return (
      <div className="tl-panel rounded-xl p-4 border-surface-border">
        <div className="flex items-center gap-2 text-[11px] text-text-muted font-display uppercase tracking-wider">
          <Calendar className="h-4 w-4" /> Scheduling Disabled
        </div>
      </div>
    );
  }

  return (
    <div className="tl-panel rounded-xl p-5 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-orange to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Calendar className="h-5 w-5 text-accent-orange" />
          <div className="absolute -inset-1 rounded-full bg-accent-orange/20 blur-md -z-10" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-[12px] tracking-[0.15em] uppercase text-text-primary">Scheduling Results</span>
          <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">Real Google Calendar · Gmail · Human Notification</span>
        </div>
      </div>

      {/* Calendar Availability */}
      <div className="rounded-lg border border-surface-border bg-base/40 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">
            Calendar Availability — {calendar_date || "N/A"}
          </span>
        </div>
        {calendar_error && (
          <p className="text-[10px] text-destructive mb-2">⚠ {calendar_error}</p>
        )}
        {available_slots && available_slots.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {available_slots.map((slot, i) => {
              const isChosen = scheduled_slot && scheduled_slot.start === slot.start;
              return (
                <div key={i} className={cn(
                  "px-2.5 py-1 rounded border text-[10px] font-mono transition-all",
                  isChosen
                    ? "border-accent-orange bg-accent-orange/15 text-accent-orange tl-glow-orange"
                    : "border-surface-border text-text-muted"
                )}>
                  {isChosen && "✓ "}{slot.label}
                </div>
              );
            })}
          </div>
        ) : !calendar_error ? (
          <p className="text-[10px] text-text-muted">No available slots found</p>
        ) : null}
      </div>

      {/* Scheduled Slot */}
      {scheduled_slot && (
        <div className="rounded-lg border border-accent-orange/20 bg-accent-orange/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="h-3.5 w-3.5 text-accent-orange" />
            <span className="text-[9px] font-display uppercase tracking-wider text-accent-orange">Scheduled Appointment</span>
          </div>
          <p className="text-[12px] text-text-primary">
            {new Date(scheduled_slot.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
            {new Date(scheduled_slot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
          {scheduling_summary && (
            <p className="text-[10px] text-text-muted mt-1 italic">{scheduling_summary}</p>
          )}
        </div>
      )}

      {/* Captured Email */}
      <div className="rounded-lg border border-surface-border bg-base/40 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Mail className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Prospect Email Captured</span>
        </div>
        {captured_email ? (
          <p className="text-[12px] text-text-primary font-mono">{captured_email}</p>
        ) : (
          <p className="text-[10px] text-text-muted italic">No email was captured during the conversation</p>
        )}
      </div>

      {/* Calendar Event Created */}
      <div className="rounded-lg border border-surface-border bg-base/40 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Google Calendar Event</span>
          </div>
          {calendar_event ? (
            <StatusBadge status="created" label="Created" />
          ) : calendar_event_error ? (
            <StatusBadge status="failed" label="Failed" />
          ) : (
            <span className="text-[9px] text-text-muted">N/A</span>
          )}
        </div>
        {calendar_event && (
          <div className="mt-1">
            <p className="text-[11px] text-text-primary">{calendar_event.summary}</p>
            {calendar_event.html_link && (
              <a href={calendar_event.html_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-accent-orange hover:underline mt-1">
                <ExternalLink className="h-3 w-3" /> View in Google Calendar
              </a>
            )}
          </div>
        )}
        {calendar_event_error && (
          <p className="text-[10px] text-destructive mt-1">⚠ {calendar_event_error}</p>
        )}
      </div>

      {/* Invite Email Sent */}
      <div className="rounded-lg border border-surface-border bg-base/40 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Invite Email to Prospect</span>
          </div>
          {invite_email ? (
            <StatusBadge status={invite_email.status} label={invite_email.status === "sent" ? "Sent" : "Failed"} />
          ) : (
            <span className="text-[9px] text-text-muted">N/A</span>
          )}
        </div>
        {invite_email?.recipient && (
          <p className="text-[10px] text-text-muted font-mono mt-1">→ {invite_email.recipient}</p>
        )}
        {invite_email?.error && (
          <p className="text-[10px] text-destructive mt-1">⚠ {invite_email.error}</p>
        )}
      </div>

      {/* Human Notification */}
      <div className="rounded-lg border border-surface-border bg-base/40 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-[9px] font-display uppercase tracking-wider text-text-muted">Human Notification</span>
          </div>
          {human_notification ? (
            <StatusBadge status={human_notification.status} label={human_notification.status === "sent" ? "Notified" : "Failed"} />
          ) : (
            <span className="text-[9px] text-text-muted">N/A</span>
          )}
        </div>
        {human_notification?.recipient && (
          <p className="text-[10px] text-text-muted font-mono mt-1">→ {human_notification.recipient}</p>
        )}
        {human_notification?.error && (
          <p className="text-[10px] text-destructive mt-1">⚠ {human_notification.error}</p>
        )}
        {human_notification?.status === "sent" && (
          <p className="text-[10px] text-text-muted mt-1">Email sent with full scheduling details, calendar event status, and conversation summary.</p>
        )}
      </div>
    </div>
  );
}
import { cn } from "@/lib/utils";
import { Power, Star } from "lucide-react";

const TYPE_COLORS = {
  voice: "text-accent-orange border-accent-orange/30",
  email: "text-chart-3 border-chart-3/30",
  phone: "text-chart-2 border-chart-2/30",
  social_media: "text-chart-5 border-chart-5/30",
};

export default function PersonaCard({ persona, onToggle, onSetDefault }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 space-y-3",
        persona.active ? "border-surface-border" : "border-surface-border opacity-50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: persona.avatar_color || "#ff6b00" }}
          />
          <div>
            <div className="font-display text-[13px] tracking-wide text-text-primary">
              {persona.name}
            </div>
            <span
              className={cn(
                "text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded border",
                TYPE_COLORS[persona.persona_type] || "border-surface-border text-text-muted"
              )}
            >
              {persona.persona_type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {persona.is_default && (
            <Star className="h-3.5 w-3.5 text-chart-4 fill-chart-4" />
          )}
          <button
            onClick={() => onSetDefault(persona)}
            className="p-1 hover:bg-base rounded"
            title="Set as default"
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                persona.is_default ? "text-chart-4 fill-chart-4" : "text-text-muted"
              )}
            />
          </button>
          <button
            onClick={() => onToggle(persona)}
            className="p-1 hover:bg-base rounded"
            title={persona.active ? "Deactivate" : "Activate"}
          >
            <Power
              className={cn(
                "h-3.5 w-3.5",
                persona.active ? "text-status-green" : "text-text-muted"
              )}
            />
          </button>
        </div>
      </div>
      {persona.tone && (
        <div className="text-[11px] text-text-muted">Tone: {persona.tone}</div>
      )}
      {persona.personality_traits && persona.personality_traits.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {persona.personality_traits.map((t, i) => (
            <span
              key={i}
              className="text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded bg-base border border-surface-border text-text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {persona.assigned_context && (
        <div className="text-[10px] text-text-muted italic">
          Assigned: {persona.assigned_context}
        </div>
      )}
    </div>
  );
}
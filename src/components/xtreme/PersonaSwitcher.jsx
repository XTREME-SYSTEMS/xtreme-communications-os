import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PersonaSwitcher() {
  const [personas, setPersonas] = useState([]);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.entities.AgentPersona.filter({ persona_type: "voice", active: true })
      .then(rows => {
        setPersonas(rows);
        setActive(rows.find(r => r.is_default) || rows[0] || null);
      })
      .catch(() => {});
  }, []);

  const switchPersona = async (p) => {
    setActive(p);
    setOpen(false);
    try {
      const configs = await base44.entities.AiAgentConfig.filter({ status: "active" });
      if (configs.length && p.voice_id) {
        await base44.entities.AiAgentConfig.update(configs[0].id, { voice: p.voice_id });
      }
    } catch (_) {}
  };

  if (!active) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 h-8 rounded border border-surface-border text-[11px] font-display tracking-wider uppercase hover:bg-surface"
      >
        <User className="h-3.5 w-3.5" />
        <span className="truncate max-w-[120px]">{active.name}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 right-0 z-50 w-56 rounded-lg border border-surface-border bg-popover shadow-lg overflow-hidden">
            <div className="px-3 py-2 text-[9px] font-display tracking-[0.15em] uppercase text-text-muted border-b border-surface-border">
              Switch Voice Persona
            </div>
            {personas.map(p => (
              <button
                key={p.id}
                onClick={() => switchPersona(p)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-surface",
                  active?.id === p.id && "text-accent-orange"
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.avatar_color || "#ff6b00" }} />
                <span className="flex-1 truncate">{p.name}</span>
                {p.is_default && <span className="text-[8px] text-text-muted">DEFAULT</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
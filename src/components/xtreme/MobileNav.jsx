import { cn } from "@/lib/utils";
import { Radio, LayoutGrid, ScrollText } from "lucide-react";

const TABS = [
  { id: "dispatch", label: "Dispatch", icon: Radio },
  { id: "parity", label: "Parity", icon: LayoutGrid },
  { id: "audit", label: "Audit", icon: ScrollText },
];

export default function MobileNav({ view, setView }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-surface-border bg-base/95 backdrop-blur flex items-center px-2">
      {TABS.map(t => {
        const Icon = t.icon;
        const active = view === t.id;
        return (
          <button key={t.id} onClick={() => setView(t.id)}
            className={cn("flex-1 flex flex-col items-center justify-center gap-1 h-full",
              active ? "text-accent-orange" : "text-text-muted")}>
            <Icon className="h-5 w-5" />
            <span className="font-display text-[9px] tracking-[0.1em] uppercase">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
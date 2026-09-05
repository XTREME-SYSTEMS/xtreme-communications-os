import { useState } from "react";
import { Copy, Check, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PromptCard({ prompt, index }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
        <span className="font-display text-[10px] text-text-muted tracking-wider">{String(index).padStart(2, "0")}</span>
        <span className="font-display text-[11px] tracking-[0.1em] uppercase text-text-primary flex-1 truncate">{prompt.title}</span>
        <span className={cn("text-[9px] font-display uppercase px-1.5 py-0.5 rounded", prompt.accent)}>
          {prompt.target}
        </span>
      </div>
      <div className="px-4 py-3 flex-1">
        <p className="text-[11px] text-text-muted leading-relaxed font-mono whitespace-pre-wrap">{prompt.prompt}</p>
      </div>
      <div className="px-4 py-2.5 border-t border-surface-border flex items-center gap-2 bg-base/40">
        <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
          <Target className="h-3 w-3" />
          <span className="font-display uppercase tracking-wider">Drives: {prompt.metric}</span>
        </div>
        <button
          onClick={copy}
          className={cn(
            "ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-display uppercase tracking-wider transition-colors",
            copied
              ? "bg-status-green/10 text-status-green"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
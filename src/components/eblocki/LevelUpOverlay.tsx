import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface LevelUpPayload {
  scope: "operator" | "domain";
  domain?: string;
  newLevel: number;
  rank: string;
  standard?: string;
  nextRequirement?: string;
}

/**
 * Restrained tactical level-up reveal.
 * Grid pulse + glow line + monospace reveal. No confetti, no sound.
 */
export function LevelUpOverlay({
  payload,
  onClose,
}: { payload: LevelUpPayload | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!payload) return;
    setMounted(true);
    const t = setTimeout(() => {
      setMounted(false);
      setTimeout(onClose, 250);
    }, 4200);
    return () => clearTimeout(t);
  }, [payload, onClose]);

  if (!payload) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="Level up"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm transition-opacity duration-300",
        mounted ? "opacity-100" : "opacity-0",
      )}
      onClick={() => { setMounted(false); setTimeout(onClose, 250); }}
    >
      {/* grid pulse */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative max-w-md w-[92%] border border-primary/30 bg-card/80 px-8 py-10 text-center"
           style={{ boxShadow: "var(--shadow-glow)" }}>
        <div className="absolute -top-px left-6 right-6 h-px bg-primary"
             style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }} />
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary/80">
          {payload.scope === "operator" ? "Operator Identity" : payload.domain?.toUpperCase()}
        </div>
        <div className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Level Up
        </div>
        <div className="mt-1 font-mono text-5xl text-foreground tabular-nums">
          {String(payload.newLevel).padStart(2, "0")}
        </div>
        <div className="mt-3 text-sm text-foreground">{payload.rank}</div>
        {payload.standard && (
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            <span className="font-mono uppercase tracking-[0.2em] text-foreground">Standard raised — </span>
            {payload.standard}
          </p>
        )}
        {payload.nextRequirement && (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            <span className="font-mono uppercase tracking-[0.2em] text-primary/80">Next — </span>
            {payload.nextRequirement}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
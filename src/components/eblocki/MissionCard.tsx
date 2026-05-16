import { useRef, useState } from "react";
import {
  Check,
  ChevronsRight,
  Clock,
  Flame,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";
import { toast } from "sonner";
import { rollVariableReward } from "@/lib/eblocki/momentum";
import type { DailyObjective } from "@/hooks/useDailyObjectives";

interface Props {
  objective: DailyObjective;
  onComplete: (id: string) => Promise<void> | void;
  onSkip?: (id: string) => Promise<void> | void;
}

const KIND_META: Record<
  DailyObjective["kind"],
  { icon: typeof Flame; label: string; color: string }
> = {
  mission: { icon: Target, label: "Mission", color: "text-primary" },
  streak_save: { icon: Flame, label: "Streak Save", color: "text-destructive" },
  recovery: { icon: Shield, label: "Recovery", color: "text-primary/80" },
  boss: { icon: Zap, label: "Boss Battle", color: "text-destructive" },
  quick_win: { icon: Sparkles, label: "Quick Win", color: "text-primary/80" },
};

const RES_BAR = (n: number) =>
  Array.from({ length: 5 }).map((_, i) => i < n);

export function MissionCard({ objective, onComplete, onSkip }: Props) {
  const [dragX, setDragX] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const startX = useRef<number | null>(null);
  const width = useRef<number>(320);
  const cardRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<number>(0);
  const firedRef = useRef(false); // hard guard against double-fire (swipe + hold)
  const HOLD_MS = 1400;
  const meta = KIND_META[objective.kind];
  const Icon = meta.icon;

  const isDone = objective.status === "completed";
  const isSkipped = objective.status === "skipped";
  const isLocked = objective.status === "failed";
  const isInteractive = !isDone && !isSkipped && !isLocked && !completing;

  /* ---------- swipe-to-complete ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isInteractive) return;
    startX.current = e.clientX;
    width.current = cardRef.current?.offsetWidth ?? 320;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = Math.max(-40, Math.min(width.current * 0.7, e.clientX - startX.current));
    setDragX(dx);
    if (dx > width.current * 0.18 && dx < width.current * 0.22) haptics.light();
  };
  const onPointerUp = async () => {
    if (startX.current == null) return;
    const threshold = width.current * 0.45;
    if (dragX > threshold && isInteractive) {
      await triggerComplete();
    } else {
      setDragX(0);
    }
    startX.current = null;
  };

  /* ---------- hold-to-confirm-deep-work ---------- */
  const startHold = () => {
    if (!isInteractive) return;
    haptics.medium();
    holdStart.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - holdStart.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct >= 100) {
        cancelHold();
        void triggerComplete();
      } else {
        holdTimer.current = window.requestAnimationFrame(tick);
      }
    };
    holdTimer.current = window.requestAnimationFrame(tick);
  };
  const cancelHold = () => {
    if (holdTimer.current) cancelAnimationFrame(holdTimer.current);
    holdTimer.current = null;
    setHoldPct(0);
  };

  /* ---------- completion ---------- */
  const triggerComplete = async () => {
    if (firedRef.current) return; // belt-and-braces: hold + swipe race
    firedRef.current = true;
    setCompleting(true);
    const reward = rollVariableReward({
      seed: objective.id,
      resistanceLevel: objective.resistance_level,
    });
    setDragX(width.current * 0.9);
    try {
      await onComplete(objective.id);
      // Only fire haptics + toast on confirmed write success.
      haptics.success();
      if (reward.label) {
        toast.success(reward.label, {
          description: `+${objective.reward_value + reward.bonus} momentum`,
          duration: reward.rare ? 5000 : 3000,
        });
        if (reward.rare) haptics.heavy();
      } else {
        toast.success("Proof logged.", {
          description: `+${objective.reward_value} momentum`,
        });
      }
    } catch {
      firedRef.current = false;
      toast.error("Could not save. Try again.");
      setDragX(0);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card transition-all touch-none select-none",
        isDone && "opacity-70 border-primary/50 bg-primary/[0.03]",
        isSkipped && "opacity-40",
        isLocked && "opacity-50 border-dashed",
        completing && "border-primary",
      )}
    >
      {/* swipe reveal bg */}
      <div
        className="absolute inset-y-0 left-0 flex items-center pl-6 bg-primary/20 transition-opacity"
        style={{ width: Math.max(0, dragX), opacity: dragX > 30 ? 1 : 0 }}
        aria-hidden
      >
        <Check className="h-5 w-5 text-primary" />
      </div>

      {/* hold-to-confirm fill */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/10 pointer-events-none"
        style={{ width: `${holdPct}%`, transition: holdPct === 0 ? "width 200ms" : "none" }}
        aria-hidden
      />

      <div
        className="relative p-4 sm:p-5"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: startX.current == null ? "transform 220ms cubic-bezier(.2,.8,.2,1)" : "none",
        }}
        onPointerDown={isInteractive ? onPointerDown : undefined}
        onPointerMove={isInteractive ? onPointerMove : undefined}
        onPointerUp={isInteractive ? onPointerUp : undefined}
        onPointerCancel={() => { setDragX(0); startX.current = null; }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
            <span className={cn("font-mono text-[10px] uppercase tracking-[0.22em]", meta.color)}>
              {meta.label}
            </span>
            {objective.mode_id && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                · {objective.mode_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5" title={`Resistance ${objective.resistance_level}/5`}>
            {RES_BAR(objective.resistance_level).map((on, i) => (
              <span
                key={i}
                className={cn("h-2 w-1 rounded-sm", on ? "bg-destructive/80" : "bg-muted")}
              />
            ))}
          </div>
        </div>

        <h3 className="mt-2 text-base font-semibold leading-snug">{objective.title}</h3>
        {objective.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{objective.description}</p>
        )}

        {objective.why_it_matters && !isDone && (
          <p className="mt-3 text-[11px] text-muted-foreground border-l-2 border-primary/40 pl-2 italic">
            {objective.why_it_matters}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />{objective.focus_minutes}m
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            <Sparkles className="h-3 w-3" />+{objective.reward_value}
          </span>
          <span
            className="inline-flex items-center gap-1"
            title="Streak impact — how much this protects/grows your streak"
          >
            <Flame className="h-3 w-3" />×{objective.streak_impact}
          </span>
          <span
            className="inline-flex items-center gap-1"
            title="Identity alignment 1–5"
          >
            <TrendingUp className="h-3 w-3" />id {objective.identity_alignment}/5
          </span>
          {!isDone && !isSkipped && !isLocked && (
            <ChevronsRight className="ml-auto h-3.5 w-3.5 text-primary animate-pulse" />
          )}
          {isDone && (
            <span className="ml-auto inline-flex items-center gap-1 text-primary">
              <Check className="h-3.5 w-3.5" /> closed
            </span>
          )}
          {isSkipped && <span className="ml-auto">skipped</span>}
          {isLocked && <span className="ml-auto">locked</span>}
        </div>

        {isInteractive && (
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="flex-1 h-11 rounded-md border border-primary/40 bg-primary/5 text-xs font-mono uppercase tracking-widest text-primary active:scale-[0.99] touch-manipulation"
              onPointerDown={(e) => { e.stopPropagation(); startHold(); }}
              onPointerUp={(e) => { e.stopPropagation(); cancelHold(); }}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
            >
              {holdPct > 0 ? `Hold… ${Math.round(holdPct)}%` : "Hold to confirm"}
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void onSkip(objective.id); }}
                className="h-11 px-3 rounded-md text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground touch-manipulation"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
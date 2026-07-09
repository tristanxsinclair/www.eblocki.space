import { cn } from "@/lib/utils";
import { type Mode, MODE_LABELS } from "@/lib/eblocki/modes";
import { type BehaviouralState, STATE_LABELS } from "@/lib/eblocki/states";
import type { EvidenceStrength } from "@/lib/eblocki/proof-scoring";

const MODE_COLOR: Record<string, string> = {
  LAW_MAX: "border-evidence-strong/40 text-evidence-strong",
  PSYCH_HD: "border-accent/40 text-accent",
  SALES_CLOSE: "border-warning/40 text-warning",
  EBLOCKI: "border-primary/50 text-primary",
  SPORT: "border-success/40 text-success",
  BRAND: "border-evidence-elite/40 text-evidence-elite",
  CAREER_MONEY: "border-evidence-moderate/40 text-evidence-moderate",
  GENERAL_EXECUTION: "border-muted-foreground/30 text-muted-foreground",
};

export function ModeBadge({ mode, hybrid }: { mode: string; hybrid?: string }) {
  const primaryLabel = MODE_LABELS[mode as keyof typeof MODE_LABELS] ?? mode;
  const primaryClass = MODE_COLOR[mode] ?? "border-muted-foreground/30 text-muted-foreground";
  const hybridLabel = hybrid ? MODE_LABELS[hybrid as keyof typeof MODE_LABELS] ?? hybrid : null;
  const hybridClass = hybrid ? MODE_COLOR[hybrid] ?? "border-muted-foreground/30 text-muted-foreground" : "";

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
      <span className={cn("rounded-full border px-2 py-0.5", primaryClass)}>{primaryLabel}</span>
      {hybrid && (
        <span className={cn("rounded-full border px-2 py-0.5 opacity-80", hybridClass)}>
          + {hybridLabel}
        </span>
      )}
    </span>
  );
}

const STATE_COLOR: Record<BehaviouralState, string> = {
  locked_in: "bg-primary/15 text-primary border-primary/40",
  momentum: "bg-success/15 text-success border-success/40",
  strategic_build: "bg-accent/15 text-accent border-accent/40",
  recovery: "bg-muted text-muted-foreground border-border",
  low_energy: "bg-muted text-muted-foreground border-border",
  scattered: "bg-warning/15 text-warning border-warning/40",
  overloaded: "bg-warning/15 text-warning border-warning/40",
  hype_drift: "bg-warning/15 text-warning border-warning/40",
  avoidant: "bg-destructive/15 text-destructive border-destructive/40",
  academic_displacement: "bg-destructive/15 text-destructive border-destructive/40",
};

export function StateBadge({ state }: { state: BehaviouralState }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
      STATE_COLOR[state],
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATE_LABELS[state]}
    </span>
  );
}

const STRENGTH_COLOR: Record<EvidenceStrength, string> = {
  weak: "bg-evidence-weak/15 text-evidence-weak border-evidence-weak/40",
  moderate: "bg-evidence-moderate/15 text-evidence-moderate border-evidence-moderate/40",
  strong: "bg-evidence-strong/15 text-evidence-strong border-evidence-strong/40",
  elite: "bg-evidence-elite/15 text-evidence-elite border-evidence-elite/40 panel-glow",
};

export function EvidenceStrengthBadge({ strength, score }: { strength: EvidenceStrength; score?: number }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
      STRENGTH_COLOR[strength],
    )}>
      {strength}
      {typeof score === "number" && <span className="opacity-70 tabular-nums">{score}/10</span>}
    </span>
  );
}

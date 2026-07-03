import { Link } from "react-router-dom";
import { AlertTriangle, Flame, Battery, ShieldCheck, Crosshair, Zap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATE_LABELS, STATE_PRESCRIPTION, type BehaviouralState } from "@/lib/eblocki/states";

/**
 * Adaptive intervention card — surfaces when the detected behavioural state
 * requires a corrective move. Premium tactical UI, no childish gamification.
 */

interface InterventionMeta {
  icon: LucideIcon;
  accent: string;       // border/glow color class
  headline: string;     // operator-voice
  cta: { label: string; to: string };
  pressure: boolean;    // mark pressure_flag if user proves under this state
}

const META: Partial<Record<BehaviouralState, InterventionMeta>> = {
  avoidant: {
    icon: AlertTriangle,
    accent: "border-destructive/40 bg-destructive/[0.04]",
    headline: "Avoidance detected. The system requires a 5-minute proof artifact, now.",
    cta: { label: "Start 5-min proof", to: "/proof" },
    pressure: true,
  },
  overloaded: {
    icon: Crosshair,
    accent: "border-primary/40 bg-primary/[0.04]",
    headline: "Overload detected. Triage to one prime objective. Park everything else.",
    cta: { label: "Set Prime Objective", to: "/sheet" },
    pressure: false,
  },
  low_energy: {
    icon: Battery,
    accent: "border-border bg-muted/30",
    headline: "Low energy logged. Drop to the minimum viable proof. Any artifact beats a perfect plan.",
    cta: { label: "Log minimum proof", to: "/proof" },
    pressure: false,
  },
  hype_drift: {
    icon: Zap,
    accent: "border-destructive/40 bg-destructive/[0.04]",
    headline: "Hype drift. Convert one idea into a shippable artifact in the next 30 minutes.",
    cta: { label: "Forge contract", to: "/coach" },
    pressure: true,
  },
  scattered: {
    icon: Crosshair,
    accent: "border-primary/40 bg-primary/[0.04]",
    headline: "Scattered focus. One objective. One artifact. One timer.",
    cta: { label: "Set NCA", to: "/sheet" },
    pressure: false,
  },
  academic_displacement: {
    icon: AlertTriangle,
    accent: "border-destructive/40 bg-destructive/[0.04]",
    headline: "Academic displacement. Stop the prep-theatre. Write answer-ready work to rubric.",
    cta: { label: "Submit real proof", to: "/proof" },
    pressure: true,
  },
  recovery: {
    icon: ShieldCheck,
    accent: "border-border bg-card/40",
    headline: "Controlled recovery. Log one light proof, then rest deliberately.",
    cta: { label: "Light proof", to: "/proof" },
    pressure: false,
  },
  locked_in: {
    icon: Flame,
    accent: "border-primary/40 bg-primary/[0.04]",
    headline: "Locked in. Protect momentum. Do not redesign. Ship the artifact already in motion.",
    cta: { label: "Lock proof", to: "/proof" },
    pressure: true,
  },
  momentum: {
    icon: Flame,
    accent: "border-primary/40 bg-primary/[0.04]",
    headline: "Momentum active. Continue. Next artifact compounds the streak.",
    cta: { label: "Next proof", to: "/proof" },
    pressure: false,
  },
  strategic_build: {
    icon: ShieldCheck,
    accent: "border-primary/40 bg-primary/[0.04]",
    headline: "Strategic build mode. Ship one increment. Document the decision in one line.",
    cta: { label: "Log build proof", to: "/proof" },
    pressure: false,
  },
};

interface Props {
  state: BehaviouralState | null | undefined;
  className?: string;
}

export function InterventionCard({ state, className }: Props) {
  if (!state) return null;
  const meta = META[state];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <Card
      className={cn(
        "panel relative overflow-hidden p-4 md:p-5 transition-colors",
        meta.accent,
        className,
      )}
    >
      {/* subtle scan line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-sm border border-border/80 bg-background/60 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
              Adaptive Intervention
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
              State · {STATE_LABELS[state]}
            </span>
            {meta.pressure && (
              <span
                className="font-mono text-[10px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm border border-primary/40 text-primary"
                title="Proof shipped while in this state earns Pressure XP (×1.3)."
              >
                +Pressure XP
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-foreground leading-snug">{meta.headline}</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            {STATE_PRESCRIPTION[state]}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Link to={meta.cta.to}>
              <Button size="sm">{meta.cta.label}</Button>
            </Link>
            <Link to="/coach" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Talk to Coach →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
import { Card } from "@/components/ui/card";
import { MomentumRing } from "./MomentumRing";
import { MissionCard } from "./MissionCard";
import { InfoTip } from "./InfoTip";
import { useMomentum } from "@/hooks/useMomentum";
import { useDailyObjectives } from "@/hooks/useDailyObjectives";
import { STATE_COPY, nextBestAction } from "@/lib/eblocki/momentum";
import { Snowflake, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function MomentumPanel() {
  const { snapshot, refresh: refreshMomentum } = useMomentum();
  const { objectives, complete, skip, refresh: refreshObj, loading } = useDailyObjectives();

  const handleComplete = async (id: string) => {
    try {
      await complete(id);
      await refreshMomentum();
    } catch {
      // Surfaced by MissionCard via its own toast; nothing to do here.
    }
  };
  const handleSkip = async (id: string) => {
    await skip(id);
    await refreshObj();
  };

  if (!snapshot && loading) {
    return (
      <Card className="panel p-5 border-primary/20">
        <div className="h-32 animate-pulse bg-muted/30 rounded" />
      </Card>
    );
  }

  // Fallback so a missing snapshot never crashes the dashboard.
  const safeSnap = snapshot ?? {
    state: "cold" as const,
    momentum_score: 0,
    streak_days: 0,
    longest_streak: 0,
    freeze_tokens: 0,
    proofs_today: 0,
    resistance_overcome: 0,
    avg_quality: 0,
    identity_signal: "Submit one artifact to begin.",
    last_proof_at: null,
    hours_since_proof: Infinity,
  };
  const stateMeta = STATE_COPY[safeSnap.state];
  const open = objectives.filter((o) => o.status === "pending" || o.status === "active");
  const done = objectives.filter((o) => o.status === "completed").length;
  const coachLine = nextBestAction(safeSnap);

  // Fresh-user signal: no proofs ever AND no objectives seeded yet.
  const isFresh = !safeSnap.last_proof_at && objectives.length === 0;

  // Only show streak-risk badge when it's actually true today.
  const showStreakRisk =
    safeSnap.state === "at_risk" && safeSnap.streak_days >= 2 && safeSnap.proofs_today === 0;

  return (
    <Card className="panel p-4 md:p-5 border-primary/30 overflow-hidden">
      <div className="flex items-center gap-4 md:gap-6 flex-wrap">
        <MomentumRing
          score={safeSnap.momentum_score}
          state={safeSnap.state}
          streak={safeSnap.streak_days}
        />
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-sm",
              safeSnap.state === "at_risk" && "bg-destructive/15 text-destructive",
              safeSnap.state === "elite" && "bg-primary/15 text-primary",
              safeSnap.state === "momentum" && "bg-primary/10 text-primary",
              (safeSnap.state === "cold" || safeSnap.state === "warming" || safeSnap.state === "recovery") &&
                "bg-muted text-muted-foreground",
            )}>
              {stateMeta.label}
            </span>
            <InfoTip>
              State is derived from your momentum score (0–100), current streak, and hours since last proof. It updates whenever you complete an objective.
            </InfoTip>
            {safeSnap.freeze_tokens > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                <Snowflake className="h-3 w-3" />
                {safeSnap.freeze_tokens} freeze{safeSnap.freeze_tokens > 1 ? "s" : ""}
                <InfoTip label="How do freeze tokens work?">
                  You earn one freeze token every 5 streak days (cap 3). A token covers a single missed day so the streak survives one slip.
                </InfoTip>
              </span>
            )}
            {safeSnap.streak_days >= 3 && (
              <span className={cn(
                "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest",
                showStreakRisk ? "text-destructive" : "text-primary",
              )}>
                <Flame className="h-3 w-3" />
                {safeSnap.streak_days}d
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium leading-snug">{safeSnap.identity_signal}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stateMeta.tone}</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <Stat label="Today" value={safeSnap.proofs_today} />
            <Stat label="Resistance" value={safeSnap.resistance_overcome} />
            <Stat label="Quality" value={(safeSnap.avg_quality ?? 0).toFixed(1)} />
          </div>
        </div>
      </div>

      {/* Lightweight momentum-aware coach line. Direct, strategic, no fluff. */}
      <div
        className={cn(
          "mt-4 rounded-md border px-3 py-2 text-[12px] leading-snug",
          safeSnap.state === "at_risk"
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-primary/30 bg-primary/5 text-foreground/90",
        )}
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mr-2">
          Coach <InfoTip>This recommendation is generated locally from your current state — it does not call the AI coach and contains no fluff.</InfoTip>
        </span>
        {coachLine}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
          Today's Objectives
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {done} / {objectives.length} closed
        </span>
      </div>

      {open.length === 0 && done > 0 && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          All objectives closed. Next freeze token at day {Math.max(5, Math.ceil((safeSnap.streak_days + 1) / 5) * 5)}.
        </div>
      )}
      {objectives.length === 0 && (
        isFresh ? (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Start here</div>
            <p className="text-foreground">Eblocki rewards <strong>proof</strong>, not activity. Submit one real artifact (a paragraph, a fix, a log entry) to ignite the loop.</p>
            <p className="text-xs text-muted-foreground">No analytics will appear until you have actual data — we don't fake numbers.</p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No objectives seeded yet. Open the Coach to forge one.
          </div>
        )
      )}

      <div className="mt-3 space-y-3">
        {open.map((o) => (
          <MissionCard
            key={o.id}
            objective={o}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-foreground font-semibold text-base font-sans normal-case tracking-normal">
        {value}
      </div>
      <div>{label}</div>
    </div>
  );
}
import { Card } from "@/components/ui/card";
import { MomentumRing } from "./MomentumRing";
import { MissionCard } from "./MissionCard";
import { useMomentum } from "@/hooks/useMomentum";
import { useDailyObjectives } from "@/hooks/useDailyObjectives";
import { STATE_COPY } from "@/lib/eblocki/momentum";
import { Snowflake, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function MomentumPanel() {
  const { snapshot, refresh: refreshMomentum } = useMomentum();
  const { objectives, complete, skip, refresh: refreshObj } = useDailyObjectives();

  const handleComplete = async (id: string) => {
    await complete(id);
    await refreshMomentum();
  };
  const handleSkip = async (id: string) => {
    await skip(id);
    await refreshObj();
  };

  if (!snapshot) {
    return (
      <Card className="panel p-5 border-primary/20">
        <div className="h-32 animate-pulse bg-muted/30 rounded" />
      </Card>
    );
  }

  const stateMeta = STATE_COPY[snapshot.state];
  const open = objectives.filter((o) => o.status === "pending" || o.status === "active");
  const done = objectives.filter((o) => o.status === "completed").length;

  return (
    <Card className="panel p-4 md:p-5 border-primary/30 overflow-hidden">
      <div className="flex items-center gap-4 md:gap-6 flex-wrap">
        <MomentumRing
          score={snapshot.momentum_score}
          state={snapshot.state}
          streak={snapshot.streak_days}
        />
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-mono text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-sm",
              snapshot.state === "at_risk" && "bg-destructive/15 text-destructive",
              snapshot.state === "elite" && "bg-primary/15 text-primary",
              snapshot.state === "momentum" && "bg-primary/10 text-primary",
              (snapshot.state === "cold" || snapshot.state === "warming" || snapshot.state === "recovery") &&
                "bg-muted text-muted-foreground",
            )}>
              {stateMeta.label}
            </span>
            {snapshot.freeze_tokens > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                <Snowflake className="h-3 w-3" />
                {snapshot.freeze_tokens} freeze{snapshot.freeze_tokens > 1 ? "s" : ""}
              </span>
            )}
            {snapshot.streak_days >= 3 && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-destructive">
                <Flame className="h-3 w-3" />
                {snapshot.streak_days}d
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium leading-snug">{snapshot.identity_signal}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stateMeta.tone}</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <Stat label="Today" value={snapshot.proofs_today} />
            <Stat label="Resistance" value={snapshot.resistance_overcome} />
            <Stat label="Quality" value={snapshot.avg_quality.toFixed(1)} />
          </div>
        </div>
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
          All objectives closed. Sustained execution earns the next freeze token at day {Math.ceil((snapshot.streak_days + 1) / 5) * 5}.
        </div>
      )}
      {objectives.length === 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No objectives seeded yet. Open the Coach to forge one.
        </div>
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
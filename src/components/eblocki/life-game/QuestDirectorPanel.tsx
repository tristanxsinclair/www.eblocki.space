import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Crosshair,
  Gauge,
  MessageSquare,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuestDirector } from "@/hooks/useQuestDirector";
import {
  personaliseQuests,
  summariseQuestSignals,
  type PersonalisedQuest,
  type QuestBrief,
  type QuestStage,
} from "@/lib/eblocki/quest-personalisation";
import { localDayKey } from "@/lib/eblocki/local-day";

const STAGE_COPY: Record<QuestStage, string> = {
  contact: "Contact",
  output: "Output",
  depth: "Depth",
  pressure: "Pressure",
  transfer: "Transfer",
};

const ORIGIN_COPY: Record<PersonalisedQuest["origin"], string> = {
  mode_bank: "Mode assignment",
  next_upgrade: "Carried upgrade",
  correction: "Correction required",
  neglected_domain: "Domain revival",
  pressure_step: "Escalation",
};

/** Deterministic demo set so the public HUD shows the real engine, not a script. */
function demoInput() {
  const iso = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  return {
    dayKey: localDayKey(),
    modes: [
      { mode_id: "LAW_MAX", display_name: "Law Max", is_default: true },
      { mode_id: "ATHLETE_MODE", display_name: "Athlete" },
    ],
    domainLevels: [{ domain: "law", level: 4, next_requirement: "Authority currency on every rule" }],
    recentProofs: [
      {
        title: "IRAC on negligence problem",
        domain: "law",
        quality_score: 7,
        next_upgrade: "Add an authority currency check to every rule statement",
        created_at: iso(1),
      },
      { title: "Interval session", domain: "soccer", quality_score: 6, created_at: iso(11) },
    ],
    momentum: { streak_days: 4, avg_quality: 6.8, proofs_today: 0, state: "momentum" },
    maxQuests: 3,
  };
}

function QuestCard({ quest, demo }: { quest: PersonalisedQuest; demo?: boolean }) {
  const [open, setOpen] = useState(false);
  const href = demo
    ? "/auth"
    : `/proof?source=quest&mode=${encodeURIComponent(quest.modeId ?? quest.modeKey)}`;
  return (
    <article className="mission-directive-card border p-4 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
        <span className="text-primary">{ORIGIN_COPY[quest.origin]}</span>
        <span className="text-muted-foreground">// {STAGE_COPY[quest.stage]}</span>
        {quest.domain && <span className="text-muted-foreground">// {quest.domain}</span>}
      </div>
      <p className="mt-2.5 text-[15px] font-semibold leading-6 tracking-[-0.01em] text-wrap-safe">{quest.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3 w-3" /> R{quest.resistance_level}
        </span>
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3 w-3" /> {quest.focus_minutes}m
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground text-wrap-safe">
        {quest.personalisationReason}
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        aria-expanded={open}
      >
        Standard <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-l border-primary/20 pl-3 text-xs leading-5 text-muted-foreground">
          <p className="text-wrap-safe">
            <span className="text-foreground">Evidence required: </span>
            {quest.required_artifact}
          </p>
          <p className="text-wrap-safe">
            <span className="text-foreground">Why it matters: </span>
            {quest.why_it_matters}
          </p>
          <p className="text-wrap-safe">
            <span className="text-foreground">Escalation: </span>
            {quest.escalationRule}
          </p>
          <p className="text-wrap-safe text-amber-400/80">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            Self-deception risk: {quest.selfDeceptionRisk}
          </p>
        </div>
      )}

      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
        <Link to={href}>
          Log this proof <ArrowRight className="ml-1.5 h-3 w-3" />
        </Link>
      </Button>
    </article>
  );
}

function Brief({ brief }: { brief: QuestBrief }) {
  return (
    <div className="mission-brief rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
        Read of your record
      </div>
      <p className="mt-2 text-[15px] font-medium leading-6 tracking-[-0.01em] text-wrap-safe">{brief.headline}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Resistance band {brief.band.min}–{brief.band.max} // {brief.band.note}
      </p>
      {brief.signals.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {brief.signals.slice(0, 5).map((signal) => (
            <li
              key={signal}
              className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
            >
              {signal}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Quest Director — replaces the Game Master directive channel on the HUD.
 * Directives are derived from the operator's own modes, standards, and
 * evidence history rather than requiring a chat turn.
 */
export function QuestDirectorPanel({ demo }: { demo?: boolean }) {
  const live = useQuestDirector();
  const demoData = useMemo(() => {
    if (!demo) return null;
    const input = demoInput();
    return { quests: personaliseQuests(input), brief: summariseQuestSignals(input) };
  }, [demo]);

  const quests = demo ? demoData?.quests ?? [] : live.quests;
  const brief = demo ? demoData?.brief ?? null : live.brief;
  const loading = demo ? false : live.loading;

  return (
    <section id="director" className="operator-panel mission-director hud-gm p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
          <Crosshair className="h-4 w-4" />
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Directive engine
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Quest Director</h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-2" aria-live="polite">
            <div className="h-16 animate-pulse rounded-sm border border-border bg-muted/30" />
            <div className="h-16 animate-pulse rounded-sm border border-border bg-muted/20" />
          </div>
        ) : (
          <>
            {brief && <Brief brief={brief} />}
            {live.degraded && !demo && (
              <p className="rounded-sm border border-destructive/40 p-2 text-xs text-destructive">
                Some evidence could not be read. Quests below may be incomplete.
              </p>
            )}
            {quests.length > 0 ? (
              quests.map((quest) => (
                <QuestCard key={quest.questKey} quest={quest} demo={demo} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No proof yet. Submit one measurable artifact to activate the command layer.
              </p>
            )}
          </>
        )}
      </div>

      <Button asChild variant="ghost" size="sm" className="mt-3 w-full justify-between">
        <Link to={demo ? "/auth" : "/coach"}>
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Argue with the directive
          </span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </section>
  );
}

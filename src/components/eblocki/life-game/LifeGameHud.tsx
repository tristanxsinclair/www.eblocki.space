import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  CloudOff,
  Flame,
  Focus,
  Gauge,
  LockKeyhole,
  Radio,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Swords,
  Terminal,
  Trophy,
  X,
  Zap,
  PanelsTopLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestDirectorPanel } from "@/components/eblocki/life-game/QuestDirectorPanel";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  EvidenceSettlement,
  LifeGameProtocol,
  LifeGameSnapshot,
  RunLogEntry,
} from "@/lib/eblocki/life-game";
import {
  buildLifeGameSettlementHref,
  deriveLifeGamePulse,
  LIFE_GAME_STATUS_COPY,
  projectEvidenceSettlement,
} from "@/lib/eblocki/life-game";

interface LifeGameHudProps {
  snapshot: LifeGameSnapshot;
  demo?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  settlementId?: string | null;
  onDismissSettlement?: () => void;
  settlementPreviewHref?: string | null;
}
type RunLogFilter = "all" | "actions" | "system" | "pending";

const HUD_COMMANDS = [
  { href: "#quests", label: "Quest" },
  { href: "#stats", label: "Stats" },
  { href: "#director", label: "Director" },
  { href: "#run-log", label: "Run Log" },
  { href: "#intel", label: "Intel" },
] as const;

const HEALTH_LABEL: Record<"ok" | "empty" | "error", string> = {
  ok: "ONLINE",
  empty: "READY",
  error: "DEGRADED",
};

function useBootSequence(health: LifeGameSnapshot["health"], demo: boolean) {
  const [visible, setVisible] = useState(false);
  const storageKey = demo ? "eblocki-demo-booted" : "eblocki-game-booted";

  useEffect(() => {
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(storageKey) === "1";
      if (!alreadyBooted) sessionStorage.setItem(storageKey, "1");
    } catch {
      alreadyBooted = true;
    }
    if (alreadyBooted) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1_600);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const evidenceHealth =
    health.proofs === "error" || health.verdicts === "error" || health.xpEvents === "error"
      ? "error"
      : "ok";
  const questHealth =
    health.objectives === "error" || health.commitments === "error" ? "error" : "ok";
  const gmHealth = health.coachInteractions === "error" ? "error" : "ok";

  return {
    visible,
    lines: [
      `> AUTH LINK ........ ${demo ? "DEMO" : "ONLINE"}`,
      `> EVIDENCE ENGINE .. ${HEALTH_LABEL[evidenceHealth]}`,
      `> QUEST FEED ....... ${HEALTH_LABEL[questHealth]}`,
      `> GAME MASTER ...... ${HEALTH_LABEL[gmHealth]}`,
    ],
  };
}

export function LifeGameHud({
  snapshot,
  demo = false,
  refreshing = false,
  onRefresh,
  settlementId = null,
  onDismissSettlement,
  settlementPreviewHref = null,
}: LifeGameHudProps) {
  const [runLogFilter, setRunLogFilter] = useState<RunLogFilter>("all");
  const focusStorageKey = demo ? "eblocki-demo-focus-mode" : "eblocki-focus-mode";
  const [focusMode, setFocusMode] = useState(() => {
    try {
      return sessionStorage.getItem(focusStorageKey) === "1";
    } catch {
      return false;
    }
  });
  const boot = useBootSequence(snapshot.health, demo);
  const pulse = useMemo(() => deriveLifeGamePulse(snapshot), [snapshot]);
  const settlement = useMemo(
    () => (settlementId ? projectEvidenceSettlement(snapshot, settlementId) : null),
    [settlementId, snapshot],
  );
  const filteredRunLog = useMemo(() => {
    if (runLogFilter === "actions") {
      return snapshot.runLog.filter((entry) => entry.kind === "action");
    }
    if (runLogFilter === "system") {
      return snapshot.runLog.filter((entry) => entry.kind !== "action");
    }
    if (runLogFilter === "pending") {
      return snapshot.runLog.filter((entry) => entry.syncState !== "complete");
    }
    return snapshot.runLog;
  }, [runLogFilter, snapshot.runLog]);
  const xpPercent = Math.min(
    100,
    Math.max(0, (snapshot.operator.xpInLevel / snapshot.operator.threshold) * 100),
  );
  const degraded = Object.values(snapshot.health).some((value) => value === "error");

  const toggleFocusMode = () => {
    setFocusMode((current) => {
      const next = !current;
      try {
        sessionStorage.setItem(focusStorageKey, next ? "1" : "0");
      } catch {
        // Session persistence is optional; focus mode still works in-memory.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!settlementId) return;
    const timer = window.setTimeout(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      document.getElementById("settlement")?.scrollIntoView?.({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [settlementId]);

  return (
    <div
      className="operator-surface life-game-shell mobile-safe-page min-h-full"
      data-focus-mode={focusMode ? "true" : "false"}
    >
      {boot.visible && (
        <div
          className="life-game-boot crt-surface"
          role="status"
          aria-label="Eblocki system status"
        >
          {boot.lines.map((line, index) => (
            <div key={line} style={{ animationDelay: `${index * 120}ms` }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="operator-page-wide page-enter">
        {demo && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-primary/50 bg-primary/10 px-3 py-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              Demo Operator // Sample Data
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Read only // no writes
            </span>
          </div>
        )}

        <header id="operator" className="operator-panel-accent mission-hero p-5 md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="operator-label flex flex-wrap items-center gap-2">
                <span className="mission-status-dot" aria-hidden="true" />
                <span className="text-primary">Mission control</span>
                <span className="text-muted-foreground">Operator level {snapshot.operator.level}</span>
                <span className="text-muted-foreground">· {snapshot.operator.rank}</span>
              </div>
              <h1 className="mission-title mt-3">
                {snapshot.operator.title}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Your evidence, directives, and earned capability—resolved into one operating picture.
              </p>
            </div>

            <div className="operator-stat-grid lg:min-w-[500px]">
              <HeaderMetric label="Total XP" value={snapshot.operator.totalXp.toLocaleString()} />
              <HeaderMetric
                label="Streak"
                value={snapshot.momentum ? `${snapshot.momentum.streakDays}d` : "—"}
                icon={<Flame className="h-3 w-3" />}
              />
              <HeaderMetric
                label="Actions today"
                value={snapshot.momentum?.proofsToday ?? "—"}
              />
              <HeaderMetric
                label="Link"
                value={degraded ? "Degraded" : "Online"}
                tone={degraded ? "danger" : "primary"}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <span>Character XP</span>
              <span>
                {snapshot.operator.xpInLevel} / {snapshot.operator.threshold}
              </span>
            </div>
            <Progress value={xpPercent} className="h-2" aria-label="Character XP progress" />
          </div>
        </header>

        <nav
          className="hud-command-deck mt-3"
          aria-label="Life-game command deck"
        >
          <span className="hud-command-label">
            <Radio className="h-3 w-3" /> Command deck
          </span>
          {HUD_COMMANDS.map((command) => (
            <a key={command.href} href={command.href} className="hud-command">
              {command.label}
            </a>
          ))}
          <button
            type="button"
            className="hud-command"
            aria-pressed={focusMode}
            onClick={toggleFocusMode}
          >
            {focusMode ? <PanelsTopLeft className="h-3 w-3" /> : <Focus className="h-3 w-3" />}
            {focusMode ? "Overview" : "Focus"}
          </button>
          <Link to={demo ? "/auth" : "/gameforge"} className="hud-command hud-command-primary">
            Arena <Swords className="h-3 w-3" />
          </Link>
        </nav>

        {settlement && (
          <EvidenceSettlementReveal
            settlement={settlement}
            onDismiss={onDismissSettlement}
          />
        )}

        <div className="hud-grid mt-4">
          <RunPulsePanel
            pulse={pulse}
            demo={demo}
            refreshing={refreshing}
            onRefresh={onRefresh}
            settlementPreviewHref={settlementPreviewHref}
          />

          <section id="stats" className="operator-panel hud-stats p-4">
            <PanelHeading icon={Trophy} eyebrow="Character" title="Projected stats" />
            <div className="mt-4 space-y-3">
              {snapshot.stats.map((stat) => (
                <div
                  key={stat.key}
                  className="operator-stat"
                  title={
                    stat.contributingDomains.length > 0
                      ? `Projection from ${stat.contributingDomains.join(", ")}`
                      : "Projection waiting for an authoritative domain level"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs uppercase tracking-widest">{stat.label}</span>
                    <span className="operator-number text-xs text-primary">LVL {stat.level}</span>
                  </div>
                  <Progress
                    value={stat.progressPercent}
                    className="mt-2 h-1.5"
                    aria-label={`${stat.label} projected progress ${stat.progressPercent}%`}
                  />
                  <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {stat.contributingDomains.length > 0
                      ? `Projection // ${stat.contributingDomains.join(" + ")}`
                      : "Projection // no domain data"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="quests" className="operator-panel-accent hud-quest p-4 sm:p-5">
            <PanelHeading icon={Activity} eyebrow="Priority one" title="Active quest" />
            {snapshot.activeQuest ? (
              <div className="mt-5">
                <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-widest">
                  <StatusChip>{snapshot.activeQuest.kind}</StatusChip>
                  {snapshot.activeQuest.mode && <StatusChip>{snapshot.activeQuest.mode}</StatusChip>}
                  {snapshot.activeQuest.resistanceLevel !== null && (
                    <StatusChip>Resistance {snapshot.activeQuest.resistanceLevel}/5</StatusChip>
                  )}
                </div>
                {snapshot.activeQuest.resistanceLevel !== null && (
                  <ResistanceMeter level={snapshot.activeQuest.resistanceLevel} />
                )}
                <h2 className="mt-4 text-2xl font-semibold leading-tight text-wrap-safe sm:text-3xl">
                  {snapshot.activeQuest.title}
                </h2>

                <div className="mt-5 space-y-3">
                  <QuestRequirement
                    icon={LockKeyhole}
                    label="Evidence required"
                    value={snapshot.activeQuest.requiredArtifact ?? "A visible artifact of the action"}
                  />
                  <QuestRequirement
                    icon={ShieldCheck}
                    label="Verdict protocol"
                    value={
                      snapshot.activeQuest.evidenceStandard ??
                      "File the artifact. The evidence engine decides what counts."
                    }
                  />
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link to={snapshot.activeQuest.logActionHref}>
                      Log Action <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link to={demo ? "/auth" : "/coach"}>
                      Open Coach
                    </Link>
                  </Button>
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {LIFE_GAME_STATUS_COPY.noArtifactNoXp}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-sm border border-dashed border-border p-5">
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  No active quest
                </div>
                <p className="mt-2 text-sm text-foreground">
                  The Quest Director issues today's directive on the right. Or file your first real action now.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button asChild>
                    <Link to={demo ? "/auth" : "/coach"}>Open Coach</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={demo ? "/auth" : "/proof"}>Log first action</Link>
                  </Button>
                </div>
              </div>
            )}

            {snapshot.queuedQuests.length > 0 && (
              <details className="mt-5 rounded-sm border border-border bg-background/40 p-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Quest queue // {snapshot.queuedQuests.length}
                </summary>
                <ol className="mt-3 space-y-2 text-sm">
                  {snapshot.queuedQuests.slice(0, 3).map((quest) => (
                    <li key={`${quest.source}-${quest.id}`} className="text-wrap-safe">
                      {quest.title}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>

          <div className="space-y-4">
            <QuestDirectorPanel demo={demo} />
            <Link
              to={demo ? "/auth" : "/gameforge"}
              className="flex min-h-11 items-center justify-between rounded-sm border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              Enter Arena <Swords className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <section id="run-log" className="operator-panel mt-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PanelHeading icon={ScrollText} eyebrow="Authoritative feed" title="Run Log" />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                className="flex rounded-md border border-border bg-background/50 p-0.5"
                role="group"
                aria-label="Filter Run Log"
              >
                {(["all", "actions", "system", "pending"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={runLogFilter === filter}
                    className={cn(
                      "rounded-[2px] px-2 py-1 font-mono text-[8px] uppercase tracking-widest text-muted-foreground motion-hover",
                      runLogFilter === filter && "bg-primary/15 text-primary",
                    )}
                    onClick={() => setRunLogFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              {onRefresh && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} />
                  Refresh truth
                </Button>
              )}
            </div>
          </div>

          {filteredRunLog.length > 0 ? (
            <div className="mt-4 divide-y divide-border">
              {filteredRunLog.map((entry) => (
                <RunLogRow key={`${entry.kind}-${entry.id}`} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-sm border border-dashed border-border p-5 text-sm text-muted-foreground">
              {snapshot.runLog.length > 0
                ? `No ${runLogFilter} entries in the current Run Log window.`
                : "No actions filed yet. The log starts when a real artifact exists."}
            </div>
          )}
        </section>

        <section id="intel" className="operator-panel mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Intel // advanced evidence systems
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Temporal forecasts, evidence audits, and diagnostic panels stay available without
              displacing today&apos;s quest.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={demo ? "/auth" : "/today"}>
              Open deeper analysis <Terminal className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function RunPulsePanel({
  pulse,
  demo,
  refreshing,
  onRefresh,
  settlementPreviewHref,
}: {
  pulse: ReturnType<typeof deriveLifeGamePulse>;
  demo: boolean;
  refreshing: boolean;
  onRefresh?: () => void;
  settlementPreviewHref?: string | null;
}) {
  return (
    <section
      className="run-pulse hud-pulse operator-panel-accent p-4"
      aria-label="Current run pulse"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border",
              pulse.state === "sync_pending"
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
              {pulse.eyebrow}
            </div>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-wrap-safe">
              {pulse.headline}
            </h2>
            <p className="mt-1 hidden text-sm leading-6 text-muted-foreground text-wrap-safe sm:block">
              {pulse.detail}
            </p>
          </div>
        </div>

        <div className="hidden grid-cols-4 gap-1.5 sm:grid sm:gap-2 lg:grid-cols-2">
          <PulseMetric label="Next level" value={`${pulse.nextLevelXp} XP`} />
          <PulseMetric label="Filed today" value={pulse.filedToday} />
          <PulseMetric
            label="Top projection"
            value={
              pulse.strongestStat
                ? `${pulse.strongestStat.label} L${pulse.strongestStat.level}`
                : "No data"
            }
          />
          <PulseMetric
            label="Truth queue"
            value={
              pulse.unavailableSyncCount > 0
                ? `${pulse.unavailableSyncCount} unavailable`
                : pulse.pendingSyncCount > 0
                  ? `${pulse.pendingSyncCount} pending`
                  : "Clear"
            }
          />
        </div>
      </div>

      <RunProtocol
        protocol={pulse.protocol}
        demo={demo}
        refreshing={refreshing}
        onRefresh={onRefresh}
        settlementPreviewHref={settlementPreviewHref}
      />

      <div className="mt-3 hidden flex-wrap items-center gap-2 border-t border-border/70 pt-3 sm:flex">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
          Snapshot signals // display only
        </span>
        {pulse.signals.length > 0 ? (
          pulse.signals.map((signal) => (
            <span
              key={signal.id}
              title={signal.evidence}
              className="inline-flex items-center gap-1 rounded-sm border border-primary/25 bg-primary/[0.06] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-primary"
            >
              <BadgeCheck className="h-3 w-3" />
              {signal.label}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Signals appear only when records support them.</span>
        )}
      </div>
    </section>
  );
}

function RunProtocol({
  protocol,
  demo,
  refreshing,
  onRefresh,
  settlementPreviewHref,
}: {
  protocol: LifeGameProtocol;
  demo: boolean;
  refreshing: boolean;
  onRefresh?: () => void;
  settlementPreviewHref?: string | null;
}) {
  const reviewHref =
    settlementPreviewHref ??
    (protocol.settlementId ? buildLifeGameSettlementHref(protocol.settlementId) : null);

  return (
    <div className="run-protocol mt-3 border-t border-border/70 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
            Today&apos;s run protocol
          </div>
          <div className="mt-1 text-sm font-semibold text-wrap-safe">{protocol.headline}</div>
        </div>
        <ProtocolAction
          protocol={protocol}
          demo={demo}
          refreshing={refreshing}
          onRefresh={onRefresh}
          reviewHref={reviewHref}
        />
      </div>

      <ol
        className="mt-3 grid grid-cols-4 gap-1.5"
        aria-label="Today run protocol"
      >
        {protocol.stages.map((stage, index) => (
          <li
            key={stage.id}
            className={cn(
              "run-protocol-stage min-w-0 rounded-sm border px-2 py-2",
              stage.state === "complete" &&
                "border-primary/35 bg-primary/[0.07] text-primary",
              stage.state === "current" &&
                "border-warning/45 bg-warning/[0.07] text-warning",
              stage.state === "locked" &&
                "border-border bg-background/45 text-muted-foreground",
            )}
            title={stage.detail}
            data-state={stage.state}
            aria-current={stage.state === "current" ? "step" : undefined}
          >
            <div className="flex items-center gap-1.5">
              {stage.state === "complete" ? (
                <CheckCircle2 className="h-3 w-3 shrink-0" />
              ) : stage.state === "current" ? (
                <CircleDashed className="h-3 w-3 shrink-0" />
              ) : (
                <LockKeyhole className="h-3 w-3 shrink-0" />
              )}
              <span className="font-mono text-[8px] uppercase tracking-widest">
                0{index + 1}
              </span>
            </div>
            <div className="mt-1 truncate font-mono text-[9px] font-semibold uppercase tracking-wider">
              {stage.label}
            </div>
            <div className="mt-1 hidden text-[10px] leading-4 text-muted-foreground text-wrap-safe lg:block">
              {stage.detail}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground text-wrap-safe">
        Next move // {protocol.nextMove}
      </p>
    </div>
  );
}

function ProtocolAction({
  protocol,
  demo,
  refreshing,
  onRefresh,
  reviewHref,
}: {
  protocol: LifeGameProtocol;
  demo: boolean;
  refreshing: boolean;
  onRefresh?: () => void;
  reviewHref: string | null;
}) {
  const className =
    "native-tap inline-flex min-h-9 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/[0.06] px-3 font-mono text-[8px] uppercase tracking-widest text-primary hover:bg-primary/10";

  if (protocol.nextAction === "refresh_truth" && onRefresh) {
    return (
      <button
        type="button"
        className={className}
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={cn("mr-1.5 h-3 w-3", refreshing && "animate-spin")} />
        {refreshing ? "Refreshing" : "Refresh truth"}
      </button>
    );
  }

  if (protocol.nextAction === "review_settlement" && reviewHref) {
    return (
      <Link to={reviewHref} className={className}>
        Review result <ArrowRight className="ml-1.5 h-3 w-3" />
      </Link>
    );
  }

  if (protocol.nextAction === "view_quest") {
    return (
      <a href="#quests" className={className}>
        View quest <ArrowRight className="ml-1.5 h-3 w-3" />
      </a>
    );
  }

  if (protocol.nextAction === "ask_gm") {
    return (
      <Link to={demo ? "/auth" : "/coach"} className={className}>
        Ask Game Master <ArrowRight className="ml-1.5 h-3 w-3" />
      </Link>
    );
  }

  return (
    <a href="#run-log" className={className}>
      Open truth queue <ArrowRight className="ml-1.5 h-3 w-3" />
    </a>
  );
}

function EvidenceSettlementReveal({
  settlement,
  onDismiss,
}: {
  settlement: EvidenceSettlement;
  onDismiss?: () => void;
}) {
  const settled = settlement.state === "settled";
  const pending = settlement.state === "pending" || settlement.state === "locating";
  const heading =
    settlement.state === "settled"
      ? "Verdict committed. Character updated."
      : settlement.state === "unavailable"
        ? "Settlement unavailable."
        : settlement.state === "pending"
          ? "Artifact committed. Settlement pending."
          : "Locating the filed action.";
  const detail =
    settlement.state === "settled"
      ? "The Court verdict and XP below came from committed evidence records."
      : settlement.state === "unavailable"
        ? "A truth query failed. No verdict, XP, or completion has been assumed."
        : settlement.state === "pending"
          ? "The artifact exists. Eblocki is waiting for committed verdict and XP records."
          : "Eblocki is refreshing the authoritative Run Log. URL data is not treated as proof.";
  const Icon = settled ? CheckCircle2 : settlement.state === "unavailable" ? CloudOff : CircleDashed;

  return (
    <section
      id="settlement"
      className={cn(
        "settlement-reveal crt-surface motion-entrance mt-4 rounded-sm border p-4 sm:p-5",
        settled ? "settlement-reveal-settled border-primary/55" : "border-border",
      )}
      aria-live="polite"
      aria-label="Evidence settlement"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border",
              settled
                ? "border-primary/45 bg-primary/10 text-primary"
                : settlement.state === "unavailable"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-warning/40 bg-warning/10 text-warning",
            )}
          >
            <Icon className={cn("h-5 w-5", pending && "settlement-pending-spin")} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
              {settled ? "Evidence settlement // complete" : `Evidence settlement // ${settlement.state}`}
            </div>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-wrap-safe sm:text-2xl">
              {heading}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground text-wrap-safe">
              {detail}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="operator-interactive operator-hit flex shrink-0 items-center justify-center border border-border text-muted-foreground hover:border-primary/35 hover:text-primary"
            aria-label="Dismiss evidence settlement"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {settlement.title && (
        <div className="mt-4 rounded-sm border border-border bg-background/55 p-3">
          <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
            Filed action
          </div>
          <div className="mt-1 text-base font-semibold text-wrap-safe">{settlement.title}</div>
        </div>
      )}

      {settlement.state !== "locating" && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SettlementMetric label="Evidence" value={settlement.evidenceStrength ?? "unavailable"} />
          <SettlementMetric
            label="Court verdict"
            value={settlement.courtVerdict ?? (settled ? "unavailable" : "sync pending")}
          />
          <SettlementMetric label="Stat" value={settlement.stat ?? "unmapped"} />
          <SettlementMetric
            label="Character XP"
            value={settlement.xp === null ? (settled ? "unavailable" : "sync pending") : `+${settlement.xp}`}
            primary={settlement.xp !== null}
          />
        </div>
      )}

      <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
        Read only // no committed record, no reward reveal
      </p>
    </section>
  );
}

function SettlementMetric({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-sm border border-border bg-background/55 p-3">
      <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate text-sm font-semibold capitalize",
          primary && "text-lg text-primary",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PulseMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-sm border border-border bg-background/50 p-2 sm:p-2.5">
      <div className="truncate font-mono text-[7px] uppercase tracking-wider text-muted-foreground sm:text-[8px] sm:tracking-widest">
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-semibold sm:text-sm">{value}</div>
    </div>
  );
}

function ResistanceMeter({ level }: { level: number }) {
  const safeLevel = Math.min(5, Math.max(0, Math.round(level)));
  return (
    <div
      className="mt-3 flex items-center gap-2"
      role="img"
      aria-label={`Quest resistance ${safeLevel} out of 5`}
    >
      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
        Quest intensity
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 w-5 rounded-full border border-border",
              index < safeLevel ? "border-primary/50 bg-primary/70" : "bg-background/60",
            )}
          />
        ))}
      </span>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <div className="rounded-sm border border-border bg-background/50 p-2.5">
      <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-sm font-semibold",
          tone === "primary" && "text-primary",
          tone === "danger" && "text-destructive",
        )}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}

function PanelHeading({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
    </div>
  );
}

function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm border border-border bg-background/60 px-2 py-1 text-muted-foreground">
      {children}
    </span>
  );
}

function QuestRequirement({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LockKeyhole;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-background/50 p-3">
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-primary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground text-wrap-safe">{value}</p>
    </div>
  );
}

function RunLogRow({ entry }: { entry: RunLogEntry }) {
  const timestamp = useMemo(() => {
    const date = new Date(entry.createdAt);
    return Number.isNaN(date.getTime())
      ? "time unavailable"
      : new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(date);
  }, [entry.createdAt]);

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {entry.kind === "level_up" ? "System" : entry.stat ?? "Action"} // {timestamp}
        </div>
        <div className="mt-1 truncate text-sm font-medium text-wrap-safe sm:truncate">{entry.title}</div>
      </div>
      <LogValue label="Evidence" value={entry.evidenceStrength ?? "—"} />
      <LogValue label="Verdict" value={entry.courtVerdict ?? syncLabel(entry.syncState)} />
      <LogValue
        label="Character XP"
        value={entry.xp === null ? syncLabel(entry.syncState) : `+${entry.xp}`}
        tone={entry.xp !== null ? "primary" : "muted"}
      />
    </div>
  );
}

function syncLabel(state: RunLogEntry["syncState"]) {
  if (state === "pending") return "sync pending";
  if (state === "unavailable") return "unavailable";
  return "—";
}

function LogValue({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "muted";
}) {
  return (
    <div className="min-w-[96px]">
      <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-xs",
          tone === "primary" && "font-semibold text-primary",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

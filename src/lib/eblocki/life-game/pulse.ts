import type { LifeGameSnapshot, LifeStatKey } from "./types";
import { isSameLocalDay } from "@/lib/eblocki/local-day";

export type LifeGamePulseState =
  | "level_signal"
  | "xp_committed"
  | "sync_pending"
  | "quest_ready"
  | "idle";

export interface LifeGameSignal {
  id: "compound_operator" | "seven_day_streak" | "court_verified" | "cross_domain";
  label: string;
  evidence: string;
}

export type LifeGameProtocolStageId = "choose" | "prove" | "verdict" | "grow";
export type LifeGameProtocolStageState = "complete" | "current" | "locked";
export type LifeGameProtocolState =
  | "needs_quest"
  | "quest_armed"
  | "artifact_filed"
  | "verdict_committed"
  | "complete";
export type LifeGameProtocolAction =
  | "ask_gm"
  | "view_quest"
  | "refresh_truth"
  | "review_settlement";

export interface LifeGameProtocolStage {
  id: LifeGameProtocolStageId;
  label: string;
  state: LifeGameProtocolStageState;
  detail: string;
}

export interface LifeGameProtocol {
  state: LifeGameProtocolState;
  headline: string;
  nextMove: string;
  nextAction: LifeGameProtocolAction;
  settlementId: string | null;
  stages: LifeGameProtocolStage[];
}

export interface LifeGamePulse {
  state: LifeGamePulseState;
  eyebrow: string;
  headline: string;
  detail: string;
  nextLevelXp: number;
  pendingSyncCount: number;
  unavailableSyncCount: number;
  filedToday: number;
  strongestStat: {
    key: LifeStatKey;
    label: string;
    level: number;
  } | null;
  signals: LifeGameSignal[];
  protocol: LifeGameProtocol;
}

function strongestProjectedStat(snapshot: LifeGameSnapshot): LifeGamePulse["strongestStat"] {
  const available = snapshot.stats.filter((stat) => stat.contributingDomains.length > 0);
  const strongest = [...available].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.progressPercent - a.progressPercent;
  })[0];

  return strongest
    ? { key: strongest.key, label: strongest.label, level: strongest.level }
    : null;
}

function deriveSignals(snapshot: LifeGameSnapshot): LifeGameSignal[] {
  const signals: LifeGameSignal[] = [];
  const domainCount = new Set(
    snapshot.stats
      .flatMap((stat) => stat.contributingDomains)
      .filter((domain) => domain !== "operator"),
  ).size;
  const completedVerdict = snapshot.runLog.find(
    (entry) => entry.kind === "action" && entry.syncState === "complete" && entry.courtVerdict,
  );

  if (snapshot.operator.level >= 10) {
    signals.push({
      id: "compound_operator",
      label: "Compound Operator",
      evidence: `Authoritative operator level ${snapshot.operator.level}`,
    });
  }
  if ((snapshot.momentum?.streakDays ?? 0) >= 7) {
    signals.push({
      id: "seven_day_streak",
      label: "7-Day Chain",
      evidence: `${snapshot.momentum?.streakDays ?? 0} committed streak days`,
    });
  }
  if (completedVerdict) {
    signals.push({
      id: "court_verified",
      label: "Court Verified",
      evidence: `Committed verdict: ${completedVerdict.courtVerdict}`,
    });
  }
  if (domainCount >= 3) {
    signals.push({
      id: "cross_domain",
      label: "Cross-Domain",
      evidence: `${domainCount} authoritative domains represented`,
    });
  }

  return signals;
}

export function deriveLifeGameProtocol(
  snapshot: LifeGameSnapshot,
  nowInput: Date | string = new Date(),
): LifeGameProtocol {
  const now = typeof nowInput === "string" ? new Date(nowInput) : new Date(nowInput);
  const todayAction = Number.isNaN(now.getTime())
    ? null
    : (snapshot.runLog.find((entry) => {
        if (entry.kind !== "action") return false;
        const createdAt = new Date(entry.createdAt);
        return (
          !Number.isNaN(createdAt.getTime()) &&
          isSameLocalDay(createdAt, now, snapshot.clock.timeZone)
        );
      }) ?? null);
  const filedToday = Boolean(todayAction) || (snapshot.momentum?.proofsToday ?? 0) > 0;
  const actionChosen = Boolean(snapshot.activeQuest) || filedToday;
  const verdictCommitted = filedToday && Boolean(todayAction?.courtVerdict);
  const characterUpdated =
    verdictCommitted && todayAction !== null && todayAction.xp !== null;
  const completion = [actionChosen, filedToday, verdictCommitted, characterUpdated];
  const firstIncomplete = completion.findIndex((complete) => !complete);
  const currentIndex = firstIncomplete === -1 ? completion.length : firstIncomplete;
  const stageState = (index: number): LifeGameProtocolStageState =>
    completion[index] ? "complete" : index === currentIndex ? "current" : "locked";
  const filedCount = Math.max(0, snapshot.momentum?.proofsToday ?? (todayAction ? 1 : 0));

  let state: LifeGameProtocolState = "needs_quest";
  let headline = "Choose one bounded action.";
  let nextMove = "Ask the Game Master for one quest with one required artifact.";
  let nextAction: LifeGameProtocolAction = "ask_gm";

  if (characterUpdated) {
    state = "complete";
    headline = "One evidence cycle is complete.";
    nextMove = snapshot.activeQuest
      ? "Review the committed result, then return to the active quest."
      : "Review the committed result, then ask for the next quest.";
    nextAction = "review_settlement";
  } else if (verdictCommitted) {
    state = "verdict_committed";
    headline = "The Court verdict is committed.";
    nextMove = "Wait for the XP event before treating the character as updated.";
    nextAction = "refresh_truth";
  } else if (filedToday) {
    state = "artifact_filed";
    headline = "The artifact exists.";
    nextMove = "The Court verdict and XP event must commit before the run settles.";
    nextAction = "refresh_truth";
  } else if (snapshot.activeQuest) {
    state = "quest_armed";
    headline = "The quest is armed.";
    nextMove = "Perform the action. File the artifact only when it exists.";
    nextAction = "view_quest";
  }

  return {
    state,
    headline,
    nextMove,
    nextAction,
    settlementId: characterUpdated ? todayAction.id : null,
    stages: [
      {
        id: "choose",
        label: "Choose",
        state: stageState(0),
        detail: filedToday
          ? "A real action exists in today's ledger."
          : snapshot.activeQuest?.title ?? "Choose one bounded quest.",
      },
      {
        id: "prove",
        label: "Prove",
        state: stageState(1),
        detail: todayAction?.title ?? (
          filedToday
            ? `${filedCount} action${filedCount === 1 ? "" : "s"} filed today.`
            : snapshot.activeQuest?.requiredArtifact ?? "Produce a visible artifact."
        ),
      },
      {
        id: "verdict",
        label: "Verdict",
        state: stageState(2),
        detail: todayAction?.courtVerdict
          ? `Court verdict: ${todayAction.courtVerdict}.`
          : snapshot.health.verdicts === "error"
            ? "Verdict query unavailable; no verdict assumed."
            : filedToday
              ? "Waiting for the committed Court record."
              : "Locked until an artifact exists.",
      },
      {
        id: "grow",
        label: "Grow",
        state: stageState(3),
        detail: characterUpdated
          ? `+${todayAction.xp} character XP committed.`
          : snapshot.health.xpEvents === "error"
            ? "XP query unavailable; no reward assumed."
            : verdictCommitted
              ? "Waiting for the authoritative XP event."
              : "Locked until the verdict is visible.",
      },
    ],
  };
}

export function deriveLifeGamePulse(
  snapshot: LifeGameSnapshot,
  nowInput: Date | string = new Date(),
): LifeGamePulse {
  const latest = snapshot.runLog[0] ?? null;
  const pendingSyncCount = snapshot.runLog.filter((entry) => entry.syncState === "pending").length;
  const unavailableSyncCount = snapshot.runLog.filter(
    (entry) => entry.syncState === "unavailable",
  ).length;
  const nextLevelXp = Math.max(0, snapshot.operator.threshold - snapshot.operator.xpInLevel);

  let state: LifeGamePulseState = "idle";
  let eyebrow = "Run state";
  let headline = "The run starts with one filed action.";
  let detail = "Choose one real action, produce the artifact, and let the evidence engine judge it.";

  if (latest?.kind === "level_up" && latest.syncState === "complete") {
    state = "level_signal";
    eyebrow = "Ledger signal";
    headline = "A level signal is committed.";
    detail = latest.title;
  } else if (
    latest?.kind === "action" &&
    latest.syncState === "complete" &&
    latest.xp !== null
  ) {
    state = "xp_committed";
    eyebrow = "XP committed";
    headline = `+${latest.xp} character XP landed.`;
    detail = latest.courtVerdict
      ? `Court verdict: ${latest.courtVerdict}. The Run Log is authoritative.`
      : "The XP event exists. Verdict detail is unavailable.";
  } else if (pendingSyncCount > 0 || unavailableSyncCount > 0) {
    state = "sync_pending";
    eyebrow = "Evidence filed";
    headline = "The engine is resolving the result.";
    detail =
      unavailableSyncCount > 0
        ? "A secondary evidence query is unavailable. No reward has been assumed."
        : "The artifact exists. XP and verdict remain pending until committed records arrive.";
  } else if (snapshot.activeQuest) {
    state = "quest_ready";
    eyebrow = "Quest armed";
    headline = snapshot.activeQuest.title;
    detail =
      snapshot.activeQuest.requiredArtifact ??
      "Produce a visible artifact before claiming the action.";
  }

  return {
    state,
    eyebrow,
    headline,
    detail,
    nextLevelXp,
    pendingSyncCount,
    unavailableSyncCount,
    filedToday: snapshot.momentum?.proofsToday ?? 0,
    strongestStat: strongestProjectedStat(snapshot),
    signals: deriveSignals(snapshot),
    protocol: deriveLifeGameProtocol(snapshot, nowInput),
  };
}

import type { LifeGameSnapshot } from "./types";
import { localDayKey } from "@/lib/eblocki/local-day";

const offsetIso = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

/**
 * Deterministic, fictional demo state. It accepts an injected clock so visual
 * baselines do not drift and contains no production user history or PII.
 */
export function createLifeGameDemoSnapshot(nowInput: Date | string): LifeGameSnapshot {
  const now = typeof nowInput === "string" ? new Date(nowInput) : new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error("A valid demo clock is required.");

  return {
    clock: {
      localDate: localDayKey(now, "UTC"),
      timeZone: "UTC",
      weekStartsOn: 1,
    },
    operator: {
      level: 12,
      title: "Compound Operator",
      rank: "Compound Builder",
      totalXp: 4_280,
      xpInLevel: 312,
      threshold: 524,
    },
    stats: [
      { key: "body", label: "Body", level: 8, progressPercent: 42, contributingDomains: ["soccer"], source: "domain_levels", isProjection: true },
      { key: "mind", label: "Mind", level: 14, progressPercent: 68, contributingDomains: ["law", "psychology"], source: "domain_levels", isProjection: true },
      { key: "craft", label: "Craft", level: 11, progressPercent: 24, contributingDomains: ["sales", "finance", "eblocki"], source: "domain_levels", isProjection: true },
      { key: "social", label: "Social", level: 7, progressPercent: 73, contributingDomains: ["life"], source: "domain_levels", isProjection: true },
      { key: "discipline", label: "Discipline", level: 12, progressPercent: 59.5, contributingDomains: ["operator"], source: "operator_level", isProjection: true },
    ],
    activeQuest: {
      id: "demo-quest-active",
      source: "daily_objective",
      title: "Ship one verified improvement to the product",
      mode: "eblocki",
      kind: "mission",
      requiredArtifact: "A commit plus the command output that verifies it",
      evidenceStandard: "The change exists, the relevant check passes, and the diff matches the claim.",
      proofRequired: true,
      resistanceLevel: 4,
      logActionHref: "/auth?returnTo=%2Fproof",
    },
    queuedQuests: [
      {
        id: "demo-quest-queued",
        source: "proof_commitment",
        title: "Complete one pressure-tested sales reflection",
        mode: "sales",
        kind: "commitment",
        requiredArtifact: "A written objection, response, outcome, and upgrade",
        evidenceStandard: "Specific enough to be checked against the real customer interaction.",
        proofRequired: true,
        resistanceLevel: null,
        logActionHref: "/auth?returnTo=%2Fproof",
      },
    ],
    momentum: {
      score: 82,
      streakDays: 9,
      longestStreak: 17,
      proofsToday: 1,
      state: "momentum",
    },
    runLog: [
      {
        kind: "level_up",
        id: "demo-log-level",
        title: "SYSTEM // MIND LEVEL 13 → 14",
        stat: "mind",
        createdAt: offsetIso(now, 34),
        evidenceStrength: null,
        courtVerdict: "elite",
        xp: null,
        syncState: "complete",
      },
      {
        kind: "action",
        id: "demo-log-action-1",
        title: "Submitted a timed issue analysis",
        stat: "mind",
        createdAt: offsetIso(now, 38),
        evidenceStrength: "elite",
        courtVerdict: "elite",
        xp: 96,
        syncState: "complete",
      },
      {
        kind: "action",
        id: "demo-log-action-2",
        title: "Recorded sprint finishing practice",
        stat: "body",
        createdAt: offsetIso(now, 310),
        evidenceStrength: "strong",
        courtVerdict: "accepted_strong",
        xp: 41,
        syncState: "complete",
      },
      {
        kind: "action",
        id: "demo-log-action-3",
        title: "Filed a product build result",
        stat: "craft",
        createdAt: offsetIso(now, 1_120),
        evidenceStrength: "strong",
        courtVerdict: "accepted_strong",
        xp: null,
        syncState: "pending",
      },
    ],
    recentGameMasterMessages: [
      {
        id: "demo-gm-1",
        mode: "eblocki",
        directiveLabel: "Eblocki directive",
        createdAt: offsetIso(now, 18),
      },
    ],
    health: {
      operator: "ok",
      domains: "ok",
      objectives: "ok",
      commitments: "ok",
      proofs: "ok",
      verdicts: "ok",
      xpEvents: "ok",
      ledger: "ok",
      momentum: "ok",
      coachInteractions: "ok",
    },
  };
}

export const DEMO_GAME_MASTER_SCRIPT = [
  "CALLOUT // Polishing is protecting you from a verdict.",
  "QUEST // Ship one bounded improvement before adding another idea.",
  "ARTIFACT // Commit, diff, and the relevant command output.",
  "STANDARD // The implementation exists and the evidence matches the claim.",
] as const;

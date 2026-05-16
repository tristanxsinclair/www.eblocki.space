/**
 * Behavioural momentum engine.
 *
 * Pure logic — no React, no Supabase. Inputs are plain shapes so this is
 * trivially testable and reusable from edge functions later.
 *
 * Philosophy:
 *   - Reward resistance overcome, not activity.
 *   - Streaks compound. Freezes are earned, not given.
 *   - State is a snapshot, not a verdict — recovery is always one proof away.
 */

export type MomentumStateName =
  | "cold"
  | "warming"
  | "momentum"
  | "at_risk"
  | "recovery"
  | "elite";

export interface ProofSample {
  created_at: string;
  quality_score: number | null;
  evidence_strength: string | null;
  domain?: string | null;
}

export interface MomentumSnapshot {
  state: MomentumStateName;
  momentum_score: number; // 0..100
  streak_days: number;
  longest_streak: number;
  freeze_tokens: number;
  proofs_today: number;
  resistance_overcome: number;
  identity_signal: string;
  last_proof_at: string | null;
  avg_quality: number;
  /** Hours since the last proof, or Infinity. Useful for at-risk copy. */
  hours_since_proof: number;
}

const DAY_MS = 86_400_000;

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

/** Group proofs into a set of unique calendar dates (UTC). */
function uniqueDays(proofs: ProofSample[]): Set<string> {
  const s = new Set<string>();
  for (const p of proofs) s.add(startOfDayISO(new Date(p.created_at)));
  return s;
}

/**
 * Streak counts consecutive days ending today (or yesterday — today still
 * counts if today is missing but yesterday hit). Freeze tokens patch single
 * missed days inside the trailing window.
 */
export function computeStreak(
  proofs: ProofSample[],
  freezeTokensAvailable: number,
  now: Date = new Date(),
): { streak: number; tokensConsumed: number } {
  const days = uniqueDays(proofs);
  let streak = 0;
  let tokensLeft = freezeTokensAvailable;
  let tokensConsumed = 0;

  const today = startOfDayISO(now);
  const yesterday = startOfDayISO(new Date(now.getTime() - DAY_MS));

  // Anchor: if today is empty, allow starting from yesterday without penalty.
  let cursor = days.has(today) ? new Date(now) : new Date(now.getTime() - DAY_MS);
  if (!days.has(today) && !days.has(yesterday)) {
    return { streak: 0, tokensConsumed: 0 };
  }

  for (let i = 0; i < 365; i++) {
    const key = startOfDayISO(cursor);
    if (days.has(key)) {
      streak += 1;
    } else if (tokensLeft > 0) {
      tokensLeft -= 1;
      tokensConsumed += 1;
      streak += 1;
    } else {
      break;
    }
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return { streak, tokensConsumed };
}

/**
 * Momentum score 0..100. Weighted blend of:
 *  - velocity (proofs in last 7 days)
 *  - depth (avg quality 0..10)
 *  - resistance (elite/strong artifacts carry more weight)
 *  - recency (penalises gaps > 24h)
 *  - consistency (unique active days in last 7)
 */
export function computeMomentumScore(
  proofs: ProofSample[],
  now: Date = new Date(),
): { score: number; avgQuality: number; resistanceOvercome: number } {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const week = proofs.filter((p) => new Date(p.created_at).getTime() >= weekAgo);

  const velocity = Math.min(week.length * 6, 40); // cap 40
  const scored = week.filter((p) => typeof p.quality_score === "number");
  const avgQuality = scored.length
    ? scored.reduce((s, p) => s + (p.quality_score ?? 0), 0) / scored.length
    : 0;
  const depth = Math.min(avgQuality * 2.5, 25); // cap 25

  const resistanceOvercome =
    week.filter((p) => p.evidence_strength === "elite").length * 3 +
    week.filter((p) => p.evidence_strength === "strong").length * 2;
  const resistance = Math.min(resistanceOvercome * 2, 20); // cap 20

  const lastTs = proofs[0] ? new Date(proofs[0].created_at).getTime() : 0;
  const hoursSince = lastTs ? (now.getTime() - lastTs) / 3_600_000 : Infinity;
  const recency =
    hoursSince <= 12 ? 10 : hoursSince <= 24 ? 6 : hoursSince <= 48 ? 2 : 0;

  const activeDays = uniqueDays(week).size;
  const consistency = Math.min(activeDays * 1.5, 5); // cap 5

  const score = Math.max(
    0,
    Math.min(100, Math.round(velocity + depth + resistance + recency + consistency)),
  );
  return { score, avgQuality: Math.round(avgQuality * 10) / 10, resistanceOvercome };
}

/** Classify the user's current behavioural state from score + streak + recency. */
export function classifyState(input: {
  score: number;
  streak: number;
  hoursSinceProof: number;
  proofsToday: number;
}): MomentumStateName {
  const { score, streak, hoursSinceProof, proofsToday } = input;
  if (score >= 80 && streak >= 7) return "elite";
  if (score >= 60 && proofsToday >= 1) return "momentum";
  if (streak >= 2 && proofsToday === 0 && hoursSinceProof >= 20) return "at_risk";
  if (streak === 0 && score < 25) return "cold";
  if (streak === 0 && score >= 25) return "recovery";
  return "warming";
}

/**
 * Freeze tokens: earn one per 5-day streak milestone, cap at 3.
 * Never auto-grant on day 0.
 */
export function computeFreezeTokens(
  longestStreak: number,
  alreadyEarned: number,
  alreadyUsed: number,
): { tokens: number; earnedTotal: number } {
  const earnedTotal = Math.max(alreadyEarned, Math.floor(longestStreak / 5));
  const tokens = Math.max(0, Math.min(3, earnedTotal - alreadyUsed));
  return { tokens, earnedTotal };
}

/**
 * Identity-reinforcement copy. Replaces generic "great job" with proof of
 * who the user is becoming, drawn from their actual behavioural data.
 */
export function identitySignal(s: {
  state: MomentumStateName;
  streak: number;
  proofsToday: number;
  resistanceOvercome: number;
  avgQuality: number;
  strongestDomain?: string | null;
}): string {
  const { state, streak, proofsToday, resistanceOvercome, avgQuality, strongestDomain } = s;

  if (state === "elite") {
    return `${streak}-day streak. Evidence of an operator who executes under pressure.`;
  }
  if (state === "momentum") {
    if (resistanceOvercome >= 3)
      return `${resistanceOvercome} high-resistance artifacts this week. Avoidance is losing.`;
    if (strongestDomain)
      return `Compounding in ${strongestDomain.toUpperCase()}. Identity claim being earned.`;
    return `${proofsToday} proof${proofsToday === 1 ? "" : "s"} today. Pattern reinforced.`;
  }
  if (state === "at_risk") {
    return `${streak}-day streak at risk. One artifact preserves the pattern.`;
  }
  if (state === "recovery") {
    return `Recovery is one proof. Today decides who you are becoming.`;
  }
  if (state === "warming") {
    return avgQuality >= 7
      ? `Quality is high (${avgQuality}/10). Now demand frequency.`
      : `Momentum building. Stack one more proof.`;
  }
  return `The court has no recent record. Submit one artifact to begin.`;
}

/**
 * Variable reward — Duolingo-style intermittent bonus. Deterministic per
 * proof artifact id so refresh doesn't reroll, but feels random across the
 * day. Higher resistance = higher bonus probability.
 */
export function rollVariableReward(opts: {
  seed: string;
  resistanceLevel: number; // 1..5
}): { bonus: number; rare: boolean; label: string | null } {
  let h = 2166136261;
  for (let i = 0; i < opts.seed.length; i++) {
    h ^= opts.seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  const threshold = 0.55 - opts.resistanceLevel * 0.05; // resistance 5 → 0.30
  if (r > threshold) return { bonus: 0, rare: false, label: null };
  if (r < 0.05) return { bonus: 50, rare: true, label: "DEEP-WORK JACKPOT" };
  if (r < 0.2) return { bonus: 25, rare: false, label: "MOMENTUM MULTIPLIER" };
  return { bonus: 10, rare: false, label: "STREAK BONUS" };
}

/**
 * Build a momentum snapshot from raw inputs. Pure — caller persists.
 */
export function buildSnapshot(input: {
  proofs: ProofSample[];
  prior: {
    longestStreak: number;
    freezeTokensEarnedTotal: number;
    freezeTokensUsedTotal: number;
  };
  strongestDomain?: string | null;
  now?: Date;
}): MomentumSnapshot {
  const now = input.now ?? new Date();
  const { score, avgQuality, resistanceOvercome } = computeMomentumScore(input.proofs, now);

  const { tokens: tokensBefore } = computeFreezeTokens(
    input.prior.longestStreak,
    input.prior.freezeTokensEarnedTotal,
    input.prior.freezeTokensUsedTotal,
  );
  const { streak } = computeStreak(input.proofs, tokensBefore, now);
  const longest = Math.max(input.prior.longestStreak, streak);
  const { tokens, earnedTotal } = computeFreezeTokens(
    longest,
    input.prior.freezeTokensEarnedTotal,
    input.prior.freezeTokensUsedTotal,
  );
  void earnedTotal;

  const todayKey = startOfDayISO(now);
  const proofsToday = input.proofs.filter(
    (p) => startOfDayISO(new Date(p.created_at)) === todayKey,
  ).length;

  const lastTs = input.proofs[0]?.created_at ?? null;
  const hoursSince = lastTs
    ? (now.getTime() - new Date(lastTs).getTime()) / 3_600_000
    : Infinity;

  const state = classifyState({
    score,
    streak,
    hoursSinceProof: hoursSince,
    proofsToday,
  });

  return {
    state,
    momentum_score: score,
    streak_days: streak,
    longest_streak: longest,
    freeze_tokens: tokens,
    proofs_today: proofsToday,
    resistance_overcome: resistanceOvercome,
    avg_quality: avgQuality,
    last_proof_at: lastTs,
    hours_since_proof: hoursSince,
    identity_signal: identitySignal({
      state,
      streak,
      proofsToday,
      resistanceOvercome,
      avgQuality,
      strongestDomain: input.strongestDomain ?? null,
    }),
  };
}

export const STATE_COPY: Record<MomentumStateName, { label: string; tone: string }> = {
  cold: { label: "Cold start", tone: "No recent proof. One artifact ignites the loop." },
  warming: { label: "Warming up", tone: "Pattern forming. Stack consistency." },
  momentum: { label: "Momentum", tone: "Compounding active. Protect the streak." },
  at_risk: { label: "Streak at risk", tone: "One proof preserves the pattern." },
  recovery: { label: "Recovery", tone: "Reset window. Today decides." },
  elite: { label: "Elite execution", tone: "Sustained high-resistance output." },
};
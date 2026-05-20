/**
 * Compound Level Engine — client mirror of the server trigger logic.
 *
 * The authoritative XP math runs in Postgres (see migration cle_*).
 * These pure helpers exist so the UI can:
 *   - preview the verdict + XP a proof is likely to earn
 *   - render thresholds, ranks, titles consistently
 *   - run unit tests without a database round-trip
 *
 * Keep this file in lock-step with the SQL functions.
 */

export type CanonDomain =
  | "law"
  | "psychology"
  | "sales"
  | "soccer"
  | "finance"
  | "eblocki"
  | "life";

export type CourtVerdict =
  | "rejected"
  | "accepted_minimum"
  | "accepted_useful"
  | "accepted_strong"
  | "elite";

export const DOMAINS: CanonDomain[] = [
  "law",
  "psychology",
  "sales",
  "soccer",
  "finance",
  "eblocki",
  "life",
];

export function canonDomain(d: string | null | undefined): CanonDomain {
  const k = (d || "general").toLowerCase();
  if (k === "law") return "law";
  if (k === "psychology") return "psychology";
  if (k === "sales") return "sales";
  if (k === "sport" || k === "soccer") return "soccer";
  if (k === "finance" || k === "career_money" || k === "career") return "finance";
  if (k === "eblocki") return "eblocki";
  if (k === "brand" || k === "discipline" || k === "life") return "life";
  return "life";
}

/** Exponential threshold: 100 × 1.55^(lvl-1), floor, min 100. */
export function levelThreshold(level: number): number {
  return Math.max(100, Math.floor(100 * Math.pow(1.55, Math.max(level, 1) - 1)));
}

export function rankFor(level: number): string {
  if (level <= 5) return "Initiate";
  if (level <= 10) return "Structured Operator";
  if (level <= 20) return "Compound Builder";
  if (level <= 35) return "Tactical Performer";
  if (level <= 50) return "Identity Architect";
  if (level <= 75) return "Elite Operator";
  return "System Sovereign";
}

export function operatorTitle(level: number): string {
  if (level <= 2) return "Emerging Operator";
  if (level <= 5) return "Structured Operator";
  if (level <= 10) return "Compound Operator";
  if (level <= 20) return "Tactical Operator";
  if (level <= 35) return "Identity Operator";
  if (level <= 50) return "Elite Operator";
  return "Sovereign Operator";
}

export function baseXP(tier: number): number {
  switch (tier) {
    case 1: return 3;
    case 2: return 10;
    case 3: return 25;
    case 4: return 55;
    case 5: return 110;
    case 6: return 300;
    default: return 1;
  }
}

export function streakMult(streak: number): number {
  if (streak >= 90) return 2.2;
  if (streak >= 30) return 1.6;
  if (streak >= 14) return 1.3;
  if (streak >= 7) return 1.15;
  if (streak >= 3) return 1.05;
  return 1.0;
}

export function verdictMult(v: CourtVerdict): number {
  switch (v) {
    case "rejected": return 0;
    case "accepted_minimum": return 0.5;
    case "accepted_useful": return 1.0;
    case "accepted_strong": return 1.25;
    case "elite": return 1.6;
  }
}

export interface TierInput {
  content: string | null | undefined;
  evidenceStrength?: string | null;
  transferFlag?: boolean;
  pressureFlag?: boolean;
  quality: number;
}

export function classifyTier(i: TierInput): 1 | 2 | 3 | 4 | 5 | 6 {
  const len = (i.content || "").length;
  const q = i.quality;
  const ev = (i.evidenceStrength || "").toLowerCase();
  if (i.transferFlag && q >= 4) return 5;
  if (ev === "elite" && q === 5 && len >= 400) return 6;
  if (i.pressureFlag && q >= 3) return 4;
  if (ev === "strong" || ev === "elite" || (q >= 4 && len >= 250)) return 3;
  if (len >= 80 || ev === "moderate") return 2;
  return 1;
}

export interface CourtInput {
  tier: number;
  quality: number;
  isDuplicate?: boolean;
  vague?: boolean;
}

export function judgeCourt(i: CourtInput): CourtVerdict {
  if (i.isDuplicate) return "rejected";
  if (i.vague && i.quality < 3) return "rejected";
  if (i.quality <= 1) return "rejected";
  if (i.quality === 2) return "accepted_minimum";
  if (i.tier >= 5 && i.quality >= 4) return "elite";
  if (i.tier >= 3 && i.quality >= 4) return "accepted_strong";
  if (i.quality === 3) return "accepted_useful";
  if (i.quality >= 4) return "accepted_strong";
  return "accepted_minimum";
}

export interface XPInput {
  tier: number;
  quality: number;
  streakDays?: number;
  pressureFlag?: boolean;
  transferFlag?: boolean;
  verdict: CourtVerdict;
  sameDomainCountToday?: number;
}

export interface XPBreakdown {
  base: number;
  qualityMult: number;
  streakMult: number;
  pressureMult: number;
  transferMult: number;
  diminishingMult: number;
  verdictMult: number;
  final: number;
}

export function computeXP(i: XPInput): XPBreakdown {
  const base = baseXP(i.tier);
  const qMult = Math.max(0.2, i.quality / 3);
  const sMult = streakMult(i.streakDays ?? 0);
  const pMult = i.pressureFlag ? 1.3 : 1.0;
  const tMult = i.transferFlag ? 1.4 : 1.0;
  const todayCount = i.sameDomainCountToday ?? 0;
  const dMult = todayCount >= 8 ? 0.25 : todayCount >= 5 ? 0.5 : 1.0;
  const vMult = verdictMult(i.verdict);
  const final = i.verdict === "rejected"
    ? 0
    : Math.floor(base * qMult * sMult * pMult * tMult * dMult * vMult);
  return {
    base,
    qualityMult: qMult,
    streakMult: sMult,
    pressureMult: pMult,
    transferMult: tMult,
    diminishingMult: dMult,
    verdictMult: vMult,
    final,
  };
}

export const VERDICT_LABEL: Record<CourtVerdict, string> = {
  rejected: "Rejected",
  accepted_minimum: "Accepted — Minimum",
  accepted_useful: "Accepted — Useful",
  accepted_strong: "Accepted — Strong",
  elite: "Elite Evidence",
};

export const TIER_LABEL: Record<number, string> = {
  1: "Contact Proof",
  2: "Output Proof",
  3: "Depth Proof",
  4: "Pressure Proof",
  5: "Transfer Proof",
  6: "Identity Proof",
};

/** Convenience: end-to-end preview of an unsubmitted proof. */
export function previewProof(opts: {
  content: string;
  quality: number;
  evidenceStrength?: string | null;
  pressureFlag?: boolean;
  transferFlag?: boolean;
  streakDays?: number;
  sameDomainCountToday?: number;
}) {
  const tier = classifyTier(opts);
  const vague = (opts.content || "").length < 40;
  const verdict = judgeCourt({ tier, quality: opts.quality, vague });
  const xp = computeXP({
    tier,
    quality: opts.quality,
    streakDays: opts.streakDays,
    pressureFlag: opts.pressureFlag,
    transferFlag: opts.transferFlag,
    verdict,
    sameDomainCountToday: opts.sameDomainCountToday,
  });
  return { tier, verdict, xp };
}
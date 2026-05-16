/**
 * Mode-specific scoring multipliers.
 *
 * Round 4 — keep this simple. Each mode declares a small bank of pattern
 * matchers run against a proof artifact's metadata (domain, content,
 * evidence_strength). Matches apply a multiplier or a flat bonus to the
 * proof's effective quality score.
 *
 * Anti-inflation rules:
 *  - multipliers are clamped to [0.5, 1.5]
 *  - bonuses are clamped per-proof to +/-2 quality points
 *  - shallow reflection (very short content) applies a penalty regardless of mode
 *  - shape never returns negative quality
 */

import { normaliseModeKey, type ModeKey } from "./mode-templates";

export interface ProofForScoring {
  content?: string | null;
  domain?: string | null;
  evidence_strength?: string | null;
  quality_score?: number | null;
}

type Rule = {
  test: (p: ProofForScoring) => boolean;
  /** Multiplicative effect on quality (1 = neutral). */
  multiplier?: number;
  /** Additive effect on quality (clamped). */
  bonus?: number;
  label: string;
};

const lower = (s: string | null | undefined) => (s ?? "").toLowerCase();

const RULES: Record<ModeKey, Rule[]> = {
  LAW_MAX: [
    {
      test: (p) => /\b(irac|issue|rule|application|conclusion)\b/i.test(p.content ?? ""),
      bonus: 1.5,
      label: "IRAC structure detected",
    },
    {
      test: (p) => /\b(s\.\s?\d+|v\.|\[\d{4}\]|HCA|NSWCA|UKSC)\b/.test(p.content ?? ""),
      bonus: 1,
      label: "authority cited",
    },
    {
      test: (p) => (p.content?.length ?? 0) < 120,
      multiplier: 0.7,
      label: "shallow legal reflection",
    },
  ],
  PSYCH_HD: [
    {
      test: (p) => /\b(et al\.?|\(\d{4}\)|peer.?reviewed|meta.?analysis)\b/i.test(p.content ?? ""),
      bonus: 1.5,
      label: "evidence integration",
    },
    {
      test: (p) => /\b(critique|limitation|however|whereas|in contrast)\b/i.test(p.content ?? ""),
      bonus: 1,
      label: "critique depth",
    },
    {
      test: (p) => (p.content?.length ?? 0) < 150,
      multiplier: 0.75,
      label: "shallow psych reflection",
    },
  ],
  SALES_CLOSE: [
    {
      test: (p) => /\b(objection|rebuttal|push.?back|hesitation)\b/i.test(p.content ?? ""),
      bonus: 1,
      label: "objection handling",
    },
    {
      test: (p) => /\b(attach|premium|upgrade|gse|warranty|protection)\b/i.test(p.content ?? ""),
      bonus: 1.5,
      label: "premium attachment",
    },
  ],
  EBLOCKI_BUILD: [
    {
      test: (p) => /\b(commit|pr|shipped|deploy|merged)\b/i.test(p.content ?? ""),
      bonus: 1,
      label: "shipped artifact",
    },
  ],
  ATHLETE_MODE: [
    {
      // Consistency bonus is awarded at the aggregate layer (computeMomentumScore);
      // here we reward explicit recovery adherence on the proof itself.
      test: (p) => /\b(recovery|mobility|sleep|rehab|rest)\b/i.test(p.content ?? ""),
      bonus: 1,
      label: "recovery adherence",
    },
    {
      test: (p) => /\b(drill|reps|technique|finishing|first.?touch)\b/i.test(p.content ?? ""),
      bonus: 0.75,
      label: "technical reps",
    },
  ],
  FINANCE_BASICS: [
    {
      test: (p) => /\b(budget|tracked|category|saved|invested)\b/i.test(p.content ?? ""),
      bonus: 0.5,
      label: "tracking discipline",
    },
  ],
  GENERAL_EXECUTION: [],
};

/**
 * Apply mode rules to a single proof. Returns an effective quality score
 * to be used in momentum aggregation. Original quality is preserved if
 * no rules apply.
 */
export function effectiveQuality(p: ProofForScoring, modeRaw: string | null | undefined): number {
  const base = typeof p.quality_score === "number" ? p.quality_score : 0;
  if (base <= 0) return base;
  const mode: ModeKey = normaliseModeKey(modeRaw ?? lower(p.domain));
  const rules = RULES[mode] ?? [];
  let mult = 1;
  let add = 0;
  for (const r of rules) {
    try {
      if (!r.test(p)) continue;
      if (r.multiplier) mult *= r.multiplier;
      if (r.bonus) add += r.bonus;
    } catch {
      /* defensive — never let a rule throw poison the score */
    }
  }
  // Clamp aggregates so a stacked match cannot blow up the score.
  mult = Math.max(0.5, Math.min(1.5, mult));
  add = Math.max(-2, Math.min(2, add));
  const out = base * mult + add;
  return Math.max(0, Math.min(10, out));
}

/** List the rule labels that fired — used by the coach + retro for transparency. */
export function explainScoring(p: ProofForScoring, modeRaw: string | null | undefined): string[] {
  const mode = normaliseModeKey(modeRaw ?? lower(p.domain));
  const rules = RULES[mode] ?? [];
  return rules.filter((r) => {
    try { return r.test(p); } catch { return false; }
  }).map((r) => r.label);
}
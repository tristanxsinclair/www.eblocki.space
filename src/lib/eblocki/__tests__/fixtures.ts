/**
 * Test fixtures — realistic proof / objective / momentum shapes for the
 * seven canonical user states. Used by unit tests AND the dev-only seeder
 * in EngineDebug.
 */

import type { ProofSample } from "../momentum";

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString();
};

export type FixtureKey =
  | "fresh"
  | "strong_streak"
  | "shallow"
  | "at_risk"
  | "recovery"
  | "mode_imbalanced"
  | "repeat_avoidance";

export const FIXTURES: Record<FixtureKey, { proofs: ProofSample[]; modeId: string; note: string }> = {
  fresh: {
    proofs: [],
    modeId: "GENERAL_EXECUTION",
    note: "New account, no data. Should see intro card, no fake analytics.",
  },
  strong_streak: {
    proofs: Array.from({ length: 8 }, (_, i) => ({
      created_at: day(i),
      quality_score: 7 + (i % 2),
      evidence_strength: i % 2 === 0 ? "elite" : "strong",
      domain: "law",
      content: "IRAC paragraph addressing issue, rule, application, conclusion. Cites s.5 of the Act.",
    })),
    modeId: "LAW_MAX",
    note: "8 day streak, high quality. Should classify 'elite' or 'momentum'.",
  },
  shallow: {
    proofs: Array.from({ length: 7 }, (_, i) => ({
      created_at: day(i),
      quality_score: 2,
      evidence_strength: "weak",
      domain: "general",
      content: "did stuff",
    })),
    modeId: "GENERAL_EXECUTION",
    note: "High volume, low quality. Velocity should be halved by depth penalty.",
  },
  at_risk: {
    proofs: [
      { created_at: day(1), quality_score: 6, evidence_strength: "strong", domain: "law", content: "IRAC paragraph drafted." },
      { created_at: day(2), quality_score: 7, evidence_strength: "strong", domain: "law", content: "Authority verification." },
      { created_at: day(3), quality_score: 6, evidence_strength: "strong", domain: "law", content: "Issue spotting." },
    ],
    modeId: "LAW_MAX",
    note: "3-day streak, no proof today. Should classify 'at_risk' and trigger streak_save objective.",
  },
  recovery: {
    proofs: [
      { created_at: day(4), quality_score: 5, evidence_strength: "strong", domain: "psychology", content: "CAEE paragraph with (Smith et al., 2018)." },
    ],
    modeId: "PSYCH_HD",
    note: "Broken streak, one old proof. Should classify 'recovery' and prescribe scope reduction.",
  },
  mode_imbalanced: {
    proofs: [
      ...Array.from({ length: 5 }, (_, i) => ({
        created_at: day(i),
        quality_score: 7,
        evidence_strength: "strong",
        domain: "law",
        content: "IRAC paragraph for tutorial problem.",
      })),
      { created_at: day(6), quality_score: 3, evidence_strength: "weak", domain: "psychology", content: "short note" },
    ],
    modeId: "LAW_MAX",
    note: "LAW strong, PSYCH lagging. Weekly retro should call out the imbalance.",
  },
  repeat_avoidance: {
    proofs: [
      { created_at: day(2), quality_score: 5, evidence_strength: "strong", domain: "law", content: "issue spotting only" },
    ],
    modeId: "LAW_MAX",
    note: "Repeated 'I keep avoiding law' messages should escalate coach specificity, not repeat.",
  },
};
import type { TemporalResult } from "./temporal-engine";

export type PlainVerdictLabel = "Counted" | "Needs upgrade" | "Did not count yet";

const STRENGTH_RANK: Record<string, number> = {
  elite: 4,
  strong: 3,
  moderate: 2,
  useful: 2,
  weak: 1,
  minimum: 1,
};

function strengthRank(value?: string | null): number {
  return STRENGTH_RANK[(value ?? "").toLowerCase()] ?? 0;
}

export function hasProofOnDate(
  artifacts: { created_at?: string | null }[],
  dateISO: string,
): boolean {
  return artifacts.some((artifact) => artifact.created_at?.slice(0, 10) === dateISO);
}

/**
 * Plain verdict for primary mobile surfaces. Maps internal strength/score
 * without exposing enum language like accepted_strong.
 */
export function plainVerdictLabel(
  strength?: string | null,
  score?: number | null,
): PlainVerdictLabel {
  const rank = strengthRank(strength);
  const numeric = typeof score === "number" && Number.isFinite(score) ? score : null;

  if (!strength && numeric == null) return "Did not count yet";
  if (rank >= 3 || (numeric != null && numeric >= 7)) return "Counted";
  if (rank >= 2 || (numeric != null && numeric >= 5)) return "Needs upgrade";
  return "Did not count yet";
}

export function plainEvidenceStrength(strength?: string | null): string {
  switch ((strength ?? "").toLowerCase()) {
    case "elite":
      return "elite proof";
    case "strong":
    case "accepted_strong":
      return "strong proof";
    case "moderate":
    case "useful":
      return "moderate proof";
    case "weak":
    case "minimum":
      return "weak proof";
    default:
      return "unscored proof";
  }
}

/** Compress internal risk tokens for a one-line mobile summary. */
export function plainRiskLine(risk: string): string {
  const cleaned = risk
    .replace(/accepted_strong/gi, "strong proof")
    .replace(/elite_evidence/gi, "elite proof")
    .replace(/identity escalation/gi, "standard raised")
    .replace(/_/g, " ")
    .trim();
  if (!cleaned) return "Interpretation will replace visible proof.";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Optional compressed forecast line — plain language only. */
export function compressForecastSummary(temporal: TemporalResult | null | undefined): string | null {
  if (!temporal?.hasEvidence) return null;
  const risk = plainRiskLine(temporal.risk.primaryFailureMode);
  const next = temporal.intervention.command.slice(0, 160).trim();
  return `Main risk: ${risk.replace(/\.$/, "")}. Next proof: ${next}`;
}

export const PROOF_DEFINITION_ONCE =
  "Proof means visible output: a paragraph, solved question, shipped change, sales insight, training reflection, or closed loop.";
import type { EvidenceStrength } from "./proof-scoring";

export interface VerdictIdentityImpact {
  strength: EvidenceStrength;
  headline: string;
  subtext: string;
  tone: "warn" | "neutral" | "good" | "elite";
}

/**
 * Maps a proof verdict's evidence strength to a plain-language identity-impact
 * headline. Doctrine: weak proof protects the streak, strong proof compounds
 * identity, elite proof raises the future standard. Deterministic — no AI.
 */
export function verdictIdentityImpact(
  strength: EvidenceStrength,
): VerdictIdentityImpact {
  switch (strength) {
    case "weak":
      return {
        strength,
        headline: "Minimum evidence — protects the streak, does not compound identity.",
        subtext:
          "Logged for honesty. Return tomorrow with stronger evidence to advance your standard.",
        tone: "warn",
      };
    case "moderate":
      return {
        strength,
        headline: "Useful evidence accepted.",
        subtext:
          "Real progress, not yet at the strong standard. One clear upgrade closes the gap.",
        tone: "neutral",
      };
    case "strong":
      return {
        strength,
        headline: "Strong evidence accepted — compounds identity.",
        subtext:
          "This artifact meets the standard. Repeat this quality to lock in the upgrade.",
        tone: "good",
      };
    case "elite":
      return {
        strength,
        headline: "Elite evidence accepted — raises the future standard.",
        subtext:
          "Your baseline just moved. Tomorrow, all submissions are measured against this level.",
        tone: "elite",
      };
  }
}
export function isEvidenceStrength(value: unknown): value is "weak" | "useful" | "strong" | "elite" {
  return (
    value === "weak" ||
    value === "useful" ||
    value === "strong" ||
    value === "elite"
  );
}

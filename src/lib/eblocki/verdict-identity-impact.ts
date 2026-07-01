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
        headline: "Weak proof — protects the streak, does not compound identity.",
        subtext:
          "Logged so you stay honest. Return tomorrow with a stronger artifact to move the identity line.",
        tone: "warn",
      };
    case "moderate":
      return {
        strength,
        headline: "Useful proof accepted.",
        subtext:
          "Real evidence, not elite yet. One upgrade to the required standard turns this into compounding proof.",
        tone: "neutral",
      };
    case "strong":
      return {
        strength,
        headline: "Strong proof — compounds identity.",
        subtext:
          "This artifact matches the standard. Repeat this quality to lock the new identity in.",
        tone: "good",
      };
    case "elite":
      return {
        strength,
        headline: "Elite proof — raises the future standard.",
        subtext:
          "Your baseline just moved up. Tomorrow's proof is measured against this level.",
        tone: "elite",
      };
  }
}
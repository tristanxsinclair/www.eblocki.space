import type { TemporalResult } from "./temporal-engine";
import { generateFutureNarrative } from "./future-narrative";

export interface TemporalCoachContext {
  generatedAt: string;
  primaryPath: string;
  currentPath: { growth: number; risk: number; identity: number };
  correctedPath: { growth: number; risk: number; identity: number };
  decayPath: { growth: number; risk: number; identity: number };
  escalationPath: { growth: number; risk: number; identity: number };
  mainRisk: string;
  proofRequired: string;
  blocked: string;
  confidence: { score: number; band: string };
  toneRecommendation: string;
  forbiddenClaims: string[];
  evidence: { artifacts7d: number; avgQuality: number; strongCount: number; eliteCount: number };
  uncertaintyWarning: string;
}

/**
 * Build a clean, AI-ready payload. Does NOT call an AI provider.
 * Callers can ship this directly to any model.
 */
export function buildTemporalCoachContext(r: TemporalResult): TemporalCoachContext {
  const n = generateFutureNarrative(r);
  return {
    generatedAt: r.generatedAt,
    primaryPath: r.primary,
    currentPath: r.trajectories.current_path.vector,
    correctedPath: r.trajectories.corrected_path.vector,
    decayPath: r.trajectories.decay_path.vector,
    escalationPath: r.trajectories.escalation_path.vector,
    mainRisk: r.risk.primaryFailureMode,
    proofRequired: r.intervention.command,
    blocked: r.intervention.blocked,
    confidence: { score: r.confidence.score, band: r.confidence.band },
    toneRecommendation:
      r.risk.drift > 60
        ? "blunt, intervention-oriented, low motivation"
        : r.confidence.band === "low"
          ? "measured, evidence-cautious, no escalation"
          : "direct, evidence-led, no praise without proof",
    forbiddenClaims: [
      "guaranteed success",
      "destiny language",
      "praise without proof",
      "identity escalation without evidence",
      "you are definitely going to",
      "this will 100% happen",
      "generic motivation",
      "advice that contradicts the Temporal Engine command",
    ],
    evidence: {
      artifacts7d: r.momentum.last7,
      avgQuality: r.momentum.avgQuality,
      strongCount: r.identity.strongCount,
      eliteCount: r.identity.eliteCount,
    },
    uncertaintyWarning: n.uncertaintyWarning,
  };
}
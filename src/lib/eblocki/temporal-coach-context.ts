import type { TemporalResult } from "./temporal-engine";
import { generateFutureNarrative } from "./future-narrative";
import type { TemporalCalibrationResult } from "./temporal-calibration";
import type { InterventionMemoryResult } from "./intervention-memory";
import type { TemporalIntelligenceScore } from "./temporal-intelligence-score";

export interface TemporalCoachContext {
  generatedAt: string;
  modelVersion: string;
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
  calibration?: {
    accuracyScore: number;
    forecastFollowed: boolean;
    riskOccurred: boolean | "unknown";
    explanation: string;
  };
  intelligence?: {
    score: number;
    level: string;
    strongestSignal: string;
    weakestSignal: string;
  };
  mostReliableIntervention?: string | null;
  commandToReinforce: string;
  confidenceExplanation: string[];
}

/**
 * Build a clean, AI-ready payload. Does NOT call an AI provider.
 * Callers can ship this directly to any model.
 */
export function buildTemporalCoachContext(
  r: TemporalResult,
  extras?: {
    calibration?: TemporalCalibrationResult;
    memory?: InterventionMemoryResult;
    intelligence?: TemporalIntelligenceScore;
  },
): TemporalCoachContext {
  const n = generateFutureNarrative(r);
  return {
    generatedAt: r.generatedAt,
    modelVersion: r.modelVersion,
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
      "ignoring low confidence",
      "ignoring a failed forecast",
      "telling the user to trust the prediction blindly",
    ],
    evidence: {
      artifacts7d: r.momentum.last7,
      avgQuality: r.momentum.avgQuality,
      strongCount: r.identity.strongCount,
      eliteCount: r.identity.eliteCount,
    },
    uncertaintyWarning: n.uncertaintyWarning,
    calibration: extras?.calibration
      ? {
          accuracyScore: extras.calibration.accuracyScore,
          forecastFollowed: extras.calibration.forecastFollowed,
          riskOccurred: extras.calibration.riskOccurred,
          explanation: extras.calibration.explanation,
        }
      : undefined,
    intelligence: extras?.intelligence
      ? {
          score: extras.intelligence.score,
          level: extras.intelligence.level,
          strongestSignal: extras.intelligence.strongestSignal,
          weakestSignal: extras.intelligence.weakestSignal,
        }
      : undefined,
    mostReliableIntervention: extras?.memory?.bestWorkingIntervention ?? null,
    commandToReinforce: r.intervention.command,
    confidenceExplanation: r.confidence.reasons ?? [r.confidence.rationale],
  };
}
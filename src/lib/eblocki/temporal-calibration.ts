/**
 * Eblocki Temporal Calibration Engine
 *
 * Compares forecasts (TemporalForecastSnapshot) against later behavioural
 * evidence (TemporalOutcome) and produces an advisory calibration result.
 *
 * No AI calls. No self-modifying weights. All adjustments are advisory.
 */

import {
  TEMPORAL_MODEL_VERSION,
  type TemporalResult,
  type TrajectoryName,
  type ProofArtifactLike,
  type VerdictLike,
  type LedgerLike,
} from "./temporal-engine";

export interface TemporalForecastSnapshot {
  modelVersion: string;
  generatedAt: string;
  predictionId: string;
  primaryPath: TrajectoryName;
  recommendedPath: TrajectoryName;
  confidenceScore: number;
  confidenceLevel: "low" | "moderate" | "high";
  mainRisk: string;
  mainRiskScore: number;
  mainOpportunity: string;
  proofRequired: string;
  artifactRequired: string;
  domain: string | null;
  horizonScores: { horizon: string; growth: number; risk: number }[];
  evidenceCount: number;
  trajectoryScores: Record<TrajectoryName, { growth: number; risk: number; identity: number; probability: number }>;
}

export interface TemporalOutcome {
  windowHours: number;
  artifactsAfter: ProofArtifactLike[];
  verdictsAfter: VerdictLike[];
  ledgerAfter: LedgerLike[];
}

export type TemporalAccuracySignal = "accurate" | "partially_accurate" | "inaccurate" | "insufficient_data";

export type TemporalForecastAuditOutcome =
  | "unresolved"
  | "hit"
  | "partial"
  | "missed";
export interface TemporalWeightAdjustmentSuggestion {
  factor: string;        // e.g. "risk.drift", "confidence.dataVolume"
  direction: "increase" | "decrease" | "hold";
  magnitude: "small" | "moderate" | "large";
  reason: string;
}

export interface TemporalLearningSignal {
  patternObserved: string;
  interventionWorked: boolean | null;
  nextObservationTarget: string;
}

export interface TemporalRealityCheck {
  verdict: TemporalAccuracySignal;
  reason: string;
  signalStrength: "weak" | "moderate" | "strong";
  nextObservationTarget: string;
}

export interface TemporalCalibrationResult {
  modelVersion: string;
  evaluatedAt: string;
  forecastFollowed: boolean;
  riskOccurred: boolean | "unknown";
  proofImproved: boolean;
  trajectoryImproved: boolean;
  accuracyScore: number;            // 0..100
  confidenceWasAppropriate: boolean;
  modelConfidenceAdjustment: number; // -0.2..+0.2 (advisory)
  suggestedWeightAdjustments: TemporalWeightAdjustmentSuggestion[];
  learningSignal: TemporalLearningSignal;
  realityCheck: TemporalRealityCheck;
  explanation: string;
  nextCalibrationTarget: string;
  auditOutcome: TemporalForecastAuditOutcome;
resolved: boolean;
accuracyEligible: boolean;
}

// ---------- snapshot creation ----------

function safeText(s: string, max = 180): string {
  return (s ?? "").slice(0, max);
}

/**
 * Build a coarse, privacy-safe snapshot from a TemporalResult.
 * Strips long proof text. Includes model version + predictionId.
 */
export function buildTemporalSnapshot(
  result: TemporalResult,
  predictionId?: string,
): TemporalForecastSnapshot {
  const horizonScores = result.visual.paths
    .find((p) => p.name === "current_path")
    ?.points.map((pt, i) => ({
      horizon: result.visual.horizons[i] ?? String(i),
      growth: Math.round(Math.max(0, pt.y)),
      risk: Math.round(Math.max(0, -pt.y)),
    })) ?? [];

  const trajectoryScores = {} as TemporalForecastSnapshot["trajectoryScores"];
  (Object.keys(result.trajectories) as TrajectoryName[]).forEach((k) => {
    const t = result.trajectories[k];
    trajectoryScores[k] = {
      growth: Math.round(t.vector.growth),
      risk: Math.round(t.vector.risk),
      identity: Math.round(t.vector.identity),
      probability: Math.round(t.probability * 100) / 100,
    };
  });

  return {
    modelVersion: result.modelVersion ?? TEMPORAL_MODEL_VERSION,
    generatedAt: result.generatedAt,
    predictionId:
      predictionId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pred_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    primaryPath: result.primary,
    recommendedPath: "corrected_path",
    confidenceScore: Math.round(result.confidence.score * 100) / 100,
    confidenceLevel: result.confidence.band,
    mainRisk: result.risk.primaryFailureMode,
    mainRiskScore: Math.round(result.risk.drift),
    mainOpportunity: safeText(result.trajectories.corrected_path.opportunity),
    proofRequired: safeText(result.intervention.command),
    artifactRequired: result.intervention.artifactRequired,
    domain: result.intervention.domain,
    horizonScores,
    evidenceCount: result.momentum.last30,
    trajectoryScores,
  };
}

// ---------- reality check ----------

function strengthRank(s?: string | null): number {
  switch ((s ?? "").toLowerCase()) {
    case "elite": return 4;
    case "strong": return 3;
    case "moderate":
    case "useful": return 2;
    case "weak":
    case "minimum": return 1;
    default: return 0;
  }
}

export function runTemporalRealityCheck(
  snapshot: TemporalForecastSnapshot,
  outcome: TemporalOutcome,
): TemporalRealityCheck {
  const arts = outcome.artifactsAfter ?? [];
  if (arts.length === 0) {
    return {
      verdict: "insufficient_data",
      reason: "No artifacts produced in observation window.",
      signalStrength: "weak",
      nextObservationTarget: "Submit any proof artifact to enable the next reality check.",
    };
  }

  const targetDomain = snapshot.domain;
  const matchedDomainCount = targetDomain
    ? arts.filter((a) => (a.domain ?? "").toLowerCase() === targetDomain.toLowerCase()).length
    : arts.length;

  const acceptedStrong = (outcome.verdictsAfter ?? []).filter(
    (v) => v.verdict === "accepted_strong" || v.verdict === "elite",
  ).length;

  const followed =
    (snapshot.artifactRequired === "accepted_strong" && acceptedStrong > 0) ||
    (snapshot.artifactRequired === "first_baseline_artifact" && arts.length > 0) ||
    (snapshot.artifactRequired === "depth_proof" &&
      arts.some((a) => strengthRank(a.evidence_strength) >= 3)) ||
    (snapshot.artifactRequired === "transfer_or_elite" &&
      arts.some((a) => a.transfer_flag || strengthRank(a.evidence_strength) === 4));

  const matchedTarget = !targetDomain || matchedDomainCount > 0;

  let verdict: TemporalAccuracySignal;
  let reason: string;
  if (followed && matchedTarget) {
    verdict = "accurate";
    reason = "User followed the corrected path and produced the required evidence.";
  } else if (matchedTarget || acceptedStrong > 0) {
    verdict = "partially_accurate";
    reason = "Partial follow-through. Some required evidence present.";
  } else {
    verdict = "inaccurate";
    reason = "Required artifact not produced; corrected path not taken.";
  }

  const signalStrength: "weak" | "moderate" | "strong" =
    arts.length >= 3 ? "strong" : arts.length === 2 ? "moderate" : "weak";

  return {
    verdict,
    reason,
    signalStrength,
    nextObservationTarget:
      verdict === "accurate"
        ? "Maintain cadence. Watch for inflation: ensure next proof carries new evidence."
        : verdict === "partially_accurate"
          ? `Close the gap in ${targetDomain ?? "the primary domain"} with one accepted_strong proof.`
          : "Produce the exact artifact the previous forecast requested.",
  };
}

export function toForecastAuditOutcome(
  verdict: TemporalAccuracySignal,
): TemporalForecastAuditOutcome {
  switch (verdict) {
    case "accurate":
      return "hit";
    case "partially_accurate":
      return "partial";
    case "inaccurate":
      return "missed";
    case "insufficient_data":
      return "unresolved";
  }
}

// ---------- calibration ----------

export function calibrateForecast(
  snapshot: TemporalForecastSnapshot,
  outcome: TemporalOutcome,
): TemporalCalibrationResult {
  const realityCheck = runTemporalRealityCheck(snapshot, outcome);
  const auditOutcome = toForecastAuditOutcome(realityCheck.verdict);
  const resolved = auditOutcome !== "unresolved";
  const accuracyEligible = resolved;

  const arts = outcome.artifactsAfter ?? [];
  const verdicts = outcome.verdictsAfter ?? [];

  const forecastFollowed = realityCheck.verdict === "accurate";
  const acceptedStrong = verdicts.filter(
    (v) => v.verdict === "accepted_strong" || v.verdict === "elite",
  ).length;
  
  const avgQualityAfter = arts.length
    ? arts.reduce((s, a) => s + (a.quality_score ?? 0), 0) / arts.length
    : 0;
  const proofImproved =
    arts.length > 0 && (avgQualityAfter >= 6 || acceptedStrong > 0);

  const trajectoryImproved =
    forecastFollowed || (proofImproved && (snapshot.mainRiskScore > 40 ? acceptedStrong > 0 : true));

  // riskOccurred: did the predicted main risk show up?
  let riskOccurred: boolean | "unknown";
  if (arts.length === 0) {
    riskOccurred = snapshot.mainRisk === "no_proof" || snapshot.mainRisk === "drift";
  } else if (snapshot.mainRisk === "shallow_proof") {
    riskOccurred = avgQualityAfter < 5;
  } else if (snapshot.mainRisk === "neglected_domain" && snapshot.domain) {
    riskOccurred = !arts.some((a) => (a.domain ?? "").toLowerCase() === snapshot.domain!.toLowerCase());
  } else if (snapshot.mainRisk === "overload") {
    riskOccurred = arts.length > 20;
  } else if (snapshot.mainRisk === "no_proof" || snapshot.mainRisk === "drift") {
    riskOccurred = arts.length === 0;
  } else {
    riskOccurred = "unknown";
  }

  // accuracyScore
  let accuracyScore = 50;
  if (realityCheck.verdict === "accurate") accuracyScore = 85;
  else if (realityCheck.verdict === "partially_accurate") accuracyScore = 60;
  else if (realityCheck.verdict === "inaccurate") accuracyScore = 25;
  else accuracyScore = 40;
  if (proofImproved) accuracyScore += 5;
  if (riskOccurred === true && snapshot.mainRiskScore > 40) accuracyScore += 5;
  if (riskOccurred === false && snapshot.confidenceLevel === "high") accuracyScore += 5;
  accuracyScore = Math.max(0, Math.min(100, accuracyScore));

  // confidence appropriateness
  const confidenceWasAppropriate =
    (snapshot.confidenceLevel === "low" && realityCheck.signalStrength !== "strong") ||
    (snapshot.confidenceLevel === "high" && realityCheck.verdict === "accurate") ||
    snapshot.confidenceLevel === "moderate";

  // advisory model confidence adjustment
  let modelConfidenceAdjustment = 0;
  if (snapshot.confidenceLevel === "high" && realityCheck.verdict === "inaccurate")
    modelConfidenceAdjustment = -0.15;
  else if (snapshot.confidenceLevel === "low" && realityCheck.verdict === "accurate")
    modelConfidenceAdjustment = +0.1;

  const suggestedWeightAdjustments: TemporalWeightAdjustmentSuggestion[] = [];
  if (riskOccurred === false && snapshot.mainRiskScore > 60) {
    suggestedWeightAdjustments.push({
      factor: `risk.${snapshot.mainRisk}`,
      direction: "decrease",
      magnitude: "small",
      reason: "Risk over-predicted: predicted main risk did not materialise.",
    });
  }
  if (riskOccurred === true && snapshot.mainRiskScore < 40) {
    suggestedWeightAdjustments.push({
      factor: `risk.${snapshot.mainRisk}`,
      direction: "increase",
      magnitude: "small",
      reason: "Risk under-predicted: actual behaviour confirmed the risk.",
    });
  }
  if (snapshot.confidenceLevel === "high" && realityCheck.verdict === "inaccurate") {
    suggestedWeightAdjustments.push({
      factor: "confidence.dataVolume",
      direction: "decrease",
      magnitude: "moderate",
      reason: "Confidence was too high relative to outcome.",
    });
  }

  const learningSignal: TemporalLearningSignal = {
    patternObserved: forecastFollowed
      ? `Intervention "${snapshot.artifactRequired}" was followed and proof improved.`
      : `Intervention "${snapshot.artifactRequired}" not executed; ${snapshot.mainRisk} risk persisted.`,
    interventionWorked:
      arts.length === 0 ? null : forecastFollowed && proofImproved,
    nextObservationTarget: realityCheck.nextObservationTarget,
  };

  const explanation =
    realityCheck.verdict === "insufficient_data"
      ? "Not enough new evidence to calibrate this forecast."
      : `Forecast accuracy ${accuracyScore}/100. ${realityCheck.reason} Risk occurred: ${String(riskOccurred)}. Proof improved: ${proofImproved}.`;

  return {
    modelVersion: snapshot.modelVersion,
    evaluatedAt: new Date().toISOString(),
    forecastFollowed,
    riskOccurred,
    proofImproved,
    trajectoryImproved,
    accuracyScore,
    confidenceWasAppropriate,
    modelConfidenceAdjustment,
    suggestedWeightAdjustments,
    learningSignal,
    realityCheck,
    explanation,
    auditOutcome,
    resolved,
    accuracyEligible,
    nextCalibrationTarget:
      realityCheck.verdict === "accurate"
        ? "Track whether the next forecast sustains accuracy across a 7-day window."
        : "Re-run the corrected-path command and observe whether risk score declines.",
  };
}
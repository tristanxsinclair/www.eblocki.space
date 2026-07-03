/**
 * Eblocki Temporal Intelligence Score
 *
 * How much does the system know about this user's behavioural trajectory?
 * Not user intelligence — system calibration depth.
 */

import type { TemporalResult } from "./temporal-engine";
import type { TemporalCalibrationResult } from "./temporal-calibration";
import type { InterventionMemoryResult } from "./intervention-memory";


export type TemporalIntelligenceLevel =
  | "dormant"
  | "forming"
  | "learning"
  | "sharp"
  | "highly_calibrated";

export interface TemporalIntelligenceScore {
  modelVersion: string;
  score: number; // 0..100
  level: TemporalIntelligenceLevel;
  components: {
    dataVolume: number;
    forecastAccuracy: number;
    proofConsistency: number;
    signalClarity: number;
    interventionResponse: number;
    domainCoverage: number;
    calibrationDepth: number;
  };
  strongestSignal: string;
  weakestSignal: string;
  whatRaisesScore: string;
  whatLowersScore: string;
  nextObservationTarget: string;
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function computeTemporalIntelligenceScore(args: {
  result: TemporalResult;
  calibrations?: TemporalCalibrationResult[];
  memory?: InterventionMemoryResult;
}): TemporalIntelligenceScore {
  const { result, calibrations = [], memory } = args;

  const resolvedCalibrations = calibrations.filter(
    (calibration) => calibration.accuracyEligible !== false,
  );

  const dataVolume = clamp(result.momentum.last30 * 5);
  const forecastAccuracy = resolvedCalibrations.length
    ? clamp(
        resolvedCalibrations.reduce(
          (sum, calibration) => sum + calibration.accuracyScore,
          0,
        ) / resolvedCalibrations.length,
      )
    : 0;
  const proofConsistency = clamp(result.momentum.consistency * 100);
  const signalClarity = clamp((result.confidence.signalClaritySignal ?? 0) * 6);
  const interventionResponse = memory ? clamp(memory.interventionReliabilityScore) : 0;
  const domainCoverage = result.domains.length
    ? clamp(
        100 -
          (result.domains.filter((domain) => domain.neglected).length /
            result.domains.length) *
            100,
      )
    : 0;
  const calibrationDepth = clamp(resolvedCalibrations.length * 12);

  const score = Math.round(
    dataVolume * 0.2 +
      forecastAccuracy * 0.2 +
      proofConsistency * 0.15 +
      signalClarity * 0.15 +
      interventionResponse * 0.15 +
      domainCoverage * 0.1 +
      calibrationDepth * 0.05,
  );

  const level: TemporalIntelligenceLevel =
    score < 20 ? "dormant" :
    score < 40 ? "forming" :
    score < 60 ? "learning" :
    score < 80 ? "sharp" : "highly_calibrated";

  const components = {
    dataVolume, forecastAccuracy, proofConsistency, signalClarity,
    interventionResponse, domainCoverage, calibrationDepth,
  };
  const entries = Object.entries(components) as [keyof typeof components, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strongestSignal = sorted[0][0];
  const weakestSignal = sorted[sorted.length - 1][0];

  return {
    modelVersion: result.modelVersion,
    score,
    level,
    components,
    strongestSignal,
    weakestSignal,
    whatRaisesScore:
      weakestSignal === "dataVolume"
        ? "Submit more proof artifacts (volume of evidence)."
        : weakestSignal === "forecastAccuracy"
          ? "Follow corrected paths so the calibration engine can confirm accuracy."
          : weakestSignal === "proofConsistency"
            ? "Sustain a daily proof cadence — gaps weaken signal."
            : weakestSignal === "signalClarity"
              ? "Produce at least one accepted_strong proof."
              : weakestSignal === "interventionResponse"
                ? "Execute the recommended intervention so reliability can be measured."
                : weakestSignal === "domainCoverage"
                  ? "Touch every active domain at least once per week."
                  : "Run more calibration cycles — proof + reality check.",
    whatLowersScore:
      "Skipped proof days, ignored corrected-path commands, single-domain bias, and missing evidence metadata.",
    nextObservationTarget: memory?.nextRecommendedIntervention
      ? `Execute "${memory.nextRecommendedIntervention}" intervention next.`
      : result.intervention.command,
  };
}
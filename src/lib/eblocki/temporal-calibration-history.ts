import type { ProofArtifactLike, VerdictLike } from "./temporal-engine";
import { calibrateForecast } from "./temporal-calibration";
import { normaliseTemporalSnapshot, type TemporalSnapshotPathName, type TemporalSnapshotPayload } from "./temporal-snapshot";

export type TemporalConfidenceTrend = "not_enough_data" | "rising" | "falling" | "stable";

export interface TemporalCalibrationHistoryProof extends ProofArtifactLike {
  temporal_snapshot?: unknown;
}

export interface TemporalCalibrationHistoryForecast {
  predictionId: string;
  path: TemporalSnapshotPathName;
  recommendedPath: TemporalSnapshotPathName;
  accuracyScore: number;
  riskKind: string;
  confidenceLevel: string;
  generatedAt: string;
}

export interface TemporalCalibrationHistorySummary {
  totalForecasts: number;
  calibratedForecasts: number;
  averageAccuracy: number;
  bestForecast: TemporalCalibrationHistoryForecast | null;
  weakestForecast: TemporalCalibrationHistoryForecast | null;
  mostCommonRisk: string | null;
  mostReliablePath: TemporalSnapshotPathName | null;
  confidenceTrend: TemporalConfidenceTrend;
  summary: string;
}

function dateMs(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function accuracyBucket(score: number): string {
  if (score >= 75) return "strong";
  if (score >= 50) return "mixed";
  return "weak";
}

export function buildTemporalCalibrationHistory(
  proofs: TemporalCalibrationHistoryProof[] = [],
  verdicts: VerdictLike[] = [],
): TemporalCalibrationHistorySummary {
  const sorted = [...proofs].sort((a, b) => dateMs(a.created_at) - dateMs(b.created_at));
  const snapshotRows = sorted
    .map((proof) => ({ proof, snapshot: normaliseTemporalSnapshot(proof.temporal_snapshot) }))
    .filter((entry): entry is { proof: TemporalCalibrationHistoryProof; snapshot: TemporalSnapshotPayload } => entry.snapshot !== null);

  const riskCounts = new Map<string, number>();
  const pathScores = new Map<TemporalSnapshotPathName, number[]>();
  const calibrated: TemporalCalibrationHistoryForecast[] = [];

  for (const { proof, snapshot } of snapshotRows) {
    riskCounts.set(snapshot.mainRisk, (riskCounts.get(snapshot.mainRisk) ?? 0) + 1);
    const after = sorted.filter((candidate) => dateMs(candidate.created_at) > dateMs(proof.created_at));
    if (after.length === 0) continue;

    try {
      const calibration = calibrateForecast(snapshot, {
        windowHours: 24,
        artifactsAfter: after,
        verdictsAfter: verdicts.filter((verdict) => dateMs(verdict.created_at) > dateMs(proof.created_at)),
        ledgerAfter: [],
      });
      const forecast: TemporalCalibrationHistoryForecast = {
        predictionId: snapshot.predictionId,
        path: snapshot.primaryPath,
        recommendedPath: snapshot.recommendedPath,
        accuracyScore: calibration.accuracyScore,
        riskKind: snapshot.mainRisk,
        confidenceLevel: snapshot.confidenceLevel,
        generatedAt: snapshot.generatedAt,
      };
      calibrated.push(forecast);
      const scores = pathScores.get(snapshot.recommendedPath) ?? [];
      scores.push(calibration.accuracyScore);
      pathScores.set(snapshot.recommendedPath, scores);
    } catch {
      // Legacy snapshots stay readable, but invalid calibration pairs are ignored.
    }
  }

  const averageAccuracy = calibrated.length
    ? Math.round(calibrated.reduce((sum, item) => sum + item.accuracyScore, 0) / calibrated.length)
    : 0;
  const ordered = [...calibrated].sort((a, b) => b.accuracyScore - a.accuracyScore);
  const commonRisk = [...riskCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostReliablePath = [...pathScores.entries()]
    .map(([path, scores]) => ({ path, avg: scores.reduce((sum, score) => sum + score, 0) / scores.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.path ?? null;

  let confidenceTrend: TemporalConfidenceTrend = "not_enough_data";
  if (calibrated.length >= 2) {
    const first = calibrated[0].accuracyScore;
    const last = calibrated[calibrated.length - 1].accuracyScore;
    confidenceTrend = last - first > 8 ? "rising" : first - last > 8 ? "falling" : "stable";
  }

  const summary = snapshotRows.length === 0
    ? "No stored forecasts yet. Temporal calibration is waiting for snapshot evidence."
    : calibrated.length === 0
      ? "Forecasts exist, but later proof is needed before calibration can judge accuracy."
      : `${calibrated.length}/${snapshotRows.length} forecasts calibrated. Average accuracy is ${averageAccuracy}/100 (${accuracyBucket(averageAccuracy)} signal).`;

  return {
    totalForecasts: snapshotRows.length,
    calibratedForecasts: calibrated.length,
    averageAccuracy,
    bestForecast: ordered[0] ?? null,
    weakestForecast: ordered[ordered.length - 1] ?? null,
    mostCommonRisk: commonRisk,
    mostReliablePath,
    confidenceTrend,
    summary,
  };
}

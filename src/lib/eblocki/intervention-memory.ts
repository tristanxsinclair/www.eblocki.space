/**
 * Eblocki Intervention Effectiveness Memory
 *
 * Deterministic. No AI. Aggregates calibration history to identify which
 * intervention archetypes most reliably produced proof + risk reduction.
 */

import type { TemporalCalibrationResult } from "./temporal-calibration";

export interface InterventionRecord {
  artifactRequired: string;        // e.g. "accepted_strong"
  domain: string | null;
  followed: boolean;
  proofImproved: boolean;
  trajectoryImproved: boolean;
  accuracyScore: number;
  evaluatedAt: string;
}

export interface InterventionMemoryResult {
  totalEvaluations: number;
  bestWorkingIntervention: string | null;
  weakestIntervention: string | null;
  interventionReliabilityScore: number; // 0..100
  nextRecommendedIntervention: string | null;
  reason: string;
  byArchetype: {
    archetype: string;
    runs: number;
    successRate: number;
    avgAccuracy: number;
  }[];
}

export function summariseInterventionMemory(
  records: InterventionRecord[],
): InterventionMemoryResult {
  if (!records.length) {
    return {
      totalEvaluations: 0,
      bestWorkingIntervention: null,
      weakestIntervention: null,
      interventionReliabilityScore: 0,
      nextRecommendedIntervention: null,
      reason: "No calibration history yet. Reliability score will rise after the next reality check.",
      byArchetype: [],
    };
  }

  const groups = new Map<string, InterventionRecord[]>();
  for (const r of records) {
    const key = r.artifactRequired || "unspecified";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const byArchetype = Array.from(groups.entries()).map(([archetype, rs]) => {
    const successes = rs.filter((r) => r.followed && r.proofImproved).length;
    return {
      archetype,
      runs: rs.length,
      successRate: Math.round((successes / rs.length) * 100) / 100,
      avgAccuracy: Math.round(rs.reduce((s, r) => s + r.accuracyScore, 0) / rs.length),
    };
  });

  const sorted = [...byArchetype].sort(
    (a, b) => b.successRate - a.successRate || b.avgAccuracy - a.avgAccuracy,
  );

  const best = sorted[0] ?? null;
  const worst = sorted[sorted.length - 1] ?? null;

  const reliability = Math.round(
    (records.filter((r) => r.followed && r.proofImproved).length / records.length) * 100,
  );

  return {
    totalEvaluations: records.length,
    bestWorkingIntervention: best?.archetype ?? null,
    weakestIntervention: worst && worst !== best ? worst.archetype : null,
    interventionReliabilityScore: reliability,
    nextRecommendedIntervention: best?.archetype ?? null,
    reason: best
      ? `"${best.archetype}" followed-through in ${Math.round(best.successRate * 100)}% of attempts (avg accuracy ${best.avgAccuracy}/100).`
      : "Not enough signal.",
    byArchetype,
  };
}

/** Convenience: build a record from a calibration result + snapshot fields. */
export function recordFromCalibration(
  artifactRequired: string,
  domain: string | null,
  cal: TemporalCalibrationResult,
): InterventionRecord {
  return {
    artifactRequired,
    domain,
    followed: cal.forecastFollowed,
    proofImproved: cal.proofImproved,
    trajectoryImproved: cal.trajectoryImproved,
    accuracyScore: cal.accuracyScore,
    evaluatedAt: cal.evaluatedAt,
  };
}
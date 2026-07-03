import type { Json } from "@/integrations/supabase/types";
import { TEMPORAL_MODEL_VERSION, type TemporalResult } from "./temporal-engine";

export const TEMPORAL_SNAPSHOT_VERSION = "temporal-snapshot-v1";

export type TemporalSnapshotPathName =
  | "current_path"
  | "corrected_path"
  | "decay_path"
  | "escalation_path";

export type TemporalSnapshotConfidenceLevel = "low" | "moderate" | "high";

export interface TemporalSnapshotHorizonScore extends Record<string, Json | undefined> {
  horizon: string;
  growth: number;
  risk: number;
}

export interface TemporalSnapshotTrajectoryScore extends Record<string, Json | undefined> {
  growth: number;
  risk: number;
  identity: number;
  probability: number;
}

export interface TemporalSnapshotPayload extends Record<string, Json | undefined> {
  snapshotVersion: typeof TEMPORAL_SNAPSHOT_VERSION;
  modelVersion: string;
  generatedAt: string;
  predictionId: string;
  primaryPath: TemporalSnapshotPathName;
  recommendedPath: TemporalSnapshotPathName;
  confidenceScore: number;
  confidenceLevel: TemporalSnapshotConfidenceLevel;
  mainRisk: string;
  mainRiskScore: number;
  mainOpportunity: string;
  proofRequired: string;
  artifactRequired: string;
  domain: string | null;
  horizonScores: TemporalSnapshotHorizonScore[];
  evidenceCount: number;
  trajectoryScores: Record<TemporalSnapshotPathName, TemporalSnapshotTrajectoryScore>;
}

export interface TemporalSnapshotSummary {
  exists: boolean;
  valid: boolean;
  modelVersion: string | null;
  generatedAt: string | null;
  primaryPath: TemporalSnapshotPathName | null;
  recommendedPath: TemporalSnapshotPathName | null;
  confidenceLevel: TemporalSnapshotConfidenceLevel | null;
  mainRisk: string | null;
  evidenceCount: number;
  reason: string;
}

const PATHS: TemporalSnapshotPathName[] = [
  "current_path",
  "corrected_path",
  "decay_path",
  "escalation_path",
];
const CONFIDENCE_LEVELS: TemporalSnapshotConfidenceLevel[] = ["low", "moderate", "high"];
const MAX_SAFE_TEXT = 180;
const SENSITIVE_KEY_PATTERN = /(content|description|note|reflection|secret|token|password|attachment|ocr|transcript|free.?text|raw)/i;

const emptyTrajectoryScores = (): Record<TemporalSnapshotPathName, TemporalSnapshotTrajectoryScore> => ({
  current_path: { growth: 0, risk: 0, identity: 0, probability: 0 },
  corrected_path: { growth: 0, risk: 0, identity: 0, probability: 0 },
  decay_path: { growth: 0, risk: 0, identity: 0, probability: 0 },
  escalation_path: { growth: 0, risk: 0, identity: 0, probability: 0 },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clamp(n: unknown, lo = 0, hi = 100): number {
  const value = typeof n === "number" && Number.isFinite(n) ? n : Number(n);
  if (!Number.isFinite(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

function safeString(value: unknown, fallback: string, max = MAX_SAFE_TEXT): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max) || fallback;
}

function safeDateString(value: unknown): string {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date(0).toISOString();
}

function safePath(value: unknown, fallback: TemporalSnapshotPathName): TemporalSnapshotPathName {
  return PATHS.includes(value as TemporalSnapshotPathName) ? (value as TemporalSnapshotPathName) : fallback;
}

function safeConfidence(value: unknown): TemporalSnapshotConfidenceLevel {
  return CONFIDENCE_LEVELS.includes(value as TemporalSnapshotConfidenceLevel)
    ? (value as TemporalSnapshotConfidenceLevel)
    : "low";
}

function jsonSafe(value: unknown): Json {
  if (value === null) return null;
  if (typeof value === "string") return value.slice(0, MAX_SAFE_TEXT);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (isRecord(value)) {
    const out: Record<string, Json> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (raw === undefined || SENSITIVE_KEY_PATTERN.test(key)) continue;
      out[key] = jsonSafe(raw);
    }
    return out;
  }
  return null;
}

function normaliseTrajectoryScores(input: unknown): Record<TemporalSnapshotPathName, TemporalSnapshotTrajectoryScore> {
  const source = isRecord(input) ? input : {};
  const scores = emptyTrajectoryScores();
  for (const path of PATHS) {
    const raw = isRecord(source[path]) ? source[path] : {};
    scores[path] = {
      growth: Math.round(clamp(raw.growth)),
      risk: Math.round(clamp(raw.risk)),
      identity: Math.round(clamp(raw.identity)),
      probability: Math.round(clamp(raw.probability, 0, 1) * 100) / 100,
    };
  }
  return scores;
}

function normaliseHorizonScores(input: unknown): TemporalSnapshotHorizonScore[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).map((item, index) => {
    const row = isRecord(item) ? item : {};
    return {
      horizon: safeString(row.horizon, String(index), 24),
      growth: Math.round(clamp(row.growth)),
      risk: Math.round(clamp(row.risk)),
    };
  });
}

function hasUnsafeString(value: unknown): boolean {
  if (typeof value === "string") return value.length > MAX_SAFE_TEXT;
  if (Array.isArray(value)) return value.some(hasUnsafeString);
  if (isRecord(value)) {
    return Object.entries(value).some(([key, raw]) => SENSITIVE_KEY_PATTERN.test(key) || hasUnsafeString(raw));
  }
  return false;
}

function makePredictionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `pred_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function isTemporalSnapshotPayload(value: unknown): value is TemporalSnapshotPayload {
  if (!isRecord(value)) return false;
  return (
    value.snapshotVersion === TEMPORAL_SNAPSHOT_VERSION &&
    typeof value.modelVersion === "string" &&
    value.modelVersion.length > 0 &&
    typeof value.generatedAt === "string" &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    typeof value.predictionId === "string" &&
    PATHS.includes(value.primaryPath as TemporalSnapshotPathName) &&
    PATHS.includes(value.recommendedPath as TemporalSnapshotPathName) &&
    CONFIDENCE_LEVELS.includes(value.confidenceLevel as TemporalSnapshotConfidenceLevel) &&
    typeof value.mainRisk === "string" &&
    typeof value.artifactRequired === "string" &&
    !hasUnsafeString(value)
  );
}

export function normaliseTemporalSnapshot(value: unknown): TemporalSnapshotPayload | null {
  if (!isRecord(value)) return null;

  const modelVersion = safeString(value.modelVersion, TEMPORAL_MODEL_VERSION, 80);
  const generatedAt = safeDateString(value.generatedAt);
  const primaryPath = safePath(value.primaryPath, "current_path");
  const recommendedPath = safePath(value.recommendedPath, "corrected_path");

  return {
    snapshotVersion: TEMPORAL_SNAPSHOT_VERSION,
    modelVersion,
    generatedAt,
    predictionId: safeString(value.predictionId, makePredictionId(), 80),
    primaryPath,
    recommendedPath,
    confidenceScore: Math.round(clamp(value.confidenceScore, 0, 1) * 100) / 100,
    confidenceLevel: safeConfidence(value.confidenceLevel),
    mainRisk: safeString(value.mainRisk, "unknown", 64),
    mainRiskScore: Math.round(clamp(value.mainRiskScore)),
    mainOpportunity: safeString(value.mainOpportunity, "No opportunity recorded."),
    proofRequired: safeString(value.proofRequired, "Submit one proof artifact."),
    artifactRequired: safeString(value.artifactRequired, "proof_artifact", 64),
    domain: typeof value.domain === "string" && value.domain.trim() ? value.domain.trim().slice(0, 64) : null,
    horizonScores: normaliseHorizonScores(value.horizonScores),
    evidenceCount: Math.round(clamp(value.evidenceCount, 0, 10000)),
    trajectoryScores: normaliseTrajectoryScores(value.trajectoryScores),
  };
}

export function buildTemporalSnapshotPayload(result: TemporalResult, predictionId?: string): TemporalSnapshotPayload {
  const trajectoryScores = emptyTrajectoryScores();
  for (const path of PATHS) {
    const trajectory = result.trajectories[path];
    trajectoryScores[path] = {
      growth: Math.round(clamp(trajectory?.vector.growth)),
      risk: Math.round(clamp(trajectory?.vector.risk)),
      identity: Math.round(clamp(trajectory?.vector.identity)),
      probability: Math.round(clamp(trajectory?.probability, 0, 1) * 100) / 100,
    };
  }

  const horizonScores = result.visual.paths
    .find((path) => path.name === "current_path")
    ?.points.map((point, index) => ({
      horizon: result.visual.horizons[index] ?? String(index),
      growth: Math.round(Math.max(0, point.y)),
      risk: Math.round(Math.max(0, -point.y)),
    })) ?? [];

  return {
    snapshotVersion: TEMPORAL_SNAPSHOT_VERSION,
    modelVersion: safeString(result.modelVersion, TEMPORAL_MODEL_VERSION, 80),
    generatedAt: safeDateString(result.generatedAt),
    predictionId: predictionId ?? makePredictionId(),
    primaryPath: safePath(result.primary, "current_path"),
    recommendedPath: "corrected_path",
    confidenceScore: Math.round(clamp(result.confidence.score, 0, 1) * 100) / 100,
    confidenceLevel: safeConfidence(result.confidence.band),
    mainRisk: safeString(result.risk.primaryFailureMode, "unknown", 64),
    mainRiskScore: Math.round(clamp(result.risk.drift)),
    mainOpportunity: safeString(result.trajectories.corrected_path?.opportunity, "Correct the path with proof."),
    proofRequired: safeString(result.intervention.command, "Submit one proof artifact."),
    artifactRequired: safeString(result.intervention.artifactRequired, "proof_artifact", 64),
    domain: result.intervention.domain ? result.intervention.domain.slice(0, 64) : null,
    horizonScores,
    evidenceCount: Math.round(clamp(result.momentum.last30, 0, 10000)),
    trajectoryScores,
  };
}

export function stripSensitiveTemporalSnapshotFields(value: unknown): TemporalSnapshotPayload | null {
  const normalised = normaliseTemporalSnapshot(jsonSafe(value));
  return normalised ? { ...normalised, proofRequired: normalised.proofRequired.slice(0, MAX_SAFE_TEXT) } : null;
}

export function getTemporalSnapshotSummary(value: unknown): TemporalSnapshotSummary {
  if (!value) {
    return {
      exists: false,
      valid: false,
      modelVersion: null,
      generatedAt: null,
      primaryPath: null,
      recommendedPath: null,
      confidenceLevel: null,
      mainRisk: null,
      evidenceCount: 0,
      reason: "No temporal snapshot stored.",
    };
  }

  const normalised = normaliseTemporalSnapshot(value);
  if (!normalised) {
    return {
      exists: true,
      valid: false,
      modelVersion: null,
      generatedAt: null,
      primaryPath: null,
      recommendedPath: null,
      confidenceLevel: null,
      mainRisk: null,
      evidenceCount: 0,
      reason: "Temporal snapshot is not an object and cannot be read.",
    };
  }

  const valid = isTemporalSnapshotPayload(value) || isTemporalSnapshotPayload(normalised);
  return {
    exists: true,
    valid,
    modelVersion: normalised.modelVersion,
    generatedAt: normalised.generatedAt,
    primaryPath: normalised.primaryPath,
    recommendedPath: normalised.recommendedPath,
    confidenceLevel: normalised.confidenceLevel,
    mainRisk: normalised.mainRisk,
    evidenceCount: normalised.evidenceCount,
    reason: valid ? "Temporal snapshot is readable." : "Temporal snapshot was normalised from legacy or invalid data.",
  };
}

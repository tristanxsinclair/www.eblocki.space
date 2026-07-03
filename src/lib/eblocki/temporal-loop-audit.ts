import type { ProofArtifactLike, TemporalResult, VerdictLike } from "./temporal-engine";
import {
  calibrateForecast,
  type TemporalCalibrationResult,
} from "./temporal-calibration";
import {
  getTemporalSnapshotSummary,
  isTemporalSnapshotPayload,
  normaliseTemporalSnapshot,
  stripSensitiveTemporalSnapshotFields,
  type TemporalSnapshotPayload,
} from "./temporal-snapshot";
import { recordFromCalibration, summariseInterventionMemory } from "./intervention-memory";
import { computeTemporalIntelligenceScore } from "./temporal-intelligence-score";

export type TemporalLoopAuditStatus = "inactive" | "partial" | "operational" | "degraded";

export interface TemporalLoopAuditFinding {
  ability: string;
  ok: boolean;
  severity: "info" | "warning" | "error";
  message: string;
  detail?: string;
}

export interface TemporalLoopProofRow extends ProofArtifactLike {
  temporal_snapshot?: unknown;
}

export interface TemporalLoopAuditInput {
  forecast?: TemporalResult | null;
  proofRows?: TemporalLoopProofRow[] | null;
  verdicts?: VerdictLike[] | null;
  calibrations?: TemporalCalibrationResult[] | null;
  dashboardCanShowEmptyState?: boolean;
}

export interface TemporalLoopAuditResult {
  status: TemporalLoopAuditStatus;
  findings: TemporalLoopAuditFinding[];
  missingPieces: string[];
  nextFix: string;
  userSafeSummary: string;
  developerSafeSummary: string;
}

interface SnapshotCandidate {
  row: TemporalLoopProofRow;
  snapshot: TemporalSnapshotPayload;
  strictValid: boolean;
}

function dateMs(value?: string): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function addFinding(
  findings: TemporalLoopAuditFinding[],
  ability: string,
  ok: boolean,
  message: string,
  detail?: string,
  severity: TemporalLoopAuditFinding["severity"] = ok ? "info" : "warning",
) {
  findings.push({ ability, ok, message, detail, severity: ok ? "info" : severity });
}

function snapshotPrivacySafe(snapshot: TemporalSnapshotPayload | null): boolean {
  if (!snapshot) return false;
  const stripped = stripSensitiveTemporalSnapshotFields(snapshot);
  if (!stripped) return false;
  const serialised = JSON.stringify(stripped).toLowerCase();
  return !/(content|reflection|secret|token|password|attachment|ocr|transcript|raw proof|personal note)/.test(serialised);
}

function userSummary(status: TemporalLoopAuditStatus): string {
  switch (status) {
    case "inactive":
      return "Temporal loop is waiting for proof evidence.";
    case "partial":
      return "Temporal loop has a forecast but needs later proof for calibration.";
    case "operational":
      return "Temporal loop is comparing prediction against reality.";
    case "degraded":
      return "Temporal loop detected missing or invalid snapshot data.";
  }
}

export function auditTemporalLoop(input: TemporalLoopAuditInput = {}): TemporalLoopAuditResult {
  const forecast = input.forecast ?? null;
  const proofRows = [...(input.proofRows ?? [])].sort((a, b) => dateMs(b.created_at) - dateMs(a.created_at));
  const verdicts = input.verdicts ?? [];
  const findings: TemporalLoopAuditFinding[] = [];
  const missingPieces: string[] = [];

  const forecastOk = !!forecast;
  addFinding(
    findings,
    "forecast_generation",
    forecastOk,
    forecastOk ? "Temporal forecast can be generated." : "Temporal forecast has not been generated yet.",
  );
  if (!forecastOk) missingPieces.push("temporal forecast");

  const builtSnapshot = forecast ? stripSensitiveTemporalSnapshotFields({
    snapshotVersion: "temporal-snapshot-v1",
    modelVersion: forecast.modelVersion,
    generatedAt: forecast.generatedAt,
    predictionId: "audit_preview",
    primaryPath: forecast.primary,
    recommendedPath: "corrected_path",
    confidenceScore: forecast.confidence.score,
    confidenceLevel: forecast.confidence.band,
    mainRisk: forecast.risk.primaryFailureMode,
    mainRiskScore: forecast.risk.drift,
    mainOpportunity: forecast.trajectories.corrected_path.opportunity,
    proofRequired: forecast.intervention.command,
    artifactRequired: forecast.intervention.artifactRequired,
    domain: forecast.intervention.domain,
    horizonScores: [],
    evidenceCount: forecast.momentum.last30,
    trajectoryScores: {
      current_path: { ...forecast.trajectories.current_path.vector, probability: forecast.trajectories.current_path.probability },
      corrected_path: { ...forecast.trajectories.corrected_path.vector, probability: forecast.trajectories.corrected_path.probability },
      decay_path: { ...forecast.trajectories.decay_path.vector, probability: forecast.trajectories.decay_path.probability },
      escalation_path: { ...forecast.trajectories.escalation_path.vector, probability: forecast.trajectories.escalation_path.probability },
    },
  }) : null;
  const snapshotBuildOk = !!builtSnapshot;
  addFinding(
    findings,
    "snapshot_build",
    snapshotBuildOk,
    snapshotBuildOk ? "Snapshot can be built from the current forecast." : "Snapshot cannot be built until a forecast exists.",
  );
  if (!snapshotBuildOk) missingPieces.push("snapshot build");

  const privacyOk = snapshotPrivacySafe(builtSnapshot);
  addFinding(
    findings,
    "snapshot_privacy",
    privacyOk,
    privacyOk ? "Snapshot is coarse and privacy-safe." : "Snapshot privacy safety could not be confirmed.",
    undefined,
    "error",
  );
  if (!privacyOk) missingPieces.push("privacy-safe snapshot");

  const candidates: SnapshotCandidate[] = [];
  const invalidSnapshotRows = proofRows.filter((row) => {
    if (!row.temporal_snapshot) return false;
    const normalised = normaliseTemporalSnapshot(row.temporal_snapshot);
    if (normalised) {
      candidates.push({ row, snapshot: normalised, strictValid: isTemporalSnapshotPayload(row.temporal_snapshot) });
      return false;
    }
    return true;
  });
  const strictInvalidCount = candidates.filter((candidate) => !candidate.strictValid).length + invalidSnapshotRows.length;
  const latestSnapshot = candidates[0] ?? null;

  addFinding(
    findings,
    "snapshot_read",
    !!latestSnapshot,
    latestSnapshot ? "Snapshot can be read from proof rows." : "No readable snapshot found on proof rows.",
  );
  if (!latestSnapshot) missingPieces.push("stored snapshot");

  const laterProof = latestSnapshot
    ? proofRows.filter((row) => dateMs(row.created_at) > dateMs(latestSnapshot.row.created_at))
    : [];
  addFinding(
    findings,
    "later_proof_compare",
    laterProof.length > 0,
    laterProof.length > 0 ? "Later proof can be compared against the snapshot." : "No later proof exists after the latest snapshot.",
  );
  if (!laterProof.length) missingPieces.push("later proof after snapshot");

  let calibration: TemporalCalibrationResult | null = input.calibrations?.[0] ?? null;
  if (!calibration && latestSnapshot) {
    try {
      const snapshotAt = latestSnapshot.row.created_at;
      calibration = calibrateForecast(latestSnapshot.snapshot, {
        windowHours: 24,
        artifactsAfter: laterProof,
        verdictsAfter: verdicts.filter((v) => dateMs(v.created_at) > dateMs(snapshotAt)),
        ledgerAfter: [],
      });
    } catch {
      calibration = null;
    }
  }

  addFinding(
    findings,
    "calibration_classification",
  !!calibration && calibration.resolved,
  calibration?.resolved
    ? "Calibration can classify the outcome."
    : "Calibration is awaiting later proof before it can classify the outcome.",
);

if (!calibration?.resolved) {
  missingPieces.push("resolved calibration result");

  addFinding(
    findings,
    "reality_check",
    !!calibration?.realityCheck,
    calibration?.realityCheck ? "Reality check can judge forecast accuracy." : "Reality check is waiting for calibration data.",
  );
  if (!calibration?.realityCheck) missingPieces.push("reality check");

  const memory = calibration && latestSnapshot
    ? summariseInterventionMemory([
        recordFromCalibration(latestSnapshot.snapshot.artifactRequired, latestSnapshot.snapshot.domain, calibration),
      ])
    : null;
  addFinding(
    findings,
    "intervention_memory",
    !!memory && memory.totalEvaluations > 0,
    memory && memory.totalEvaluations > 0
      ? "Intervention memory can learn from the outcome."
      : "Intervention memory needs at least one completed calibration.",
  );
  if (!memory || memory.totalEvaluations === 0) missingPieces.push("intervention memory record");

  const intelligence = forecast
    ? computeTemporalIntelligenceScore({
        result: forecast,
        calibrations: calibration ? [calibration] : [],
        memory: memory ?? undefined,
      })
    : null;
  addFinding(
    findings,
    "intelligence_score",
    !!intelligence,
    intelligence ? "Temporal Intelligence Score can be calculated." : "Temporal Intelligence Score needs a forecast.",
  );
  if (!intelligence) missingPieces.push("temporal intelligence score");

  const emptyStateOk = input.dashboardCanShowEmptyState !== false;
  addFinding(
    findings,
    "dashboard_empty_states",
    emptyStateOk,
    emptyStateOk ? "Dashboard can show safe empty states." : "Dashboard empty state handling was not confirmed.",
  );
  if (!emptyStateOk) missingPieces.push("dashboard empty state");

  let status: TemporalLoopAuditStatus;
  if (strictInvalidCount > 0) status = "degraded";
  else if (!forecast?.hasEvidence && proofRows.length === 0) status = "inactive";
  else if (
    forecastOk &&
    snapshotBuildOk &&
    privacyOk &&
    !!latestSnapshot &&
    laterProof.length > 0 &&
    !!calibration &&
    !!calibration.realityCheck &&
    !!memory &&
    !!intelligence &&
    emptyStateOk
  ) status = "operational";
  else status = "partial";

  if (status === "degraded") {
    addFinding(
      findings,
      "snapshot_data_quality",
      false,
      "One or more stored temporal snapshots are invalid or legacy-shaped.",
      `${strictInvalidCount} snapshot row(s) require validator normalisation or migration.`,
      "error",
    );
  }

  const uniqueMissing = Array.from(new Set(missingPieces));
  const nextFix = status === "inactive"
    ? "Submit one proof artifact so the loop has evidence."
    : status === "degraded"
      ? "Inspect the latest temporal_snapshot row and pass it through the runtime validator before calibration."
      : uniqueMissing[0]
        ? `Add missing piece: ${uniqueMissing[0]}.`
        : "Keep collecting proof and reality checks.";

  const snapshotSummary = getTemporalSnapshotSummary(latestSnapshot?.snapshot ?? null);
  const developerSafeSummary = [
    `status=${status}`,
    `findings=${findings.length}`,
    `missing=${uniqueMissing.join(", ") || "none"}`,
    `snapshots=${candidates.length}`,
    `invalidSnapshots=${strictInvalidCount}`,
    `snapshotModel=${snapshotSummary.modelVersion ?? "none"}`,
  ].join("; ");

  return {
    status,
    findings,
    missingPieces: uniqueMissing,
    nextFix,
    userSafeSummary: userSummary(status),
    developerSafeSummary,
  };
}
}

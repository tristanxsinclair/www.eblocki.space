import type { TemporalResult } from "./temporal-engine";
import { getTemporalSnapshotSummary } from "./temporal-snapshot";
import { buildProofStandardPreview, type ProofStandardPreview } from "./proof-standard-preview";

export type DashboardStatus = "new_user" | "needs_proof" | "active" | "degraded";

export interface DashboardProofRow {
  id?: string;
  domain?: string | null;
  title?: string | null;
  artifact_type?: string | null;
  evidence_strength?: string | null;
  quality_score?: number | null;
  next_upgrade?: string | null;
  transfer_flag?: boolean | null;
  pressure_flag?: boolean | null;
  created_at?: string | null;
  temporal_snapshot?: unknown;
}

export interface DashboardCommitmentRow {
  id?: string;
  title?: string | null;
  domain?: string | null;
  mode?: string | null;
  required_artifact?: string | null;
  evidence_standard?: string | null;
  status?: string | null;
}

export interface DashboardDailySheetRow {
  prime_objective?: string | null;
  next_best_action?: string | null;
  state?: string | null;
}

export interface DashboardCoachRow {
  mode?: string | null;
  state_detected?: string | null;
}

export interface DashboardViewModelInput {
  today?: DashboardDailySheetRow | null;
  pending?: DashboardCommitmentRow[] | null;
  recentProofs?: DashboardProofRow[] | null;
  allArtifacts?: DashboardProofRow[] | null;
  recentCoach?: DashboardCoachRow[] | null;
  modesCount?: number | null;
  temporalResult?: TemporalResult | null;
  hasSentinel?: boolean;
  hasCortex?: boolean;
  queryFailed?: boolean;
}

export interface DashboardViewModel {
  commandSummary: {
    label: string;
    title: string;
    nextBestAction: string;
    proofRequired: string;
    highestRisk: string;
    primaryCta: string;
    primaryHref: string;
    secondaryCta: string;
    secondaryHref: string;
  };
  commandLayer: {
    todayCommand: string;
    activeRoute: string;
    proofContract: string;
    selectedStandard: string;
    requiredEvidence: string[];
    riskIfIgnored: string;
    nextCheckpoint: string;
    latestCourtSignal: string;
    proofPreview: ProofStandardPreview;
  };
  futureSummary: {
    status: string;
    modelVersion: string | null;
    primaryPath: string;
    confidenceLevel: string;
    futurePowerScore: number;
    riskKind: string;
    temporalCommand: string;
    snapshotValid: boolean;
    snapshotReason: string;
  };
  evidenceSummary: {
    weekArtifacts: number;
    eliteCount: number;
    strongCount: number;
    averageScore: number;
    pendingCount: number;
    modesCount: number;
    strongestDomain: string | null;
    weakestDomain: string | null;
    latestProofTitle: string | null;
  };
  dashboardStatus: DashboardStatus;
  emptyStateMessage: string;
  sectionsEnabled: {
    future: boolean;
    evidence: boolean;
    identity: boolean;
    weekly: boolean;
    sentinel: boolean;
    cortex: boolean;
    court: boolean;
  };
}

const DAY = 86_400_000;

function dateMs(value?: string | null): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeText(value: unknown, fallback: string, max = 220): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function strengthRank(value?: string | null): number {
  switch ((value ?? "").toLowerCase()) {
    case "elite": return 4;
    case "strong": return 3;
    case "moderate": return 2;
    case "weak": return 1;
    default: return 0;
  }
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function normalise(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function inferActiveRoute(preview: ProofStandardPreview, pending?: DashboardCommitmentRow | null, latest?: DashboardProofRow | null): string {
  const text = normalise(`${preview.standardKey} ${preview.artifactType} ${pending?.mode ?? ""} ${pending?.domain ?? ""} ${latest?.domain ?? ""}`);
  if (text.includes("source bank")) return "law_source_bank";
  if (text.includes("academic proof plan") || text.includes("law academic")) return "academic_proof_plan";
  if (text.includes("product system")) return "product_system_review";
  if (text.includes("irac") || text.includes("legal reasoning")) return "legal_reasoning";
  if (text.includes("implementation")) return "implementation_proof";
  return pending ? "execution_lock" : "activation";
}

function timeboxFor(preview: ProofStandardPreview): string {
  switch (preview.standardKey) {
    case "law_source_bank_standard": return "35 minutes";
    case "law_irac_standard": return "30 minutes";
    case "product_system_review_standard": return "25 minutes";
    case "eblocki_implementation_standard": return "45 minutes";
    default: return "25 minutes";
  }
}

function riskFor(route: string): string {
  if (route === "law_source_bank" || route === "academic_proof_plan") return "Planning will replace assessed academic proof.";
  if (route === "product_system_review") return "Review will replace implementation or test evidence.";
  if (route === "legal_reasoning") return "Answer style will replace authority-backed application.";
  if (route === "implementation_proof") return "Claims will outrun shipped behaviour.";
  return "Interpretation will replace visible proof.";
}

function checkpointFor(preview: ProofStandardPreview, route: string): string {
  if (route === "law_source_bank") return "After two source-bank entries exist, generate one issue matrix.";
  if (route === "academic_proof_plan") return "After the first source-bank entry exists, lock the next weekly proof artifact.";
  if (route === "product_system_review") return "After corrected logic exists, capture implementation or external test evidence.";
  if (route === "legal_reasoning") return "After one IRAC answer exists, review authority precision and fact application.";
  if (route === "implementation_proof") return "After implementation exists, attach test, build, or release evidence.";
  return preview.nextUpgrade;
}

function courtSignalFor(latest?: DashboardProofRow | null): string {
  if (!latest) return "No proof yet. Submit one measurable artifact to activate the command layer.";
  const score = typeof latest.quality_score === "number" ? `${latest.quality_score}/10` : "unscored";
  const strength = latest.evidence_strength ?? "unclassified";
  const identity = strengthRank(latest.evidence_strength) >= 3 && (latest.transfer_flag || latest.pressure_flag)
    ? "identity escalation review allowed"
    : "identity escalation blocked until stronger external proof exists";
  return `${strength} ${score}. ${identity}.`;
}

export function buildDashboardViewModel(input: DashboardViewModelInput = {}): DashboardViewModel {
  const pending = input.pending ?? [];
  const recentProofs = input.recentProofs ?? [];
  const allArtifacts = input.allArtifacts ?? recentProofs;
  const temporal = input.temporalResult ?? null;
  const modesCount = input.modesCount ?? 0;
  const now = Date.now();
  const weekArtifacts = allArtifacts.filter((artifact) => now - dateMs(artifact.created_at) <= 7 * DAY);
  const scoredWeek = weekArtifacts
    .map((artifact) => artifact.quality_score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

  const byDomain = new Map<string, { count: number; score: number }>();
  for (const artifact of weekArtifacts) {
    const domain = safeText(artifact.domain, "general", 64).toLowerCase();
    const current = byDomain.get(domain) ?? { count: 0, score: 0 };
    current.count += 1;
    current.score += typeof artifact.quality_score === "number" ? artifact.quality_score : 0;
    byDomain.set(domain, current);
  }
  const rankedDomains = [...byDomain.entries()]
    .map(([domain, value]) => ({ domain, count: value.count, averageScore: value.count ? value.score / value.count : 0 }))
    .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore);

  const allDomains = Array.from(new Set(allArtifacts.map((artifact) => safeText(artifact.domain, "general", 64).toLowerCase())));
  const untouchedDomain = allDomains.find((domain) => !weekArtifacts.some((artifact) => safeText(artifact.domain, "general", 64).toLowerCase() === domain));
  const latestSnapshotSummary = getTemporalSnapshotSummary(recentProofs.find((proof) => proof.temporal_snapshot)?.temporal_snapshot ?? null);
  const topPending = pending[0] ?? null;
  const latestProof = recentProofs[0] ?? null;

  const hasProof = allArtifacts.length > 0;
  const dashboardStatus: DashboardStatus = input.queryFailed
    ? "degraded"
    : !hasProof && pending.length === 0
      ? "new_user"
      : !hasProof
        ? "needs_proof"
        : latestSnapshotSummary.exists && !latestSnapshotSummary.valid
          ? "degraded"
          : "active";

  const temporalCommand = temporal?.intervention.command ?? "Submit one proof artifact today. Baseline first.";
  const proofPreview = buildProofStandardPreview({
    domain: topPending?.domain ?? topPending?.mode ?? latestProof?.domain ?? "general",
    artifactType: topPending?.required_artifact ?? latestProof?.artifact_type ?? "visible artifact",
    proofAction: topPending?.required_artifact ?? topPending?.title ?? temporalCommand,
    proofContract: topPending,
  });
  const activeRoute = inferActiveRoute(proofPreview, topPending, latestProof);
  const proofContract = `One artifact: ${proofPreview.artifactType}. One standard: ${proofPreview.standardLabel}. Timebox: ${timeboxFor(proofPreview)}.`;
  const nextCheckpoint = checkpointFor(proofPreview, activeRoute);
  const riskIfIgnored = temporal?.risk.primaryFailureMode
    ? temporal.risk.primaryFailureMode.replace(/_/g, " ")
    : riskFor(activeRoute);
  const latestCourtSignal = courtSignalFor(latestProof);
  const todayCommand = safeText(
    input.today?.prime_objective,
    topPending?.title ?? (hasProof ? proofPreview.nextUpgrade : "Submit one measurable artifact to activate the command layer."),
  );

  const emptyStateMessage = dashboardStatus === "new_user"
    ? "No proof yet. Submit one measurable artifact to activate the command layer."
    : dashboardStatus === "needs_proof"
      ? "Contracts exist, but the Court has no completed proof yet. Close one artifact to start calibration."
      : dashboardStatus === "degraded"
        ? "Some intelligence data is missing or legacy-shaped. Core proof submission remains available."
        : "Command centre active. Keep proof moving before interpretation expands.";

  return {
    commandSummary: {
      label: activeRoute,
      title: todayCommand,
      nextBestAction: nextCheckpoint,
      proofRequired: proofContract,
      highestRisk: riskIfIgnored,
      primaryCta: hasProof || topPending ? "Submit Proof" : "Create First Proof",
      primaryHref: "/proof",
      secondaryCta: topPending ? "Open Coach" : "Start Today",
      secondaryHref: topPending ? "/coach" : "/start",
    },
    commandLayer: {
      todayCommand,
      activeRoute,
      proofContract,
      selectedStandard: proofPreview.standardLabel,
      requiredEvidence: proofPreview.requiredEvidence,
      riskIfIgnored,
      nextCheckpoint,
      latestCourtSignal,
      proofPreview,
    },
    futureSummary: {
      status: temporal?.hasEvidence ? "forecasting" : "standby",
      modelVersion: temporal?.modelVersion ?? latestSnapshotSummary.modelVersion,
      primaryPath: temporal?.primary ?? latestSnapshotSummary.primaryPath ?? "current_path",
      confidenceLevel: temporal?.confidence.band ?? latestSnapshotSummary.confidenceLevel ?? "low",
      futurePowerScore: temporal?.futurePowerScore ?? 0,
      riskKind: riskIfIgnored,
      temporalCommand,
      snapshotValid: latestSnapshotSummary.valid,
      snapshotReason: latestSnapshotSummary.reason,
    },
    evidenceSummary: {
      weekArtifacts: weekArtifacts.length,
      eliteCount: weekArtifacts.filter((artifact) => strengthRank(artifact.evidence_strength) === 4).length,
      strongCount: weekArtifacts.filter((artifact) => strengthRank(artifact.evidence_strength) === 3).length,
      averageScore: average(scoredWeek),
      pendingCount: pending.length,
      modesCount,
      strongestDomain: rankedDomains[0]?.domain ?? null,
      weakestDomain: untouchedDomain ?? null,
      latestProofTitle: latestProof?.title ?? null,
    },
    dashboardStatus,
    emptyStateMessage,
    sectionsEnabled: {
      future: !!temporal || latestSnapshotSummary.exists,
      evidence: hasProof || pending.length > 0,
      identity: hasProof,
      weekly: hasProof || pending.length > 0,
      sentinel: !!input.hasSentinel,
      cortex: !!input.hasCortex,
      court: hasProof || pending.length > 0,
    },
  };
}

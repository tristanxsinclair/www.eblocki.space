/**
 * Eblocki Temporal Intelligence Engine
 *
 * Deterministic, evidence-based behavioural trajectory projector.
 * No fortune-telling. No AI calls. Every score is derived from
 * observed proof artifacts, verdicts, identity ledger entries,
 * and behavioural state.
 *
 * Core rule: NO PROOF, NO FUTURE CHANGE.
 */

export const TEMPORAL_MODEL_VERSION = "temporal-v1.1-calibrated";

export type FutureHorizon = "24h" | "7d" | "30d" | "90d" | "1y";
export const HORIZONS: FutureHorizon[] = ["24h", "7d", "30d", "90d", "1y"];

export type TrajectoryName =
  | "current_path"
  | "corrected_path"
  | "decay_path"
  | "escalation_path";

export interface ProofArtifactLike {
  id?: string;
  domain?: string | null;
  quality_score?: number | null;
  evidence_strength?: string | null; // weak | moderate | strong | elite (legacy: useful)
  transfer_flag?: boolean | null;
  pressure_flag?: boolean | null;
  proof_tier?: number | null;
  created_at: string;
}

export interface VerdictLike {
  verdict?: string | null; // accepted_strong | accepted | shallow | rejected
  created_at: string;
}

export interface LedgerLike {
  kind: string;
  domain: string;
  created_at: string;
}

export interface TemporalInput {
  now?: Date;
  artifacts?: ProofArtifactLike[];
  verdicts?: VerdictLike[];
  ledger?: LedgerLike[];
  activeDomains?: string[];          // domains the user has configured
  state?: string | null;             // behavioural state
  operatorLevel?: number | null;
}

export interface TrajectoryVector {
  growth: number;     // 0..100
  risk: number;       // 0..100
  identity: number;   // 0..100
}

export interface FutureTrajectory {
  name: TrajectoryName;
  label: string;
  probability: number;          // 0..1
  vector: TrajectoryVector;
  proofRequirement: string;
  likelyOutcome: string;
  warning: string;
  opportunity: string;
  confidence: number;           // 0..1
  /** Sample points (one per horizon) for visual rendering, y in [-100, 100]. */
  coords: { horizon: FutureHorizon; y: number }[];
}

export interface DomainTrajectory {
  domain: string;
  artifacts: number;
  avgQuality: number;
  neglected: boolean;
  driftRisk: number;
}

export interface IdentityTrajectory {
  escalationChance: number; // 0..1
  inflationPenalty: number; // 0..1
  strongCount: number;
  eliteCount: number;
  transferCount: number;
}

export interface RiskVector {
  drift: number;
  shallow: number;
  overload: number;
  neglect: number;
  primaryFailureMode: string;
}

export interface ProofMomentum {
  last7: number;
  last30: number;
  avgQuality: number;
  consistency: number; // 0..1
}

export interface TemporalConfidence {
  score: number;       // 0..1
  band: "low" | "moderate" | "high";
  rationale: string;
  reasons?: string[];
  dataVolumeSignal?: number;
  signalClaritySignal?: number;
  missingDataPenalty?: number;
  legacyRowPenalty?: number;
  uncertaintyWarning?: string;
}

export interface FutureIntervention {
  command: string;
  blocked: string;
  timeboxMinutes: number;
  domain: string | null;
  artifactRequired: string;
}

export interface VisualTrajectoryModel {
  horizons: FutureHorizon[];
  paths: { name: TrajectoryName; points: { x: number; y: number }[] }[];
  riskField: number;     // 0..100
  growthField: number;   // 0..100
  uncertaintyBand: number; // 0..100 (width)
  currentPosition: { x: number; y: number };
}

export interface TemporalResult {
  generatedAt: string;
  modelVersion: string;
  hasEvidence: boolean;
  futurePowerScore: number;   // 0..100
  momentum: ProofMomentum;
  risk: RiskVector;
  identity: IdentityTrajectory;
  domains: DomainTrajectory[];
  trajectories: Record<TrajectoryName, FutureTrajectory>;
  primary: TrajectoryName;
  intervention: FutureIntervention;
  confidence: TemporalConfidence;
  visual: VisualTrajectoryModel;
}

// ---------- helpers ----------

const DAY = 86_400_000;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const safeNum = (n: unknown, d = 0): number =>
  typeof n === "number" && Number.isFinite(n) ? n : d;

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

// ---------- core ----------

export function computeTemporal(input: TemporalInput = {}): TemporalResult {
  const now = input.now ?? new Date();
  const artifacts = (input.artifacts ?? []).filter(a => a && a.created_at);
  const verdicts = input.verdicts ?? [];
  const ledger = input.ledger ?? [];
  const activeDomains = input.activeDomains ?? [];

  const nowT = now.getTime();
  const within = (a: ProofArtifactLike, days: number) =>
    nowT - new Date(a.created_at).getTime() <= days * DAY;

  const last7Arts = artifacts.filter(a => within(a, 7));
  const last30Arts = artifacts.filter(a => within(a, 30));

  const avgQuality = artifacts.length
    ? artifacts.reduce((s, a) => s + safeNum(a.quality_score), 0) / artifacts.length
    : 0;

  // consistency = fraction of last 14 days with at least one proof
  const daySet = new Set<string>();
  for (const a of artifacts.filter(a => within(a, 14))) {
    daySet.add(new Date(a.created_at).toISOString().slice(0, 10));
  }
  const consistency = clamp(daySet.size / 14, 0, 1);

  const momentum: ProofMomentum = {
    last7: last7Arts.length,
    last30: last30Arts.length,
    avgQuality: Math.round(avgQuality * 10) / 10,
    consistency,
  };

  // Identity
  const strongCount = artifacts.filter(a => strengthRank(a.evidence_strength) >= 3).length;
  const eliteCount = artifacts.filter(a => strengthRank(a.evidence_strength) === 4).length;
  const transferCount = artifacts.filter(a => a.transfer_flag === true).length;
  const shallowRecent = last7Arts.filter(a => strengthRank(a.evidence_strength) <= 2).length;
  const acceptedStrong = verdicts.filter(v => v.verdict === "accepted_strong").length;

  const domainArtifacts: Record<string, ProofArtifactLike[]> = {};
  for (const a of artifacts) {
    const d = (a.domain ?? "general").toLowerCase();
    (domainArtifacts[d] ||= []).push(a);
  }
  const domainList = Array.from(
    new Set<string>([
      ...activeDomains.map(d => d.toLowerCase()),
      ...Object.keys(domainArtifacts),
    ]),
  );
  const domains: DomainTrajectory[] = domainList.map(d => {
    const list = domainArtifacts[d] ?? [];
    const recent = list.filter(a => within(a, 7)).length;
    const q = list.length
      ? list.reduce((s, a) => s + safeNum(a.quality_score), 0) / list.length
      : 0;
    const neglected = recent === 0;
    const driftRisk = clamp(
      (neglected ? 45 : 0) + (q < 5 ? 20 : 0) + (recent === 0 && list.length === 0 ? 25 : 0),
    );
    return { domain: d, artifacts: list.length, avgQuality: Math.round(q * 10) / 10, neglected, driftRisk };
  });

  const neglectedCount = domains.filter(d => d.neglected).length;

  // Risk vector
  const noProofPenalty = last7Arts.length === 0 ? 35 : 0;
  const shallowProofPenalty = clamp(shallowRecent * 6);
  const neglectedPenalty = clamp(neglectedCount * 10);
  const overloadPenalty = last7Arts.length > 20 ? 15 : 0;
  const strongProtection = clamp(strongCount * 4, 0, 40);
  const drift = clamp(noProofPenalty + shallowProofPenalty + neglectedPenalty + overloadPenalty - strongProtection);
  const shallow = clamp(shallowProofPenalty + (avgQuality < 6 ? 20 : 0));
  const overload = overloadPenalty;
  const neglect = neglectedPenalty;

  const failureModes: { mode: string; weight: number }[] = [
    { mode: "no_proof", weight: noProofPenalty },
    { mode: "shallow_proof", weight: shallow },
    { mode: "neglected_domain", weight: neglect },
    { mode: "overload", weight: overload },
    { mode: "drift", weight: drift / 3 },
  ];
  failureModes.sort((a, b) => b.weight - a.weight);

  const risk: RiskVector = {
    drift,
    shallow,
    overload,
    neglect,
    primaryFailureMode: failureModes[0]?.mode ?? "drift",
  };

  // Identity escalation
  const identityInflationPenalty =
    ledger.length > 0 && acceptedStrong === 0 && strongCount === 0 ? 0.2 : 0;
  const escalationChance = clamp(
    acceptedStrong * 0.35 +
      eliteCount * 0.45 +
      transferCount * 0.15 +
      consistency * 0.05 -
      identityInflationPenalty,
    0,
    1,
  );
  const identity: IdentityTrajectory = {
    escalationChance,
    inflationPenalty: identityInflationPenalty,
    strongCount,
    eliteCount,
    transferCount,
  };

  // Future Power Score
  const domainBalance =
    domains.length === 0 ? 0 : clamp(100 - (neglectedCount / domains.length) * 100);
  const interventionResponse = clamp(acceptedStrong * 20);
  const recoveryStability = clamp(60 + (last7Arts.length > 0 ? 20 : -30));
  const futurePowerScore = clamp(
    last7Arts.length * 2 * 0.25 +
      avgQuality * 10 * 0.2 +
      domainBalance * 0.15 +
      escalationChance * 100 * 0.15 +
      interventionResponse * 0.1 +
      recoveryStability * 0.1 +
      consistency * 100 * 0.05,
  );

  // Confidence
  const dataVolume = clamp(artifacts.length * 4, 0, 60);
  const recentConsistency = consistency * 30;
  const signalClarity = strongCount > 0 ? 10 : 0;
  const missingDataPenalty = artifacts.length === 0 ? 30 : 0;
  const legacyPenalty = clamp(
    artifacts.filter(a => !a.evidence_strength).length * 2,
    0,
    20,
  );
  const confScore = clamp(
    dataVolume + recentConsistency + signalClarity - missingDataPenalty - legacyPenalty,
    0,
    100,
  ) / 100;
  const confidence: TemporalConfidence = {
    score: confScore,
    band: confScore < 0.34 ? "low" : confScore < 0.7 ? "moderate" : "high",
    rationale:
      artifacts.length === 0
        ? "No proof artifacts yet. Future modelling is provisional until baseline evidence exists."
        : `Based on ${artifacts.length} artifact(s), ${strongCount} strong, ${Math.round(consistency * 14)}/14 active days.`,
    reasons: [
      `data volume signal: ${Math.round(dataVolume)}/60`,
      `recent consistency: ${Math.round(recentConsistency)}/30`,
      `signal clarity: ${signalClarity ? "strong proof present" : "no strong proof"}`,
      missingDataPenalty ? "missing data penalty applied" : "no missing data penalty",
      legacyPenalty ? `legacy rows penalty: -${legacyPenalty}` : "no legacy penalty",
    ],
    dataVolumeSignal: dataVolume,
    signalClaritySignal: signalClarity,
    missingDataPenalty,
    legacyRowPenalty: legacyPenalty,
    uncertaintyWarning:
      artifacts.length === 0
        ? "Low confidence: not enough behavioural evidence yet. Submit proof to activate stronger forecasting."
        : confScore < 0.34
          ? "Low confidence: forecast is provisional. Add more strong-evidence proofs to sharpen it."
          : confScore < 0.7
            ? "Moderate confidence: trajectory direction is stable; horizon detail remains probabilistic."
            : "High confidence: pattern is well-observed. Projections remain probabilistic, not deterministic.",
  };

  // Intervention
  const neglectedDomain = domains.find(d => d.neglected)?.domain ?? null;
  const intervention: FutureIntervention = buildIntervention({
    neglectedDomain,
    primaryFailureMode: risk.primaryFailureMode,
    avgQuality,
    hasAnyProof: artifacts.length > 0,
  });

  // Trajectories
  const trajectories = buildTrajectories({
    futurePowerScore,
    risk,
    identity,
    confidence: confScore,
    intervention,
    hasEvidence: artifacts.length > 0,
  });

  const primary: TrajectoryName =
    !artifacts.length
      ? "current_path"
      : risk.drift > 60
        ? "decay_path"
        : escalationChance > 0.5
          ? "escalation_path"
          : "current_path";

  const visual: VisualTrajectoryModel = {
    horizons: HORIZONS,
    paths: (Object.values(trajectories) as FutureTrajectory[]).map(t => ({
      name: t.name,
      points: t.coords.map((c, i) => ({ x: i / (HORIZONS.length - 1), y: c.y })),
    })),
    riskField: risk.drift,
    growthField: futurePowerScore,
    uncertaintyBand: clamp(100 - confScore * 100),
    currentPosition: { x: 0, y: 0 },
  };

  return {
    generatedAt: now.toISOString(),
    modelVersion: TEMPORAL_MODEL_VERSION,
    hasEvidence: artifacts.length > 0,
    futurePowerScore: Math.round(futurePowerScore),
    momentum,
    risk,
    identity,
    domains,
    trajectories,
    primary,
    intervention,
    confidence,
    visual,
  };
}

function buildIntervention(args: {
  neglectedDomain: string | null;
  primaryFailureMode: string;
  avgQuality: number;
  hasAnyProof: boolean;
}): FutureIntervention {
  const { neglectedDomain, primaryFailureMode, avgQuality, hasAnyProof } = args;
  if (!hasAnyProof) {
    return {
      command: "Submit one proof artifact today. Any domain. Baseline first.",
      blocked: "Do not plan, schedule, or research. Only ship one artifact.",
      timeboxMinutes: 30,
      domain: neglectedDomain,
      artifactRequired: "first_baseline_artifact",
    };
  }
  if (neglectedDomain) {
    return {
      command: `Produce one accepted_strong artifact in ${neglectedDomain.toUpperCase()} within 24 hours.`,
      blocked: "No new commitments in already-active domains until neglect closes.",
      timeboxMinutes: 45,
      domain: neglectedDomain,
      artifactRequired: "accepted_strong",
    };
  }
  if (primaryFailureMode === "shallow_proof" || avgQuality < 6) {
    return {
      command: "Upgrade the next artifact to STRONG. Add evidence, mechanism, evaluation.",
      blocked: "No additional shallow proofs today.",
      timeboxMinutes: 60,
      domain: null,
      artifactRequired: "accepted_strong",
    };
  }
  if (primaryFailureMode === "overload") {
    return {
      command: "Reduce volume. One depth-proof beats five surface artifacts.",
      blocked: "Block all new contracts for 24 hours.",
      timeboxMinutes: 90,
      domain: null,
      artifactRequired: "depth_proof",
    };
  }
  return {
    command: "Push standard upward. Add a transfer or identity-grade artifact.",
    blocked: "No repetition of yesterday's standard.",
    timeboxMinutes: 60,
    domain: null,
    artifactRequired: "transfer_or_elite",
  };
}

function pointsFor(slope: number, curvature: number): { horizon: FutureHorizon; y: number }[] {
  return HORIZONS.map((h, i) => {
    const t = i / (HORIZONS.length - 1);
    const y = slope * t * 100 + curvature * Math.sin(t * Math.PI) * 20;
    return { horizon: h, y: Math.max(-100, Math.min(100, y)) };
  });
}

function buildTrajectories(args: {
  futurePowerScore: number;
  risk: RiskVector;
  identity: IdentityTrajectory;
  confidence: number;
  intervention: FutureIntervention;
  hasEvidence: boolean;
}): Record<TrajectoryName, FutureTrajectory> {
  const { futurePowerScore, risk, identity, confidence, intervention, hasEvidence } = args;

  const currentSlope = (futurePowerScore - 50) / 100; // -0.5..0.5
  const decaySlope = -0.4 - risk.drift / 200;
  const correctedSlope = Math.max(0.3, currentSlope + 0.35);
  const escalationSlope = 0.55 + identity.escalationChance * 0.4;

  const baseConfidence = Math.max(0.15, confidence);

  const total =
    (hasEvidence ? 1 : 0.2) +
    (risk.drift > 40 ? 1.4 : 0.6) +
    (identity.escalationChance > 0.4 ? 1.2 : 0.4) +
    1.0; // corrected always present
  const norm = (n: number) => n / total;

  return {
    current_path: {
      name: "current_path",
      label: "Current Path",
      probability: norm(hasEvidence ? 1 : 0.2),
      vector: { growth: futurePowerScore, risk: risk.drift, identity: identity.escalationChance * 100 },
      proofRequirement: "Maintain current cadence. No standard upgrade implied.",
      likelyOutcome: hasEvidence
        ? "Activity sustained. Standard plateaus. Identity does not escalate."
        : "No baseline exists. Trajectory is undefined until first proof.",
      warning: "Sustained shallow proof creates the illusion of progress.",
      opportunity: "Small upgrade per artifact compounds quickly across 30 days.",
      confidence: baseConfidence,
      coords: pointsFor(currentSlope, 0.1),
    },
    corrected_path: {
      name: "corrected_path",
      label: "Corrected Path",
      probability: norm(1.0),
      vector: {
        growth: Math.min(100, futurePowerScore + 25),
        risk: Math.max(0, risk.drift - 30),
        identity: Math.min(100, identity.escalationChance * 100 + 20),
      },
      proofRequirement: intervention.command,
      likelyOutcome:
        "Drift risk drops. Identity escalation chance rises across the 7- and 30-day horizon.",
      warning: "Path requires execution within timebox. Planning does not count.",
      opportunity: "One accepted_strong artifact bends 30-day trajectory upward.",
      confidence: baseConfidence,
      coords: pointsFor(correctedSlope, 0.4),
    },
    decay_path: {
      name: "decay_path",
      label: "Decay Path",
      probability: norm(risk.drift > 40 ? 1.4 : 0.6),
      vector: { growth: Math.max(0, futurePowerScore - 35), risk: Math.min(100, risk.drift + 20), identity: 0 },
      proofRequirement: "Skip proof. Avoid feedback. Replace shipping with planning.",
      likelyOutcome: "Standard collapses. Identity weakens. Recovery cost rises.",
      warning: "Highest probability when no proof appears in 7 days.",
      opportunity: "Single small artifact today neutralises decay vector.",
      confidence: baseConfidence,
      coords: pointsFor(decaySlope, -0.3),
    },
    escalation_path: {
      name: "escalation_path",
      label: "Escalation Path",
      probability: norm(identity.escalationChance > 0.4 ? 1.2 : 0.4),
      vector: { growth: Math.min(100, futurePowerScore + 40), risk: Math.max(0, risk.drift - 40), identity: 100 },
      proofRequirement: "Stack accepted_strong + transfer proof across two domains in 7 days.",
      likelyOutcome: "Identity layer escalates. New standard becomes the floor, not the ceiling.",
      warning: "Escalation without recovery causes overload collapse.",
      opportunity: "Compounding evidence rewrites future-self baseline.",
      confidence: baseConfidence,
      coords: pointsFor(escalationSlope, 0.5),
    },
  };
}
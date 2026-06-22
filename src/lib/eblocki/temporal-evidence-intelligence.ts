export type TemporalRisk =
  | "no_artifact_drift"
  | "shallow_proof_loop"
  | "domain_neglect"
  | "academic_displacement"
  | "overload_spiral"
  | "low_energy_decay"
  | "identity_inflation"
  | "streak_without_depth"
  | "recovery_fragility"
  | "none_detected";

export type TemporalPath =
  | "current"
  | "corrected"
  | "decay"
  | "escalation";

export type TemporalHorizon =
  | "24h"
  | "7d"
  | "30d"
  | "90d"
  | "1y";

export type TemporalEvidenceSnapshot = {
  proofCount: number;
  averageProofQuality: number | null;
  strongestDomain: string | null;
  neglectedDomains: string[];
  recentCourtVerdicts: string[];
  recentAdversarialRisks: string[];
  stateTrend: string[];
  interventionFollowThroughRate: number | null;
  dataQuality: "empty" | "thin" | "usable" | "strong";
};

export type CounterfactualPath = {
  path: TemporalPath;
  summary: string;
  expectedChange: number;
  confidence: number;
  evidence: string[];
  userActionRequired?: string;
};

export type DisconfirmingProof = {
  claim: string;
  proofThatWouldDisproveIt: string;
};

export type FutureScene = {
  horizon: TemporalHorizon;
  pathType: TemporalPath;
  scene: string;
  evidenceSource: string[];
  behaviouralMechanism: string;
  likelyConsequence: string;
  proofThatChangesPath: string;
  confidence: "low" | "medium" | "high";
  uncertaintyNote: string;
  disconfirmingProof: string;
};

export type TemporalForecast = {
  id: string;
  userId: string;
  generatedAt: string;
  horizon: TemporalHorizon;
  primaryRisk: TemporalRisk;
  confidence: number;
  uncertaintyRange: [number, number];
  currentPath: CounterfactualPath;
  correctedPath: CounterfactualPath;
  decayPath: CounterfactualPath;
  escalationPath: CounterfactualPath;
  evidenceSnapshot: TemporalEvidenceSnapshot;
  futureScene: FutureScene;
  proofRequired: string;
  blockedAction: string;
  disconfirmingProof: DisconfirmingProof[];
  calibrationStatus: "pending" | "calibrated" | "insufficient_evidence";
};

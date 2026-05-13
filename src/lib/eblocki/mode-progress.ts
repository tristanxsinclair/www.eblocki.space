export interface ModeProgressInput {
  artifacts: Array<{ evidence_strength?: string | null; quality_score?: number | null; created_at?: string | null }>;
  commitments: Array<{ status?: string | null; created_at?: string | null; completed_at?: string | null; due_date?: string | null }>;
  interactions: Array<{ created_at?: string | null }>; 
}

export interface ModeProgress {
  totalArtifacts: number;
  pendingCommitments: number;
  completedCommitments: number;
  missedCommitments: number;
  averageQualityScore: number;
  weakCount: number;
  moderateCount: number;
  strongCount: number;
  eliteCount: number;
  strongOrEliteCount: number;
  lastProofDate: string | null;
  proofVelocity7Days: number;
  proofVelocity30Days: number;
  compoundingScore: number;
  suggestedUpgrade: string;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function evidenceStrengthRank(strength?: string | null) {
  switch (strength) {
    case "weak":
      return 1;
    case "moderate":
      return 2;
    case "strong":
      return 3;
    case "elite":
      return 4;
    default:
      return 0;
  }
}

export function calculateModeProgress({ artifacts, commitments, interactions }: ModeProgressInput): ModeProgress {
  const totalArtifacts = artifacts.length;
  const weakCount = artifacts.filter((artifact) => artifact.evidence_strength === "weak").length;
  const moderateCount = artifacts.filter((artifact) => artifact.evidence_strength === "moderate").length;
  const strongCount = artifacts.filter((artifact) => artifact.evidence_strength === "strong").length;
  const eliteCount = artifacts.filter((artifact) => artifact.evidence_strength === "elite").length;
  const strongOrEliteCount = strongCount + eliteCount;

  const qualityScores = artifacts
    .map((artifact) => artifact.quality_score)
    .filter((score): score is number => typeof score === "number");
  const averageQualityScore = qualityScores.length
    ? Math.round((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) * 10) / 10
    : 0;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const proofDates = artifacts
    .map((artifact) => parseDate(artifact.created_at))
    .filter((date): date is Date => date instanceof Date);

  const lastProofDate = proofDates.length
    ? proofDates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString().slice(0, 10)
    : null;

  const proofVelocity7Days = proofDates.filter((date) => date >= sevenDaysAgo).length;
  const proofVelocity30Days = proofDates.filter((date) => date >= thirtyDaysAgo).length;

  const pendingCommitments = commitments.filter((commitment) => commitment.status === "pending").length;
  const completedCommitments = commitments.filter((commitment) => commitment.status === "completed").length;
  const missedCommitments = commitments.filter((commitment) => commitment.status === "missed").length;

  let compoundingScore = 0;
  compoundingScore += totalArtifacts * 2;
  compoundingScore += strongCount * 3;
  compoundingScore += eliteCount * 5;
  compoundingScore += completedCommitments * 1;
  compoundingScore -= missedCommitments * 2;
  if (proofVelocity7Days > 0) compoundingScore += 2;
  if (proofVelocity7Days >= 3) compoundingScore += 5;
  compoundingScore = Math.max(0, Math.min(100, compoundingScore));

  let suggestedUpgrade = "Increase proof velocity with one artifact this week.";
  if (totalArtifacts === 0) {
    suggestedUpgrade = "Submit the first proof artifact for this mode.";
  } else if (pendingCommitments > 0) {
    suggestedUpgrade = "Complete one pending Proof Contract.";
  } else if (averageQualityScore < 6) {
    suggestedUpgrade = "Improve proof quality with reflection and next upgrade.";
  } else if (strongOrEliteCount === 0) {
    suggestedUpgrade = "Create one strong artifact using domain-specific structure.";
  }

  return {
    totalArtifacts,
    pendingCommitments,
    completedCommitments,
    missedCommitments,
    averageQualityScore,
    weakCount,
    moderateCount,
    strongCount,
    eliteCount,
    strongOrEliteCount,
    lastProofDate,
    proofVelocity7Days,
    proofVelocity30Days,
    compoundingScore,
    suggestedUpgrade,
  };
}
EOF
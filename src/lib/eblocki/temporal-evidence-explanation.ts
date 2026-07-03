import type { TemporalResult } from "./temporal-engine";

export const INSUFFICIENT_TEMPORAL_EVIDENCE =
  "Not enough evidence exists to support a strong forecast yet.";

export const THIN_TEMPORAL_EVIDENCE_ACTION =
  "Submit one measurable proof artifact.";

export type TemporalEvidenceExplanation = {
  primaryForecastClaim: string;
  supportingEvidence: string[];
  uncertaintyStatement: string;
  disconfirmingProof: string;
  proofChangingCommand: string;
};

const isThinEvidence = (result: TemporalResult): boolean =>
  !result.hasEvidence || result.momentum.last30 < 2;

function humanise(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/_/g, " ");
}

function formatArtifactRequirement(value: string | null | undefined): string {
  switch (value) {
    case "accepted_strong":
      return "accepted strong artifact";
    case "first_baseline_artifact":
      return "measurable baseline artifact";
    case "depth_proof":
      return "depth proof artifact";
    case "transfer_or_elite":
      return "transfer or elite artifact";
    default: {
      const label = humanise(value);
      return label ? `${label} artifact` : "measurable proof artifact";
    }
  }
}

function timeboxClause(result: TemporalResult): string {
  const minutes = result.intervention.timeboxMinutes;
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0
    ? ` within ${Math.round(minutes)} minutes`
    : "";
}

function domainClause(result: TemporalResult): string {
  const domain = result.intervention.domain?.trim();
  return domain ? ` in ${domain}` : "";
}

function buildProofChangingCommand(result: TemporalResult): string {
  if (isThinEvidence(result)) return THIN_TEMPORAL_EVIDENCE_ACTION;

  const domain = domainClause(result);
  const timebox = timeboxClause(result);

  switch (result.risk.primaryFailureMode) {
    case "no_proof":
      return `Submit one measurable proof artifact${domain}${timebox}.`;
    case "shallow_proof":
      return `Submit one accepted strong artifact${domain}${timebox}.`;
    case "neglected_domain":
      return `Submit one accepted strong artifact${domain || " in the neglected domain"}${timebox}.`;
    case "overload":
      return `Submit one depth proof artifact${domain}${timebox}.`;
    case "drift":
    default:
      return `Submit one ${formatArtifactRequirement(result.intervention.artifactRequired)}${domain}${timebox}.`;
  }
}

function buildSupportingEvidence(result: TemporalResult): string[] {
  if (isThinEvidence(result)) return [INSUFFICIENT_TEMPORAL_EVIDENCE];

  const evidence: string[] = [];
  const rationale = result.confidence.rationale?.trim();
  if (rationale) evidence.push(rationale);

  evidence.push(
    `Observed momentum: ${result.momentum.last30} artifact(s) in 30 days, ${result.momentum.last7} in 7 days, average quality ${result.momentum.avgQuality}/10.`,
  );

  const highestRiskDomain = [...result.domains]
    .sort((a, b) => b.driftRisk - a.driftRisk)[0];
  if (highestRiskDomain) {
    evidence.push(
      `Highest observed domain drift risk: ${highestRiskDomain.domain} at ${Math.round(highestRiskDomain.driftRisk)}/100 from ${highestRiskDomain.artifacts} recorded artifact(s).`,
    );
  } else {
    evidence.push(
      `Observed consistency covers ${Math.round(result.momentum.consistency * 14)}/14 recent days.`,
    );
  }

  return evidence.slice(0, 3);
}

export function buildTemporalEvidenceExplanation(
  result: TemporalResult,
): TemporalEvidenceExplanation {
  const thin = isThinEvidence(result);
  const primaryTrajectory = result.trajectories[result.primary];
  const proofChangingCommand = buildProofChangingCommand(result);
  const commandWithoutPeriod = proofChangingCommand.replace(/\.$/, "");
  const disconfirmingAction =
    commandWithoutPeriod.charAt(0).toLowerCase() + commandWithoutPeriod.slice(1);

  return {
    primaryForecastClaim: thin
      ? "The current forecast is provisional because the evidence base is too thin."
      : `Current evidence provisionally supports the ${primaryTrajectory.label.toLowerCase()}: ${primaryTrajectory.likelyOutcome}`,
    supportingEvidence: buildSupportingEvidence(result),
    uncertaintyStatement:
      result.confidence.uncertaintyWarning?.trim() ||
      `Confidence is ${result.confidence.band}; this forecast remains probabilistic and can change with new proof.`,
    disconfirmingProof: thin
      ? THIN_TEMPORAL_EVIDENCE_ACTION
      : `This forecast weakens if ${disconfirmingAction}.`,
    proofChangingCommand,
  };
}

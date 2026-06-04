import type { TemporalResult } from "./temporal-engine";

export interface TemporalNarrative {
  bluf: string;
  currentTrajectory: string;
  correctedTrajectory: string;
  mainRisk: string;
  mainOpportunity: string;
  proofThatChangesPath: string;
  doNow: string;
  ignore: string;
  confidence: string;
  uncertaintyWarning: string;
}

export function generateFutureNarrative(r: TemporalResult): TemporalNarrative {
  if (!r.hasEvidence) {
    return {
      bluf: "Future modelling inactive. The system has no behavioural evidence to project from.",
      currentTrajectory: "Undefined. No artifacts means no trajectory.",
      correctedTrajectory: "First accepted artifact creates the baseline path.",
      mainRisk: "Identity drift without proof. No data, no future change.",
      mainOpportunity: "One artifact today activates the Temporal Engine.",
      proofThatChangesPath: r.intervention.command,
      doNow: r.intervention.command,
      ignore: r.intervention.blocked,
      confidence: "Confidence: low — insufficient evidence.",
      uncertaintyWarning:
      "Eblocki does not predict fate. Projections are probabilistic and require repeated proof to stabilise.",
    };
  }

  const corrected = r.trajectories.corrected_path;
  const current = r.trajectories.current_path;
  const decay = r.trajectories.decay_path;

  return {
    bluf: `Current trajectory holds growth at ${Math.round(current.vector.growth)}/100 with drift risk ${Math.round(r.risk.drift)}/100. Corrected path raises 7-30d standard if the proof command is executed.`,
    currentTrajectory: `Current path: ${current.likelyOutcome}`,
    correctedTrajectory: `Corrected path: ${corrected.likelyOutcome}`,
    mainRisk: `Primary failure mode: ${r.risk.primaryFailureMode}. ${decay.warning}`,
    mainOpportunity: corrected.opportunity,
    proofThatChangesPath: r.intervention.command,
    doNow: `Timebox ${r.intervention.timeboxMinutes}m. Artifact required: ${r.intervention.artifactRequired}.`,
    ignore: r.intervention.blocked,
    confidence: `Confidence ${Math.round(r.confidence.score * 100)}% (${r.confidence.band}). ${r.confidence.rationale}`,
    uncertaintyWarning:
      "Projections are probabilistic, not deterministic. Proof changes the path. Nothing here is promised.",
  };
}
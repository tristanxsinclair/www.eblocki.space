export interface OpenObjectiveLink {
  id: string;
  proof_commitment_id: string | null;
}

export interface ProvenCommitmentLink {
  id: string;
  proof_artifact_id: string | null;
}

export interface QuestRepairCandidate {
  objectiveId: string;
  proofArtifactId: string;
}

export function findQuestRepairCandidates(
  objectives: OpenObjectiveLink[],
  commitments: ProvenCommitmentLink[],
): QuestRepairCandidate[] {
  const artifactByCommitment = new Map(
    commitments
      .filter(
        (commitment): commitment is ProvenCommitmentLink & { proof_artifact_id: string } =>
          Boolean(commitment.proof_artifact_id),
      )
      .map((commitment) => [commitment.id, commitment.proof_artifact_id]),
  );

  return objectives.flatMap((objective) => {
    if (!objective.proof_commitment_id) return [];
    const proofArtifactId = artifactByCommitment.get(objective.proof_commitment_id);
    return proofArtifactId ? [{ objectiveId: objective.id, proofArtifactId }] : [];
  });
}

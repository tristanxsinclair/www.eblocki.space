export interface ObjectiveCompletionState {
  proof_required: boolean;
  proof_artifact_id: string | null;
}

export function objectiveCanComplete(objective: ObjectiveCompletionState): boolean {
  return !objective.proof_required || Boolean(objective.proof_artifact_id);
}

export function assertObjectiveCanComplete(objective: ObjectiveCompletionState): void {
  if (!objectiveCanComplete(objective)) {
    throw new Error("Evidence required. Log an action before completing this quest.");
  }
}

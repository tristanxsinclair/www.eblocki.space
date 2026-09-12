const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ObjectiveCompletionState {
  proof_required: boolean;
  proof_artifact_id: string | null;
}

export function isSafeRecordId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function buildTaskLogActionHref(input: {
  commitmentId?: string | null;
  objectiveId?: string | null;
}): string {
  const params = new URLSearchParams({ source: "task" });
  if (isSafeRecordId(input.commitmentId)) params.set("contract", input.commitmentId);
  if (isSafeRecordId(input.objectiveId)) params.set("objective", input.objectiveId);
  return `/proof?${params.toString()}`;
}

export function objectiveCanComplete(objective: ObjectiveCompletionState): boolean {
  return !objective.proof_required || Boolean(objective.proof_artifact_id);
}

export function assertObjectiveCanComplete(objective: ObjectiveCompletionState): void {
  if (!objectiveCanComplete(objective)) {
    throw new Error("Evidence required. Log an action before completing this task.");
  }
}

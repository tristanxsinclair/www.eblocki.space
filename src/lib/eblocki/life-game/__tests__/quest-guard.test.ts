import { describe, expect, it } from "vitest";
import { assertObjectiveCanComplete, objectiveCanComplete } from "../quest-guard";

describe("proof-required quest completion guard", () => {
  it("blocks completion until an artifact ID exists", () => {
    const objective = { proof_required: true, proof_artifact_id: null };
    expect(objectiveCanComplete(objective)).toBe(false);
    expect(() => assertObjectiveCanComplete(objective)).toThrow(
      "Evidence required. Log an action before completing this quest.",
    );
  });

  it("allows a proof-required quest after an artifact is linked", () => {
    expect(
      objectiveCanComplete({
        proof_required: true,
        proof_artifact_id: "33333333-3333-4333-8333-333333333333",
      }),
    ).toBe(true);
  });

  it("preserves direct completion for objectives that do not require proof", () => {
    expect(objectiveCanComplete({ proof_required: false, proof_artifact_id: null })).toBe(true);
  });
});

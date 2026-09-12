import { describe, expect, it } from "vitest";
import { findQuestRepairCandidates } from "../reconciliation";

describe("quest reconciliation", () => {
  it("repairs only objectives whose owned commitment already has an artifact", () => {
    expect(
      findQuestRepairCandidates(
        [
          { id: "objective-proven", proof_commitment_id: "commitment-proven" },
          { id: "objective-open", proof_commitment_id: "commitment-open" },
          { id: "objective-unlinked", proof_commitment_id: null },
        ],
        [
          { id: "commitment-proven", proof_artifact_id: "artifact-1" },
          { id: "commitment-open", proof_artifact_id: null },
        ],
      ),
    ).toEqual([
      {
        objectiveId: "objective-proven",
        proofArtifactId: "artifact-1",
      },
    ]);
  });

  it("never creates a repair from an unrelated commitment", () => {
    expect(
      findQuestRepairCandidates(
        [{ id: "objective-1", proof_commitment_id: "commitment-owned" }],
        [{ id: "commitment-other", proof_artifact_id: "artifact-other" }],
      ),
    ).toEqual([]);
  });
});

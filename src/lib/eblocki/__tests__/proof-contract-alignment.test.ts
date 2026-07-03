import { describe, expect, it } from "vitest";
import { routeCoachInput } from "../coach-router";
import { validateProofContractAlignment } from "../proof-contract-alignment";

describe("proof contract alignment", () => {
  it("accepts matching action and contract", () => {
    const route = routeCoachInput("Create two source-bank entries for BLAW1003 and LAWS1004");
    const result = validateProofContractAlignment({
      proofAction: route.recommendedProofArtifact.action,
      recommendedProofArtifact: route.recommendedProofArtifact,
      proofContract: {
        domain: route.domain,
        title: route.recommendedProofArtifact.title,
        requiredArtifact: route.recommendedProofArtifact.requiredArtifact,
        evidenceStandard: route.recommendedProofArtifact.evidenceStandard,
      },
    });

    expect(result.aligned).toBe(true);
  });

  it("detects mismatched artifact type", () => {
    const route = routeCoachInput("Eblocki Proof Plan: BLAW1003 + LAWS1004 Mastery");
    const result = validateProofContractAlignment({
      proofAction: route.recommendedProofArtifact.action,
      recommendedProofArtifact: route.recommendedProofArtifact,
      proofContract: {
        requiredArtifact: "Submit one 200-400 word IRAC paragraph.",
        evidenceStandard: "Issue / Rule / Application / Conclusion",
      },
    });

    expect(result.aligned).toBe(false);
    expect(result.issues).toContain("mismatched_artifact_type");
    expect(result.alignedContract.requiredArtifact).toMatch(/source-bank/i);
  });

  it("detects vague proof requirements", () => {
    const result = validateProofContractAlignment({
      proofAction: "Create one visible artifact.",
      proofContract: { requiredArtifact: "Do the task", evidenceStandard: "" },
    });

    expect(result.issues).toContain("vague_proof_requirement");
    expect(result.issues).toContain("proof_standard_missing");
  });

  it("fallback produces one clean artifact", () => {
    const route = routeCoachInput("I am overbuilding and need more theory before starting");
    const result = validateProofContractAlignment({
      proofAction: "",
      recommendedProofArtifact: route.recommendedProofArtifact,
      proofContract: { requiredArtifact: "IRAC and source bank and implementation", evidenceStandard: "" },
    });

    expect(result.aligned).toBe(false);
    expect(result.alignedContract.requiredArtifact).toBe("One visible artifact with one evidence standard.");
  });
});

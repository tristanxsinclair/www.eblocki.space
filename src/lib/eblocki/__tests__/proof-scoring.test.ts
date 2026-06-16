import { describe, expect, it } from "vitest";
import { selectDomainStandard } from "../domain-standards";
import { scoreProofArtifact } from "../proof-scoring";

describe("Court verdict standards", () => {
  it("does not give product-system proof a law-answer standard", () => {
    const standard = selectDomainStandard({ domain: "product", intent: "product_system_review", artifactType: "product system review" });
    expect(standard.key).toBe("product_system_review_standard");
    expect(standard.criteria.join(" ")).not.toMatch(/AGLC|jurisdiction|rule stated/i);
    expect(standard.missingStandard).toMatch(/implementation|test/i);
    expect(standard.missingStandard).not.toMatch(/AGLC|jurisdiction|binding|persuasive|text-context-purpose/i);
  });

  it("does not give source-bank proof an IRAC standard", () => {
    const standard = selectDomainStandard({ domain: "law_academic", intent: "law_source_bank", artifactType: "source-bank entries" });
    expect(standard.key).toBe("law_source_bank_standard");
    expect(standard.criteria).toContain("authority level");
    expect(standard.criteria).not.toContain("application to facts");
  });

  it("8/10 strong product-system proof shows product-system missing standard", () => {
    const result = scoreProofArtifact({
      domain: "product",
      artifactType: "product system review",
      title: "Coach router mismatch review",
      content: "Specific issue identified: the output classified an academic proof plan as proof review. Evidence from actual output: source bank action competed with an IRAC contract. Corrected logic proposed: route BLAW1003 and LAWS1004 mastery as academic_proof_plan. Implementation path stated: add typed router and alignment guard. Measurable test: source-bank prompt returns source-bank contract.",
      reflection: "Weakness: without implementation evidence this is a strong review, not a shipped fix.",
      nextUpgrade: "Implement the route guard and run tests.",
    });

    expect(result.qualityScore).toBe(8);
    expect(result.evidenceStrength).toBe("strong");
    expect(result.feedback).toMatch(/Product System Review Standard/i);
    expect(result.nextUpgrade).toMatch(/Implement|test/i);
  });

  it("identity escalation stays blocked until implementation or external proof exists", () => {
    const result = scoreProofArtifact({
      domain: "product",
      artifactType: "product system review",
      title: "Product review without shipped change",
      content: "Specific issue identified with evidence from actual output. Corrected logic proposed. Implementation path stated. Measurable test defined.",
      reflection: "This proves diagnosis, not implementation.",
      nextUpgrade: "Ship the corrected logic and show test result.",
    });

    expect(result.evidenceStrength).toBe("strong");
    expect(result.feedback).toMatch(/Product System Review Standard/i);
  });
});

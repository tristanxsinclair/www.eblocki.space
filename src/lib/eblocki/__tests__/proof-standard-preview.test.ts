import { describe, expect, it } from "vitest";
import { buildProofStandardPreview } from "../proof-standard-preview";

function criteriaText(items: string[]) {
  return items.join(" ").toLowerCase();
}

describe("proof standard preview", () => {
  it("previews product-system proof with product evidence requirements", () => {
    const preview = buildProofStandardPreview({
      domain: "product_system",
      artifactType: "product system review",
      proofAction: "Review Eblocki routing and propose corrected logic",
      proofContract: {
        domain: "product_system",
        title: "Review Eblocki coach router",
        required_artifact: "One product system review with corrected logic and measurable test",
        evidence_standard: "issue / output evidence / corrected logic / implementation path / measurable test",
      },
    });

    expect(preview.standardKey).toBe("product_system_review_standard");
    expect(preview.standardLabel).toBe("Product System Review Standard");
    expect(criteriaText(preview.requiredEvidence)).toContain("implementation path stated");
    expect(criteriaText(preview.requiredEvidence)).toContain("measurable test or acceptance criterion");
    expect(criteriaText(preview.requiredEvidence)).not.toMatch(/aglc|binding|persuasive|text-context-purpose|jurisdiction/);
    expect(preview.identityEscalationAllowed).toBe(false);
    expect(preview.identityRule).toMatch(/blocked until implementation or external test evidence/i);
  });

  it("previews source-bank proof without IRAC criteria", () => {
    const preview = buildProofStandardPreview({
      domain: "law_academic",
      artifactType: "two source-bank entries",
      proofAction: "Create two source-bank entries for BLAW1003 and LAWS1004",
      proofContract: {
        domain: "law_academic",
        title: "Create two source-bank entries",
        required_artifact: "Two completed source-bank entries",
        evidence_standard: "source name / jurisdiction / authority level / current version / key rule / assessment use",
      },
    });

    expect(preview.standardKey).toBe("law_source_bank_standard");
    expect(preview.standardLabel).toBe("Law Source Bank Standard");
    expect(criteriaText(preview.requiredEvidence)).toContain("source name");
    expect(criteriaText(preview.requiredEvidence)).toContain("authority level");
    expect(criteriaText(preview.requiredEvidence)).toContain("confidence rating");
    expect(criteriaText(preview.requiredEvidence)).not.toContain("application to facts");
    expect(criteriaText(preview.requiredEvidence)).not.toContain("irac");
    expect(preview.identityEscalationAllowed).toBe(false);
    expect(preview.identityRule).toMatch(/issue matrix, paragraph, or problem answer/i);
    expect(preview.alignmentStatus).toBe("aligned");
  });

  it("previews IRAC proof without source-bank-only criteria", () => {
    const preview = buildProofStandardPreview({
      domain: "law",
      artifactType: "IRAC paragraph",
      proofAction: "Write one IRAC paragraph on ACL s 18",
      proofContract: {
        domain: "law",
        title: "IRAC paragraph",
        required_artifact: "One IRAC paragraph with issue, rule, application, and conclusion",
        evidence_standard: "issue / rule / authority / application / conclusion",
      },
    });

    expect(preview.standardKey).toBe("law_irac_standard");
    expect(criteriaText(preview.requiredEvidence)).toContain("issue identified");
    expect(criteriaText(preview.requiredEvidence)).toContain("rule stated accurately");
    expect(criteriaText(preview.requiredEvidence)).toContain("application to facts");
    expect(criteriaText(preview.requiredEvidence)).toContain("conclusion");
    expect(criteriaText(preview.requiredEvidence)).not.toContain("current version checked");
    expect(criteriaText(preview.requiredEvidence)).not.toContain("confidence rating");
  });

  it("flags mismatched proof contracts", () => {
    const preview = buildProofStandardPreview({
      domain: "law_academic",
      artifactType: "source-bank entries",
      proofAction: "Create two source-bank entries",
      proofContract: {
        domain: "law_academic",
        title: "Mismatched law contract",
        required_artifact: "Submit one IRAC paragraph",
        evidence_standard: "issue / rule / application / conclusion",
      },
    });

    expect(preview.alignmentStatus).toBe("not_aligned");
    expect(preview.alignmentMessage).toContain("mismatched_artifact_type");
    expect(preview.alignmentMessage).toMatch(/one visible artifact/i);
  });

  it("handles no linked contract as a safe single-artifact preview", () => {
    const preview = buildProofStandardPreview({
      domain: "product_system",
      artifactType: "product system review",
    });

    expect(preview.standardKey).toBe("product_system_review_standard");
    expect(preview.alignmentStatus).toBe("no_contract");
    expect(preview.alignmentMessage).toMatch(/one visible artifact/i);
  });

  it("allows stronger identity treatment for implementation proof", () => {
    const preview = buildProofStandardPreview({
      domain: "product",
      artifactType: "implementation proof",
      proofAction: "Submit implemented file changes with tests and build result",
      proofContract: {
        domain: "product",
        title: "Implementation proof",
        required_artifact: "Implementation proof with file changes, tests, and build result",
        evidence_standard: "file changes / logic implemented / tests added / build result",
      },
    });

    expect(preview.standardKey).toBe("eblocki_implementation_standard");
    expect(preview.identityEscalationAllowed).toBe(true);
    expect(preview.identityRule).toMatch(/implementation evidence/i);
  });
});

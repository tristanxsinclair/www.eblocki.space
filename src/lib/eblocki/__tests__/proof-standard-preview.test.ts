import { describe, expect, it } from "vitest";
import { buildProofStandardPreview } from "../proof-standard-preview";

function criteriaText(items: string[]) {
  return items.join(" ").toLowerCase();
}

describe("proof standard preview", () => {
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
    expect(criteriaText(preview.requiredEvidence)).toContain("authority level");
    expect(criteriaText(preview.requiredEvidence)).not.toContain("irac");
    expect(preview.alignmentStatus).toBe("aligned");
  });

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
    expect(preview.missingStandard.toLowerCase()).toContain("measurable test");
    expect(preview.identityEscalationAllowed).toBe(false);
    expect(criteriaText(preview.requiredEvidence)).not.toContain("jurisdiction");
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
});

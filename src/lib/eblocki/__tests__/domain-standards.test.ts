import { describe, expect, it } from "vitest";
import { selectDomainStandard } from "../domain-standards";

describe("domain standard registry", () => {
  it("routes academic proof plans to the academic proof-plan standard", () => {
    expect(selectDomainStandard({ domain: "law_academic", intent: "academic_proof_plan", artifactType: "academic_proof_plan" }).key).toBe("academic_proof_plan_standard");
  });

  it("routes product router reviews to the product-system standard", () => {
    expect(selectDomainStandard({ domain: "product", intent: "product_system_review", artifactType: "product system review" }).key).toBe("product_system_review_standard");
  });

  it("routes law source bank proof to the source-bank standard", () => {
    expect(selectDomainStandard({ domain: "law_academic", intent: "law_source_bank", artifactType: "source-bank entries" }).key).toBe("law_source_bank_standard");
  });

  it("routes IRAC proof to the law IRAC standard", () => {
    expect(selectDomainStandard({ domain: "law", intent: "legal_reasoning", artifactType: "IRAC paragraph" }).key).toBe("law_irac_standard");
  });

  it("uses fallback only when no better standard exists", () => {
    expect(selectDomainStandard({ domain: "general", intent: "diagnosis", artifactType: "visible artifact" }).key).toBe("general_proof_standard");
  });
});

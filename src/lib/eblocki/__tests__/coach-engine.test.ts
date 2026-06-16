import { describe, expect, it } from "vitest";
import {
  buildCoachResponse,
  detectCoachDomain,
  detectCoachIntent,
} from "../coach-engine";

describe("coach engine", () => {
  it("routes a law mastery proof plan to academic_proof_plan", () => {
    const result = buildCoachResponse({ input: "Eblocki Proof Plan: BLAW1003 + LAWS1004 Mastery" });

    expect(result.detectedDomain).toBe("law_academic");
    expect(result.detectedIntent).toBe("academic_proof_plan");
    expect(result.detectedState).toBe("strategic_build");
    expect(result.responseMode).toBe("academic_operating_system");
    expect(result.proofAction).toMatch(/source-bank entries/i);
    expect(result.proofAction).not.toMatch(/IRAC paragraph/i);
    expect(result.recommendedProofArtifact.requiredArtifact).toMatch(/source-bank/i);
    expect(result.recommendedProofArtifact.proofStandardKey).toBe("law_source_bank_standard");
  });

  it("routes legal problem-answer prompts to legal_reasoning", () => {
    const result = buildCoachResponse({ input: "Give me a legal problem answer using IRAC for this statute issue" });
    expect(result.detectedDomain).toBe("law");
    expect(result.detectedIntent).toBe("legal_reasoning");
    expect(result.responseMode).toBe("law_reasoning");
    expect(result.proofAction).toMatch(/IRAC/i);
    expect(result.proofStandardKey).toBe("law_irac_standard");
  });

  it("routes submitted artifact critique to proof_review", () => {
    const result = buildCoachResponse({ input: "Review my proof artifact and give a Court of Evidence verdict" });
    expect(result.detectedIntent).toBe("proof_review");
    expect(result.responseMode).toBe("proof_review");
  });

  it("routes Eblocki logic critique to product_system_review", () => {
    const result = buildCoachResponse({ input: "Eblocki classified my product proof with the wrong law standard. Review the router logic." });
    expect(result.detectedDomain).toBe("product");
    expect(result.detectedIntent).toBe("product_system_review");
    expect(result.proofStandardKey).toBe("product_system_review_standard");
  });

  it("routes source-bank requests to law_source_bank", () => {
    const result = buildCoachResponse({ input: "Create a source bank entry for BLAW1003 Native Title Act" });
    expect(result.detectedIntent).toBe("law_source_bank");
    expect(result.proofActionType).toBe("source_bank");
  });

  it("detects domain and intent through helper functions", () => {
    expect(detectCoachDomain("I need an IRAC answer for statutory interpretation")).toBe("law");
    expect(detectCoachIntent("I keep avoiding this task and need one artifact")).toBe("execution_lock");
  });

  it("flags overplanning and avoidance", () => {
    const result = buildCoachResponse({ input: "I am planning too much and need more theory before I start" });
    expect(result.warning).toMatch(/Planning/i);
    expect(result.detectedIntent).toBe("execution_lock");
  });

  it("handles empty input safely", () => {
    expect(() => buildCoachResponse({ input: "" })).not.toThrow();
    expect(buildCoachResponse({ input: "" }).proofAction).toBeTruthy();
  });

  it("does not fake an AI call in deterministic fallback", () => {
    const result = buildCoachResponse({ input: "Give me the next proof action for Spanish vocab" });
    expect(result.aiPayload).toBeTruthy();
    expect(result.answer).not.toMatch(/I called|AI says|model returned/i);
  });
});

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

  it("Soft Reset coach specificity review routes to Product System Review Standard at strong 8/10", () => {
    const result = scoreProofArtifact({
      domain: "general",
      artifactType: "reflection",
      title: "Coach mode specificity test — Soft Reset",
      content: `I tested Eblocki Coach using a randomised Soft Reset creative recovery mode. The coach correctly routed the prompt as execution_lock, state overplanning, and identified that planning was replacing proof. It gave a suitable creative command in the answer: open the rough digital sketch and add exactly three deliberate layers of detail or colour. However, the Proof Action card fell back to generic wording: "Produce one visible artifact in 25 minutes." This shows the router worked but the response composer did not fully propagate the specific creative action into the proof card. Acceptance test: For Soft Reset mode, Coach should output one calm creative proof action and the Proof Action card should match.`,
      reflection: "Specificity leak in the response composer means strong routing without elite implementation proof.",
      nextUpgrade: "When the answer contains a specific proof action, the Proof Action card should inherit it.",
    });

    expect(result.feedback).toMatch(/Product System Review Standard/i);
    expect(result.qualityScore).toBeLessThanOrEqual(8);
    expect(result.evidenceStrength).not.toBe("elite");
  });

  it("future intent in nextUpgrade does not satisfy implementation evidence", () => {
    const result = scoreProofArtifact({
      domain: "product",
      artifactType: "product system review",
      title: "Router critique",
      content: "Specific product issue identified. Evidence from actual output. Corrected logic proposed. Implementation path stated. Acceptance test defined.",
      reflection: "Diagnosis only.",
      nextUpgrade: "Will add file changes, tests added, and build result later.",
    });
    expect(result.qualityScore).toBeLessThanOrEqual(8);
    expect(result.feedback).toMatch(/Product System Review Standard/i);
  });

  it("verdict nextUpgrade does not include the full artifact body", () => {
    const longBody = "Content: huge artifact body ".repeat(40) +
      "\nNext upgrade: Fix specificity propagation into Proof Action card.\nAcceptance test: Proof Action card matches answer.";
    const result = scoreProofArtifact({
      domain: "general",
      artifactType: "reflection",
      title: "Coach review",
      content: longBody,
      reflection: "Diagnosis only.",
      nextUpgrade: longBody,
    });
    expect(result.nextUpgrade).toBe("Fix specificity propagation into Proof Action card.");
    expect(result.nextUpgrade).not.toMatch(/huge artifact body/);
  });
});

describe("Standard selection signal scan", () => {
  it("manual product-system artifact type never falls back to General Proof Standard", () => {
    const result = scoreProofArtifact({
      domain: "general",
      artifactType: "product system review",
      title: "Anything",
      content: "Specific issue identified. Output evidence. Corrected logic.",
      reflection: "ok",
      nextUpgrade: "ok",
    });
    expect(result.feedback).toMatch(/Product System Review Standard/i);
    expect(result.feedback).not.toMatch(/General Proof Standard/i);
  });

  it("a clearly completed concrete general artifact can still use General Proof Standard", () => {
    const longConcrete = "I wrote and shipped a 600-word reflection on practice. ".repeat(8) +
      "I produced a visible artifact and attached it. Feedback awareness: I noticed the weak section. Next upgrade: tighten the opening.";
    const result = scoreProofArtifact({
      domain: "general",
      artifactType: "written answer",
      title: "Practice reflection",
      content: longConcrete,
      reflection: "Honest feedback about what I produced and what to tighten next time.",
      nextUpgrade: "Tighten the opening paragraph.",
    });
    expect(result.feedback).toMatch(/General Proof Standard/i);
  });
});

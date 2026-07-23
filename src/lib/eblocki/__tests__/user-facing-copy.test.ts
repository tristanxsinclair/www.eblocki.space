import { describe, expect, it } from "vitest";
import {
  buildImprovementLoopPresentation,
  compressForecastSummary,
  hasProofOnDate,
  plainCourtVerdict,
  plainEvidenceStrength,
  plainLedgerText,
  proofResultCopy,
  plainRiskLine,
  plainTierLabel,
  plainVerdictLabel,
  resolveTodayClosure,
} from "../user-facing-copy";

describe("user-facing-copy", () => {
  it("detects proof on a given date", () => {
    expect(hasProofOnDate([{ created_at: "2026-07-06T12:00:00Z" }], "2026-07-06")).toBe(true);
    expect(hasProofOnDate([{ created_at: "2026-07-05T12:00:00Z" }], "2026-07-06")).toBe(false);
  });

  it("maps strength to plain verdict labels", () => {
    expect(plainVerdictLabel("strong", 8)).toBe("Counted");
    expect(plainVerdictLabel("moderate", 6)).toBe("Needs upgrade");
    expect(plainVerdictLabel("weak", 3)).toBe("Did not count yet");
    expect(plainVerdictLabel(null, null)).toBe("Did not count yet");
  });

  it("maps internal strength tokens to plain evidence language", () => {
    expect(plainEvidenceStrength("accepted_strong")).toBe("Strong proof");
    expect(plainEvidenceStrength("accepted_useful")).toBe("Useful proof");
    expect(plainEvidenceStrength("elite")).toBe("Elite proof");
  });

  it("builds honest proof result copy without raw strength enums", () => {
    const weak = proofResultCopy({ strength: "weak", score: 3, nextUpgrade: "Add a visible paragraph." });
    expect(weak.headline).toBe("Proof submitted. It does not count yet.");
    expect(weak.countStatus).toBe("Did not count yet");
    expect(weak.primaryAction).toBe("improve");
    expect(weak.headline).not.toContain("weak");

    const first = proofResultCopy({ strength: "moderate", score: 6, firstProofMode: true });
    expect(first.headline).toBe("Proof submitted. Needs upgrade.");
    expect(first.primaryLabel).toBe("See my next step");

    const strong = proofResultCopy({ strength: "strong", score: 8, nextUpgrade: "Use the same standard tomorrow." });
    expect(strong.countStatus).toBe("Counted");
    expect(strong.primaryAction).toBe("dashboard");
    expect(strong.headline).not.toContain("strong");
  });

  it("maps court verdict enums", () => {
    expect(plainCourtVerdict("accepted_strong")).toBe("Strong proof");
    expect(plainCourtVerdict("accepted_useful")).toBe("Useful proof");
  });

  it("maps tier labels for operator surfaces", () => {
    expect(plainTierLabel(1)).toBe("Basic evidence");
    expect(plainTierLabel(3)).toBe("High-quality evidence");
  });

  it("resolves today closure — day only closes when proof counts", () => {
    expect(resolveTodayClosure(false).status).toBe("open");
    expect(resolveTodayClosure(true, "weak", 3).status).toBe("still_open");
    expect(resolveTodayClosure(true, "moderate", 6).status).toBe("still_open");
    expect(resolveTodayClosure(true, "strong", 8).status).toBe("closed");
    expect(resolveTodayClosure(true, null, null).status).toBe("filed_pending");
  });

  it("compresses risk lines without internal enum language", () => {
    expect(plainRiskLine("shallow_proof")).toBe("Shallow proof");
    expect(plainRiskLine("accepted_strong required").toLowerCase()).toContain("strong proof");
  });

  it("scrubs ledger summary enums", () => {
    expect(plainLedgerText("accepted_strong tier 3")).not.toContain("accepted_strong");
    expect(plainLedgerText("accepted_strong tier 3").toLowerCase()).toContain("strong proof");
    expect(plainLedgerText("accepted_strong tier 3").toLowerCase()).toContain("high-quality evidence");
  });

  it("builds a compressed forecast summary when evidence exists", () => {
    const summary = compressForecastSummary({
      hasEvidence: true,
      risk: { primaryFailureMode: "shallow_proof", drift: 40, shallow: 20, overload: 0, neglect: 0 },
      intervention: { command: "Submit one strong artifact today.", blocked: "", timeboxMinutes: 30, domain: "law", artifactRequired: "accepted_strong" },
    } as never);
    expect(summary).toContain("Main risk:");
    expect(summary).toContain("Next proof:");
    expect(summary).not.toContain("accepted_strong");
  });

  it("builds a strong verdict with a specific gap and correction", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "strong",
      score: 8,
      feedback: "Strong evidence against Product System Review Standard. The artifact shows applied skill.",
      missingStandard: "Missing product-system standard: actual output evidence, corrected logic, implementation path, measurable test, and next upgrade.",
      nextUpgrade: "Run verification and document the before/after behavior.",
      selectedStandard: "Product System Review Standard",
      requiredEvidence: ["evidence from actual output/screen"],
      artifactType: "product system review",
      modeId: "EBLOCKI_PRODUCT_REVIEW",
    });

    expect(result?.verdict.headline).toBe("This artifact supports strong proof.");
    expect(result?.verdict.summary).toContain("Strong evidence under Product System Review Standard");
    expect(result?.gap?.label).toBe("product-system standard gap");
    expect(result?.correction?.action).toBe("Run verification and document the before/after behavior.");
    expect(result?.correction?.expectedArtifact).toBe("A corrected product system review that shows evidence from actual output/screen.");
  });

  it("builds a moderate verdict with a gap and correction", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "moderate",
      score: 6,
      feedback: "Moderate evidence against General Proof Standard.",
      missingStandard: "Missing general proof standard: visible artifact, applied detail, feedback awareness, and next upgrade.",
      nextUpgrade: "Add one concrete example and the correction you will test next.",
      selectedStandard: "General Proof Standard",
      requiredEvidence: ["visible artifact"],
      artifactType: "written answer",
    });

    expect(result?.verdict.headline).toBe("This artifact shows a partial proof.");
    expect(result?.details.countStatus).toBe("Needs upgrade");
    expect(result?.gap?.explanation).toContain("visible artifact");
    expect(result?.correction?.expectedArtifact).toBe("A corrected written answer that shows visible artifact.");
  });

  it("builds an honest weak or rejected proof gap", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "rejected",
      score: 1,
      missingStandard: "Missing general proof standard: visible artifact, applied detail, feedback awareness, and next upgrade.",
      selectedStandard: "General Proof Standard",
    });

    expect(result?.verdict.headline).toBe("This artifact does not count yet.");
    expect(result?.details.countStatus).toBe("Did not count yet");
    expect(result?.gap?.label).toBe("general proof standard gap");
  });

  it("returns no gap when verdict data has no reliable gap", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "strong",
      score: 8,
      selectedStandard: "General Proof Standard",
      nextUpgrade: "Repeat the standard tomorrow.",
    });

    expect(result?.gap).toBeNull();
    expect(result?.correction?.action).toBe("Repeat the standard tomorrow.");
  });

  it("returns a gap without fabricating a correction", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "moderate",
      score: 5,
      missingStandard: "Missing general proof standard: visible artifact and next upgrade.",
      selectedStandard: "General Proof Standard",
    });

    expect(result?.gap?.label).toBe("general proof standard gap");
    expect(result?.correction).toBeNull();
  });

  it("returns null for an empty result", () => {
    expect(buildImprovementLoopPresentation({ status: "ready" })).toBeNull();
  });

  it("suppresses stale result presentation while loading", () => {
    expect(buildImprovementLoopPresentation({
      status: "loading",
      strength: "strong",
      score: 8,
      nextUpgrade: "Repeat the standard.",
    })).toBeNull();
  });

  it("suppresses stale result presentation on error", () => {
    expect(buildImprovementLoopPresentation({
      status: "error",
      strength: "strong",
      score: 8,
      nextUpgrade: "Repeat the standard.",
    })).toBeNull();
  });

  it("humanises internal enum values in user-visible presentation fields", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "accepted_strong",
      score: 8,
      feedback: "accepted_strong result for EBLOCKI_PRODUCT_REVIEW.",
      missingStandard: "Missing accepted_strong standard: EBLOCKI_PRODUCT_REVIEW.",
      nextUpgrade: "Submit an accepted_strong artifact.",
      selectedStandard: "EBLOCKI_PRODUCT_REVIEW",
      modeId: "EBLOCKI_PRODUCT_REVIEW",
    });
    const rendered = JSON.stringify({
      verdict: result?.verdict,
      gap: result?.gap,
      correction: result?.correction,
      details: result?.details,
    });

    expect(result?.details.standardLabel).toBe("Eblocki Product Review");
    expect(rendered).not.toContain("accepted_strong");
    expect(rendered).not.toContain("EBLOCKI_PRODUCT_REVIEW");
  });

  it("does not render infrastructure terms from source fields", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "moderate",
      score: 5,
      feedback: "Tune the model prompt.",
      missingStandard: "Missing prompt detail.",
      nextUpgrade: "Rewrite the OpenAI retrieval prompt.",
      selectedStandard: "General Proof Standard",
    });
    const rendered = JSON.stringify(result).toLowerCase();

    expect(result?.verdict.summary).toContain("General Proof Standard");
    expect(result?.gap).toBeNull();
    expect(result?.correction).toBeNull();
    expect(rendered).not.toMatch(/\b(model|vector|embedding|retrieval|prompt|llm|openai|token)\b/);
  });

  it("does not duplicate the dominant verdict headline across presentation fields", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "strong",
      score: 8,
      selectedStandard: "General Proof Standard",
      nextUpgrade: "Repeat the standard.",
    });
    const values = [
      result?.verdict.headline,
      result?.verdict.summary,
      result?.gap?.label,
      result?.gap?.explanation,
      result?.correction?.action,
      result?.correction?.expectedArtifact,
    ];

    expect(values.filter((value) => value === result?.verdict.headline)).toHaveLength(1);
  });

  it("uses the existing proof route safely for corrected attempts", () => {
    const result = buildImprovementLoopPresentation({
      status: "ready",
      strength: "moderate",
      score: 6,
      nextUpgrade: "Add one visible correction.",
      modeId: "GENERAL_EXECUTION",
      contractId: "contract-123",
      artifactType: "written answer",
    });

    expect(result?.primaryAction).toBe("corrected_attempt");
    expect(result?.primaryLabel).toBe("Submit corrected attempt");
    expect(result?.correctedAttemptHref).toBe("/proof?mode=GENERAL_EXECUTION&contract=contract-123");
    expect(result?.correctedAttemptHref).not.toContain("correction=");
    expect(result?.correctedAttemptHref).not.toContain("artifact=");
  });
});

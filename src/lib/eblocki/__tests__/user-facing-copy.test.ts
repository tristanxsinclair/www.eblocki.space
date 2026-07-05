import { describe, expect, it } from "vitest";
import {
  compressForecastSummary,
  hasProofOnDate,
  plainCourtVerdict,
  plainEvidenceStrength,
  plainLedgerText,
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
});
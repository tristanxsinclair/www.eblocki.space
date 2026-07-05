import { describe, expect, it } from "vitest";
import {
  compressForecastSummary,
  hasProofOnDate,
  plainEvidenceStrength,
  plainRiskLine,
  plainVerdictLabel,
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
    expect(plainEvidenceStrength("accepted_strong")).toBe("strong proof");
    expect(plainEvidenceStrength("elite")).toBe("elite proof");
  });

  it("compresses risk lines without internal enum language", () => {
    expect(plainRiskLine("shallow_proof")).toBe("Shallow proof");
    expect(plainRiskLine("accepted_strong required").toLowerCase()).toContain("strong proof");
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
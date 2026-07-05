import { describe, it, expect } from "vitest";
import {
  isEvidenceStrength,
  verdictIdentityImpact,
} from "@/lib/eblocki/verdict-identity-impact";

describe("isEvidenceStrength", () => {
  it("accepts only current evidence strength values", () => {
    expect(isEvidenceStrength("weak")).toBe(true);
    expect(isEvidenceStrength("moderate")).toBe(true);
    expect(isEvidenceStrength("strong")).toBe(true);
    expect(isEvidenceStrength("elite")).toBe(true);
  });

  it("rejects legacy or invalid evidence strength values", () => {
    expect(isEvidenceStrength("useful")).toBe(false);
    expect(isEvidenceStrength("accepted_strong")).toBe(false);
    expect(isEvidenceStrength(null)).toBe(false);
    expect(isEvidenceStrength(undefined)).toBe(false);
  });
});

describe("verdictIdentityImpact", () => {
  it("weak proof protects the streak but does not compound identity", () => {
    const r = verdictIdentityImpact("weak");
    expect(r.tone).toBe("warn");
    expect(r.headline.toLowerCase()).toContain("protects the streak");
    expect(r.headline.toLowerCase()).toContain("does not compound");
  });

  it("moderate proof is accepted but not elite", () => {
    const r = verdictIdentityImpact("moderate");
    expect(r.tone).toBe("neutral");
    expect(r.headline.toLowerCase()).toContain("accepted");
  });

  it("strong proof compounds identity", () => {
    const r = verdictIdentityImpact("strong");
    expect(r.tone).toBe("good");
    expect(r.headline.toLowerCase()).toContain("compounds identity");
  });

  it("elite proof raises the future standard", () => {
    const r = verdictIdentityImpact("elite");
    expect(r.tone).toBe("elite");
    expect(r.headline.toLowerCase()).toContain("raises the future standard");
  });

  it("each strength returns a non-empty subtext", () => {
    (["weak", "moderate", "strong", "elite"] as const).forEach((s) => {
      expect(verdictIdentityImpact(s).subtext.length).toBeGreaterThan(10);
    });
  });
});

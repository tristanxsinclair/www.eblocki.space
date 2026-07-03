import { describe, it, expect } from "vitest";
import { verdictIdentityImpact } from "@/lib/eblocki/verdict-identity-impact";
import type { EvidenceStrength } from "@/lib/eblocki/proof-scoring";

export function isEvidenceStrength(value: unknown): value is EvidenceStrength {
  return (
    value === "weak" ||
    value === "useful" ||
    value === "strong" ||
    value === "elite"
  );
}

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
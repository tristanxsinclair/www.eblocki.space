import { describe, expect, it } from "vitest";
import {
  buildProductMatchingResult,
  detectPrimaryNeed,
  type ProductMatch,
} from "../product-matching";

const now = Date.now();
const recent = (offsetDays = 1) => new Date(now - offsetDays * 86_400_000).toISOString();

const partnerCandidate: ProductMatch = {
  id: "partner_focus_app",
  category: "productivity_tool",
  title: "Partner Focus App",
  description: "Pomodoro + analytics.",
  fitReason: "n/a",
  evidence: [],
  fitScore: 0,
  trustScore: 0.9,
  urgencyFit: 0,
  priceSensitivityFit: 0.8,
  monetisationType: "affiliate",
  disclosureRequired: true,
  ctaLabel: "View",
  outcomeToTrack: "product_match_clicked",
};

describe("product-matching", () => {
  it("suppresses recommendations when evidence is too thin", () => {
    const result = buildProductMatchingResult({ artifacts: [] });
    expect(result.primaryNeed).toBeNull();
    expect(result.recommendedMatches).toHaveLength(0);
    expect(result.nextBestCommercialAction).toMatch(/proof/i);
  });

  it("detects a weak-domain need from proof history", () => {
    const need = detectPrimaryNeed({
      artifacts: [
        { domain: "law", quality_score: 2, created_at: recent(1) },
        { domain: "law", quality_score: 2, created_at: recent(2) },
        { domain: "law", quality_score: 2, created_at: recent(3) },
      ],
    });
    expect(need?.source).toBe("domain_stats");
    expect(need?.domain).toBe("law");
  });

  it("recommends internal Pro to free users with a diagnosed need", () => {
    const result = buildProductMatchingResult({
      accessLevel: "free",
      artifacts: [
        { domain: "law", quality_score: 2, created_at: recent(1) },
        { domain: "law", quality_score: 2, created_at: recent(2) },
      ],
    });
    expect(result.primaryNeed).not.toBeNull();
    expect(result.recommendedMatches[0]?.monetisationType).toBe("internal_pro");
  });

  it("honours the recommendationsAllowed=false trust gate", () => {
    const result = buildProductMatchingResult({
      operatingProfile: { recommendationsAllowed: false },
      artifacts: [
        { domain: "law", quality_score: 2, created_at: recent(1) },
        { domain: "law", quality_score: 2, created_at: recent(2) },
      ],
    });
    expect(result.recommendedMatches).toHaveLength(0);
    expect(result.recommendationSummary).toMatch(/disabled/i);
  });

  it("flags monetised recommendations with a trust warning", () => {
    const result = buildProductMatchingResult({
      accessLevel: "pro",
      catalog: [partnerCandidate],
      operatingProfile: { trustPreference: "neutral" },
      artifacts: [
        { domain: "law", quality_score: 2, created_at: recent(1) },
        { domain: "law", quality_score: 2, created_at: recent(2) },
      ],
    });
    if (result.recommendedMatches[0]?.monetisationType === "affiliate") {
      expect(result.trustWarning).toMatch(/monetised/i);
    }
  });

  it("rejects no-go categories", () => {
    const result = buildProductMatchingResult({
      accessLevel: "pro",
      catalog: [partnerCandidate],
      operatingProfile: { noGoCategories: ["productivity_tool"] },
      artifacts: [
        { domain: "law", quality_score: 2, created_at: recent(1) },
        { domain: "law", quality_score: 2, created_at: recent(2) },
      ],
    });
    expect(result.recommendedMatches.find((m) => m.id === "partner_focus_app")).toBeUndefined();
  });

  it("never crashes on legacy/null data", () => {
    expect(() =>
      buildProductMatchingResult({
        artifacts: [
          // @ts-expect-error legacy shape
          { domain: null, quality_score: null, created_at: null },
        ],
      }),
    ).not.toThrow();
  });
});
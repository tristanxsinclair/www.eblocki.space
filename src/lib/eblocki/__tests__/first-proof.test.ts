import { describe, expect, it } from "vitest";
import {
  FIRST_PROOF_COPY,
  FIRST_PROOF_DEFAULTS,
  FIRST_PROOF_EXAMPLES,
  FIRST_PROOF_FORBIDDEN_TERMS,
  FIRST_PROOF_QUERY_KEY,
  FIRST_PROOF_QUERY_VALUE,
  FIRST_PROOF_STANDARD,
  FIRST_PROOF_STANDARD_PREVIEW,
  isFirstProofMode,
} from "../first-proof";
import { scoreProofArtifact } from "../proof-scoring";

describe("isFirstProofMode", () => {
  it("returns true when ?first=1 is present", () => {
    expect(isFirstProofMode(new URLSearchParams("first=1"))).toBe(true);
  });

  it("returns false when first param missing", () => {
    expect(isFirstProofMode(new URLSearchParams(""))).toBe(false);
    expect(isFirstProofMode(new URLSearchParams("mode=LAW_MAX"))).toBe(false);
  });

  it("returns false when first param is not exactly '1'", () => {
    expect(isFirstProofMode(new URLSearchParams("first=true"))).toBe(false);
    expect(isFirstProofMode(new URLSearchParams("first=0"))).toBe(false);
  });

  it("handles null and undefined safely", () => {
    expect(isFirstProofMode(null)).toBe(false);
    expect(isFirstProofMode(undefined)).toBe(false);
  });

  it("exposes the expected query key/value contract", () => {
    expect(FIRST_PROOF_QUERY_KEY).toBe("first");
    expect(FIRST_PROOF_QUERY_VALUE).toBe("1");
  });
});

describe("first-proof defaults", () => {
  it("keep GENERAL_EXECUTION, general_execution, and written answer", () => {
    expect(FIRST_PROOF_DEFAULTS).toEqual({
      modeId: "GENERAL_EXECUTION",
      domain: "general_execution",
      artifactType: "written answer",
    });
  });

  it("do not regress to economic mode/domain strings", () => {
    expect(FIRST_PROOF_DEFAULTS.modeId).not.toBe("GENERAL_ECONOMIC");
    expect(FIRST_PROOF_DEFAULTS.domain).not.toBe("general_economic");
  });

  it("flow safely through proof scoring without advanced field choices", () => {
    const result = scoreProofArtifact({
      domain: FIRST_PROOF_DEFAULTS.domain,
      artifactType: FIRST_PROOF_DEFAULTS.artifactType,
      title: "Corrected past-paper answer",
      content:
        "I wrote a corrected answer in my own words. The first version missed the issue, so I added the rule, applied the facts, and wrote a clearer conclusion.",
      reflection: "I noticed where the first pass was weak.",
      nextUpgrade: "Add one authority next time.",
    });

    expect(result.qualityScore).toBeGreaterThanOrEqual(1);
    expect(result.qualityScore).toBeLessThanOrEqual(10);
    expect(["weak", "moderate", "strong", "elite"]).toContain(result.evidenceStrength);
    expect(result.feedback).toEqual(expect.any(String));
    expect(result.nextUpgrade).toEqual(expect.any(String));
  });
});

describe("first-proof copy", () => {
  it("keeps the simplified activation copy stable", () => {
    expect(FIRST_PROOF_COPY).toMatchObject({
      title: "Submit your first proof.",
      helperHeader: "What counts?",
      successTitle: "First proof submitted.",
      successCta: "See my next step",
    });
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/paste one piece of real work/i);
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/what counted/i);
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/what to do next/i);
  });

  it("keeps the example list stable", () => {
    expect(FIRST_PROOF_EXAMPLES).toEqual([
      { domain: "Essay", example: "essay paragraph" },
      { domain: "Notes", example: "study notes in your own words" },
      { domain: "Past paper", example: "corrected past-paper answer" },
      { domain: "Law", example: "IRAC paragraph" },
      { domain: "Psychology", example: "psychology concept explanation" },
    ]);
  });

  it("keeps the first-proof standard surfaces compatible with the current Proof page", () => {
    expect(FIRST_PROOF_STANDARD.whatCounts).toMatch(/visible piece of work/i);
    expect(FIRST_PROOF_STANDARD.stronger).toMatch(/your own words/i);
    expect(FIRST_PROOF_STANDARD.whatToPaste).toMatch(/study notes/i);
    expect(FIRST_PROOF_STANDARD_PREVIEW.whatCounts).toMatch(/piece of real work/i);
    expect(FIRST_PROOF_STANDARD_PREVIEW.whatMakesItStronger).toMatch(/your own words/i);
    expect(FIRST_PROOF_STANDARD_PREVIEW.whatShouldIPaste).toMatch(/actual paragraph/i);
  });

  it("keeps first-proof copy free of forbidden advanced language", () => {
    const surface = [
      FIRST_PROOF_COPY.title,
      FIRST_PROOF_COPY.subtitle,
      FIRST_PROOF_COPY.helperHeader,
      FIRST_PROOF_COPY.successTitle,
      FIRST_PROOF_COPY.successCta,
      FIRST_PROOF_STANDARD.whatCounts,
      FIRST_PROOF_STANDARD.stronger,
      FIRST_PROOF_STANDARD.whatToPaste,
      FIRST_PROOF_STANDARD_PREVIEW.whatCounts,
      FIRST_PROOF_STANDARD_PREVIEW.whatMakesItStronger,
      FIRST_PROOF_STANDARD_PREVIEW.whatShouldIPaste,
      ...FIRST_PROOF_EXAMPLES.map((example) => `${example.domain} ${example.example}`),
    ]
      .join(" \n ")
      .toLowerCase();

    for (const term of FIRST_PROOF_FORBIDDEN_TERMS) {
      expect(surface).not.toContain(term.toLowerCase());
    }
  });
});

import { describe, it, expect } from "vitest";
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

  it("handles null/undefined safely", () => {
    expect(isFirstProofMode(null)).toBe(false);
    expect(isFirstProofMode(undefined)).toBe(false);
  });

  it("exposes the expected query key/value contract", () => {
    expect(FIRST_PROOF_QUERY_KEY).toBe("first");
    expect(FIRST_PROOF_QUERY_VALUE).toBe("1");
  });
});

describe("first-proof copy", () => {
  it("uses plain student wording for the first proof", () => {
    expect(FIRST_PROOF_COPY.title).toBe("Submit your first proof.");
    expect(FIRST_PROOF_COPY.subtitle).toBe(
      "Paste one piece of real work. Eblocki will check whether it proves progress and give you the next action.",
    );
  });

  it("includes honest success message tied to actual submission", () => {
    expect(FIRST_PROOF_COPY.successTitle).toMatch(/First proof submitted/i);
  });

  it("ships the requested student examples", () => {
    const examples = FIRST_PROOF_EXAMPLES.map((e) => e.example).join(" ");
    expect(examples).toMatch(/essay paragraph/i);
    expect(examples).toMatch(/study notes in your own words/i);
    expect(examples).toMatch(/corrected past-paper answer/i);
    expect(examples).toMatch(/IRAC paragraph/i);
    expect(examples).toMatch(/psychology concept explanation/i);
  });

  it("keeps first-proof copy free of advanced system language", () => {
    const copy = [
      FIRST_PROOF_COPY.title,
      FIRST_PROOF_COPY.subtitle,
      FIRST_PROOF_COPY.helperHeader,
      FIRST_PROOF_COPY.successTitle,
      FIRST_PROOF_STANDARD.whatCounts,
      FIRST_PROOF_STANDARD.stronger,
      FIRST_PROOF_STANDARD.whatToPaste,
      ...FIRST_PROOF_EXAMPLES.map((e) => `${e.domain} ${e.example}`),
    ].join(" ");

    expect(copy).not.toMatch(/Court|identity escalation|temporal|calibration|evidence governance|behavioural operating system/i);
  });

  it("uses defaults that can score without advanced field choices", () => {
    const result = scoreProofArtifact({
      domain: FIRST_PROOF_DEFAULTS.domain,
      artifactType: FIRST_PROOF_DEFAULTS.artifactType,
      title: "Corrected past-paper answer",
      content:
        "I wrote a corrected answer in my own words. The first version missed the issue, so I added the rule, applied the facts, and wrote a clearer conclusion. Next I need to add authority.",
    });

    expect(result.qualityScore).toBeGreaterThan(0);
    expect(result.nextUpgrade).toBeTruthy();
  it("uses the plain-language activation title", () => {
    expect(FIRST_PROOF_COPY.title).toBe("Submit your first proof.");
  });

  it("explains the loop in student wording", () => {
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/paste one piece of real work/i);
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/proves progress/i);
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/next action/i);
  });

  it("uses an honest, simple success state", () => {
    expect(FIRST_PROOF_COPY.successTitle).toBe("First proof submitted.");
    expect(FIRST_PROOF_COPY.successCta).toBe("Back to dashboard");
  });

  it("ships the documented student examples", () => {
    const examples = FIRST_PROOF_EXAMPLES.map((e) => e.example.toLowerCase());
    expect(examples).toEqual(
      expect.arrayContaining([
        "essay paragraph",
        "study notes in your own words",
        "corrected past-paper answer",
        "irac paragraph",
        "psychology concept explanation",
      ]),
    );
  });

  it("never exposes advanced operator language above the fold", () => {
    const surface = [
      FIRST_PROOF_COPY.title,
      FIRST_PROOF_COPY.subtitle,
      FIRST_PROOF_COPY.helperHeader,
      FIRST_PROOF_COPY.successTitle,
      FIRST_PROOF_COPY.successCta,
      FIRST_PROOF_STANDARD_PREVIEW.whatCounts,
      FIRST_PROOF_STANDARD_PREVIEW.whatMakesItStronger,
      FIRST_PROOF_STANDARD_PREVIEW.whatShouldIPaste,
      ...FIRST_PROOF_EXAMPLES.map((e) => `${e.domain} ${e.example}`),
    ]
      .join(" \n ")
      .toLowerCase();
    for (const term of FIRST_PROOF_FORBIDDEN_TERMS) {
      expect(surface).not.toContain(term.toLowerCase());
    }
  });
});

describe("first-proof defaults", () => {
  it("flow safely through proof scoring without error", () => {
    const result = scoreProofArtifact({
      domain: FIRST_PROOF_DEFAULTS.domain,
      artifactType: FIRST_PROOF_DEFAULTS.artifactType,
      title: "First proof",
      content:
        "Here is one paragraph I wrote from memory about classical conditioning. " +
        "Pavlov showed that a neutral stimulus can come to evoke a response after pairing.",
      reflection: "I noticed I was vague on the mechanism.",
      nextUpgrade: "Add one concrete example next time.",
    });
    expect(typeof result.qualityScore).toBe("number");
    expect(result.qualityScore).toBeGreaterThanOrEqual(1);
    expect(result.qualityScore).toBeLessThanOrEqual(10);
    expect(["weak", "moderate", "strong", "elite"]).toContain(result.evidenceStrength);
    expect(typeof result.feedback).toBe("string");
    expect(typeof result.nextUpgrade).toBe("string");
  });
});

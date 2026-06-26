import { describe, it, expect } from "vitest";
import {
  FIRST_PROOF_COPY,
  FIRST_PROOF_DEFAULTS,
  FIRST_PROOF_EXAMPLES,
  FIRST_PROOF_QUERY_KEY,
  FIRST_PROOF_QUERY_VALUE,
  FIRST_PROOF_STANDARD,
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
  });
});

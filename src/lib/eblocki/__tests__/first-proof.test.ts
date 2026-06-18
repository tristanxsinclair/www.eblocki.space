import { describe, it, expect } from "vitest";
import {
  FIRST_PROOF_COPY,
  FIRST_PROOF_EXAMPLES,
  FIRST_PROOF_QUERY_KEY,
  FIRST_PROOF_QUERY_VALUE,
  isFirstProofMode,
} from "../first-proof";

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
  it("includes activation title and subtitle", () => {
    expect(FIRST_PROOF_COPY.title).toMatch(/Activate Eblocki/i);
    expect(FIRST_PROOF_COPY.subtitle).toMatch(/evidence/i);
  });

  it("includes honest success message tied to actual submission", () => {
    expect(FIRST_PROOF_COPY.successTitle).toMatch(/First proof submitted/i);
    expect(FIRST_PROOF_COPY.successTitle).toMatch(/Dashboard intelligence is now active/i);
  });

  it("ships at least the documented five domain examples", () => {
    const domains = FIRST_PROOF_EXAMPLES.map((e) => e.domain);
    expect(domains).toEqual(
      expect.arrayContaining(["Study", "Work", "Build", "Training", "Life"]),
    );
  });
});

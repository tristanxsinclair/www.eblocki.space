import { describe, expect, it } from "vitest";
import { buildTwoSourceBankProofTask, getLawMasteryStarterPath, validateLawSourceBankEntry } from "../law-mastery";

describe("law mastery loop", () => {
  it("validates source-bank template fields", () => {
    const [entry] = getLawMasteryStarterPath("BLAW1003");
    expect(validateLawSourceBankEntry(entry)).toBe(true);
    expect(entry.currentVersionChecked).toBe(false);
    expect(entry.confidenceRating).toBe(1);
  });

  it("generates safe BLAW1003 and LAWS1004 starter tasks", () => {
    expect(getLawMasteryStarterPath("BLAW1003").map((entry) => entry.sourceName)).toContain("Native Title Act 1993 (Cth)");
    expect(getLawMasteryStarterPath("LAWS1004").map((entry) => entry.sourceName)).toContain("Competition and Consumer Act 2010 (Cth)");
  });

  it("does not invent completed legal authority notes", () => {
    const [entry] = getLawMasteryStarterPath("LAWS1004");
    expect(entry.keyRule).toMatch(/Do not complete until checked/i);
    expect(entry.currentVersionChecked).toBe(false);
  });

  it("produces the next academic proof task copy", () => {
    expect(buildTwoSourceBankProofTask()).toMatch(/Create two source-bank entries/i);
    expect(buildTwoSourceBankProofTask()).toMatch(/BLAW1003/i);
    expect(buildTwoSourceBankProofTask()).toMatch(/LAWS1004/i);
  });
});

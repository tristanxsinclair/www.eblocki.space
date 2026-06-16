import { describe, expect, it } from "vitest";
import { extractNextUpgrade, NEXT_UPGRADE_MAX_CHARS } from "../next-upgrade-extract";

describe("extractNextUpgrade", () => {
  it("returns explicit nextUpgrade when short", () => {
    expect(extractNextUpgrade({ nextUpgrade: "Ship the fix and run tests." }))
      .toBe("Ship the fix and run tests.");
  });

  it("extracts the actual Next upgrade line from a long content body", () => {
    const content = `Content: I tested Eblocki Coach with Soft Reset mode...
It gave a creative answer.
However, the Proof Action card fell back to generic wording.
Next upgrade: Fix specificity propagation into Proof Action card.
Acceptance test: For Soft Reset mode, Coach should output one calm creative proof action.`;
    const out = extractNextUpgrade({ content });
    expect(out).toBe("Fix specificity propagation into Proof Action card.");
    expect(out).not.toMatch(/I tested Eblocki Coach/);
  });

  it("prefers embedded Next upgrade line even if nextUpgrade field is a paste of the artifact body", () => {
    const paste = `Content: full artifact body here...
Next upgrade: Implement composer specificity guard.
Acceptance test: Proof Action card matches answer.`;
    const out = extractNextUpgrade({ nextUpgrade: paste });
    expect(out).toBe("Implement composer specificity guard.");
  });

  it("caps long output around the max length", () => {
    const long = "x".repeat(600);
    const out = extractNextUpgrade({ nextUpgrade: long });
    expect(out.length).toBeLessThanOrEqual(NEXT_UPGRADE_MAX_CHARS);
    expect(out.endsWith("…")).toBe(true);
  });

  it("falls back to provided fallback when nothing else is present", () => {
    expect(extractNextUpgrade({ fallback: "Next upgrade default." }))
      .toBe("Next upgrade default.");
  });

  it("uses a safe default when nothing is provided", () => {
    expect(extractNextUpgrade({})).toMatch(/implementation or external test/i);
  });
});
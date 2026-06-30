import { describe, expect, it } from "vitest";
import { parseCoachMarkdownSections } from "../coach-response";

describe("parseCoachMarkdownSections", () => {
  it("splits markdown headings into structured sections", () => {
    const md = [
      "## Diagnosis",
      "The issue is avoidance.",
      "",
      "## Plan",
      "- Step 1",
      "- Step 2",
      "",
      "## Proof",
      "Write a 200 word answer.",
    ].join("\n");
    const out = parseCoachMarkdownSections(md);
    expect(out).toHaveLength(3);
    expect(out[0].heading).toBe("Diagnosis");
    expect(out[1].heading).toBe("Plan");
    expect(out[2].body).toMatch(/200 word/);
  });

  it("strips bold markers from body content", () => {
    const out = parseCoachMarkdownSections("## Title\n**important** notice");
    expect(out[0].body).not.toMatch(/\*\*/);
    expect(out[0].body).toMatch(/important/);
  });

  it("returns a single Response section when no markdown headings exist", () => {
    const out = parseCoachMarkdownSections("Plain text response with no headings.");
    expect(out).toHaveLength(1);
    expect(out[0].heading).toBe("Response");
  });

  it("returns empty array for empty input", () => {
    expect(parseCoachMarkdownSections("")).toEqual([]);
    expect(parseCoachMarkdownSections("   \n\n")).toEqual([]);
  });
});
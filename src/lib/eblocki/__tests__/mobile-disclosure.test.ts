import { describe, it, expect } from "vitest";
import {
  MOBILE_ARTIFACT_SUMMARY_CHARS,
  MOBILE_LEDGER_DEFAULT,
  MOBILE_RECENT_PROOF_DEFAULT,
  isCollapsedByDefault,
  mobileLedgerLimit,
  mobileRecentProofLimit,
  summariseArtifactContent,
} from "../mobile-disclosure";

describe("mobile-disclosure helpers", () => {
  it("limits recent proof to the mobile default unless expanded", () => {
    expect(mobileRecentProofLimit(10, false)).toBe(MOBILE_RECENT_PROOF_DEFAULT);
    expect(mobileRecentProofLimit(10, true)).toBe(10);
    expect(mobileRecentProofLimit(1, false)).toBe(1);
    expect(mobileRecentProofLimit(0, false)).toBe(0);
  });

  it("limits ledger entries to the mobile default unless expanded", () => {
    expect(mobileLedgerLimit(20, false)).toBe(MOBILE_LEDGER_DEFAULT);
    expect(mobileLedgerLimit(20, true)).toBe(20);
    expect(mobileLedgerLimit(2, false)).toBe(2);
  });

  it("summarises artifact content with ellipsis when long", () => {
    const long = "x".repeat(MOBILE_ARTIFACT_SUMMARY_CHARS + 50);
    const out = summariseArtifactContent(long);
    expect(out.length).toBeLessThanOrEqual(MOBILE_ARTIFACT_SUMMARY_CHARS);
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns full text when under the summary limit", () => {
    expect(summariseArtifactContent("short text")).toBe("short text");
  });

  it("handles null/undefined safely", () => {
    expect(summariseArtifactContent(null)).toBe("");
    expect(summariseArtifactContent(undefined)).toBe("");
  });

  it("collapses normalised whitespace", () => {
    expect(summariseArtifactContent("  hello\n\nworld  ")).toBe("hello world");
  });

  it("collapses advanced sections by default on mobile only", () => {
    expect(isCollapsedByDefault("forecast_map", true)).toBe(true);
    expect(isCollapsedByDefault("forecast_map", false)).toBe(false);
    expect(isCollapsedByDefault("product_match", true)).toBe(true);
  });
});
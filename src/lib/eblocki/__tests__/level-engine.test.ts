import { describe, it, expect } from "vitest";
import {
  levelThreshold, rankFor, operatorTitle, baseXP, streakMult,
  classifyTier, judgeCourt, computeXP, canonDomain, previewProof,
} from "../level-engine";

describe("level thresholds", () => {
  it("starts at 100 and scales exponentially", () => {
    expect(levelThreshold(1)).toBe(100);
    expect(levelThreshold(2)).toBeGreaterThan(100);
    expect(levelThreshold(5)).toBeGreaterThan(levelThreshold(4));
  });
});

describe("rank + title", () => {
  it("maps level ranges to ranks", () => {
    expect(rankFor(1)).toBe("Initiate");
    expect(rankFor(8)).toBe("Structured Operator");
    expect(rankFor(80)).toBe("System Sovereign");
  });
  it("title escalates", () => {
    expect(operatorTitle(1)).toBe("Emerging Operator");
    expect(operatorTitle(25)).toBe("Identity Operator");
  });
});

describe("domain canon", () => {
  it("maps legacy domains", () => {
    expect(canonDomain("sport")).toBe("soccer");
    expect(canonDomain("career_money")).toBe("finance");
    expect(canonDomain("brand")).toBe("life");
    expect(canonDomain(null)).toBe("life");
  });
});

describe("classifyTier", () => {
  it("escalates by evidence strength + length", () => {
    expect(classifyTier({ content: "x", quality: 1 })).toBe(1);
    expect(classifyTier({ content: "a".repeat(100), quality: 2 })).toBe(2);
    expect(classifyTier({ content: "a".repeat(300), quality: 4, evidenceStrength: "strong" })).toBe(3);
    expect(classifyTier({ content: "a".repeat(100), quality: 3, pressureFlag: true })).toBe(4);
    expect(classifyTier({ content: "a".repeat(100), quality: 5, transferFlag: true })).toBe(5);
    expect(classifyTier({ content: "a".repeat(500), quality: 5, evidenceStrength: "elite" })).toBe(6);
  });
});

describe("court", () => {
  it("rejects duplicates and vague low-quality", () => {
    expect(judgeCourt({ tier: 3, quality: 5, isDuplicate: true })).toBe("rejected");
    expect(judgeCourt({ tier: 2, quality: 2, vague: true })).toBe("rejected");
    expect(judgeCourt({ tier: 1, quality: 1 })).toBe("rejected");
  });
  it("grants elite only for tier 5+ quality 4+", () => {
    expect(judgeCourt({ tier: 5, quality: 5 })).toBe("elite");
    expect(judgeCourt({ tier: 3, quality: 5 })).toBe("accepted_strong");
    expect(judgeCourt({ tier: 2, quality: 3 })).toBe("accepted_useful");
  });
});

describe("computeXP", () => {
  it("zero XP when rejected", () => {
    expect(computeXP({ tier: 5, quality: 5, verdict: "rejected" }).final).toBe(0);
  });
  it("scales with quality and streak", () => {
    const lo = computeXP({ tier: 3, quality: 3, verdict: "accepted_useful" }).final;
    const hi = computeXP({ tier: 3, quality: 5, verdict: "accepted_strong", streakDays: 14 }).final;
    expect(hi).toBeGreaterThan(lo);
  });
  it("applies diminishing returns past 5/day", () => {
    const fresh = computeXP({ tier: 2, quality: 4, verdict: "accepted_strong", sameDomainCountToday: 0 }).final;
    const spammed = computeXP({ tier: 2, quality: 4, verdict: "accepted_strong", sameDomainCountToday: 6 }).final;
    expect(spammed).toBeLessThan(fresh);
  });
});

describe("previewProof", () => {
  it("returns tier + verdict + xp", () => {
    const p = previewProof({ content: "a".repeat(300), quality: 5, evidenceStrength: "strong" });
    expect(p.tier).toBe(3);
    expect(p.verdict).toBe("accepted_strong");
    expect(p.xp.final).toBeGreaterThan(0);
  });
  it("rejects empty content", () => {
    const p = previewProof({ content: "", quality: 1 });
    expect(p.verdict).toBe("rejected");
    expect(p.xp.final).toBe(0);
  });
});

describe("base + streak tables", () => {
  it("base xp monotonic by tier", () => {
    expect(baseXP(6)).toBeGreaterThan(baseXP(5));
    expect(baseXP(5)).toBeGreaterThan(baseXP(4));
  });
  it("streak mult monotonic", () => {
    expect(streakMult(90)).toBeGreaterThan(streakMult(30));
    expect(streakMult(30)).toBeGreaterThan(streakMult(7));
    expect(streakMult(0)).toBe(1.0);
  });
});
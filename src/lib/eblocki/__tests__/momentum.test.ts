import { describe, it, expect } from "vitest";
import { buildSnapshot, computeMomentumScore } from "../momentum";
import { FIXTURES } from "./fixtures";

const PRIOR_ZERO = { longestStreak: 0, freezeTokensEarnedTotal: 0, freezeTokensUsedTotal: 0 };

describe("momentum scoring", () => {
  it("fresh user has zero score and cold state", () => {
    const snap = buildSnapshot({ proofs: FIXTURES.fresh.proofs, prior: PRIOR_ZERO });
    expect(snap.momentum_score).toBe(0);
    expect(snap.state).toBe("cold");
    expect(snap.streak_days).toBe(0);
  });

  it("strong streak user is momentum or elite", () => {
    const snap = buildSnapshot({
      proofs: FIXTURES.strong_streak.proofs,
      prior: PRIOR_ZERO,
      activeMode: FIXTURES.strong_streak.modeId,
    });
    expect(snap.momentum_score).toBeGreaterThanOrEqual(60);
    expect(["momentum", "elite"]).toContain(snap.state);
    expect(snap.streak_days).toBeGreaterThanOrEqual(5);
  });

  it("shallow user is penalised by depth", () => {
    const shallow = buildSnapshot({ proofs: FIXTURES.shallow.proofs, prior: PRIOR_ZERO });
    const strong = buildSnapshot({ proofs: FIXTURES.strong_streak.proofs, prior: PRIOR_ZERO });
    expect(shallow.momentum_score).toBeLessThan(strong.momentum_score);
    expect(shallow.avg_quality).toBeLessThan(4);
  });

  it("at-risk user is classified at_risk when no proof today", () => {
    const snap = buildSnapshot({ proofs: FIXTURES.at_risk.proofs, prior: PRIOR_ZERO });
    expect(snap.proofs_today).toBe(0);
    expect(snap.state).toBe("at_risk");
  });

  it("freeze tokens cap at 3", () => {
    const snap = buildSnapshot({
      proofs: FIXTURES.strong_streak.proofs,
      prior: { longestStreak: 30, freezeTokensEarnedTotal: 6, freezeTokensUsedTotal: 0 },
    });
    expect(snap.freeze_tokens).toBeLessThanOrEqual(3);
  });

  it("LAW_MAX mode boosts IRAC proof effective quality", () => {
    const withMode = computeMomentumScore(FIXTURES.strong_streak.proofs, new Date(), "LAW_MAX");
    const noMode = computeMomentumScore(FIXTURES.strong_streak.proofs, new Date());
    expect(withMode.avgQuality).toBeGreaterThanOrEqual(noMode.avgQuality);
  });

  it("score never exceeds 100", () => {
    for (const f of Object.values(FIXTURES)) {
      const snap = buildSnapshot({ proofs: f.proofs, prior: PRIOR_ZERO });
      expect(snap.momentum_score).toBeLessThanOrEqual(100);
      expect(snap.momentum_score).toBeGreaterThanOrEqual(0);
    }
  });
});
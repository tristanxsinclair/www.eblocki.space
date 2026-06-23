import { describe, it, expect } from "vitest";
import { computeTemporal, type ProofArtifactLike, type VerdictLike } from "../temporal-engine";
import {
  buildTemporalSnapshot,
  calibrateForecast,
  runTemporalRealityCheck,
} from "../temporal-calibration";
import { summariseInterventionMemory, recordFromCalibration } from "../intervention-memory";
import { computeTemporalIntelligenceScore } from "../temporal-intelligence-score";
import { buildTemporalCoachContext } from "../temporal-coach-context";

const now = new Date("2026-06-04T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function mk(over: Partial<ProofArtifactLike> = {}): ProofArtifactLike {
  return {
    id: Math.random().toString(36).slice(2),
    domain: "law",
    quality_score: 6,
    evidence_strength: "moderate",
    transfer_flag: false,
    pressure_flag: false,
    proof_tier: 2,
    created_at: daysAgo(1),
    ...over,
  };
}

describe("snapshot", () => {
  it("includes model version and strips long proof text", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const longCommand = "x".repeat(5000);
    r.intervention.command = longCommand;
    const snap = buildTemporalSnapshot(r);
    expect(snap.modelVersion).toMatch(/temporal-/);
    expect(snap.proofRequired.length).toBeLessThan(longCommand.length);
    expect(snap.predictionId).toBeTruthy();
  });
});

describe("calibration", () => {
  it("forecast followed and proof improved", () => {
    const r = computeTemporal({ now, artifacts: [mk({ evidence_strength: "weak" })], activeDomains: ["law"] });
    const snap = buildTemporalSnapshot(r);
    const cal = calibrateForecast(snap, {
      windowHours: 24,
      artifactsAfter: [mk({ evidence_strength: "strong", quality_score: 8 })],
      verdictsAfter: [{ verdict: "accepted_strong", created_at: new Date().toISOString() }],
      ledgerAfter: [],
    });
    expect(cal.forecastFollowed).toBe(true);
    expect(cal.proofImproved).toBe(true);
    expect(cal.accuracyScore).toBeGreaterThan(60);
  });

  it("forecast ignored and risk occurred", () => {
    const r = computeTemporal({ now, artifacts: [], activeDomains: ["law"] });
    const snap = buildTemporalSnapshot(r);
    const cal = calibrateForecast(snap, {
      windowHours: 24, artifactsAfter: [], verdictsAfter: [], ledgerAfter: [],
    });
    expect(cal.realityCheck.verdict).toBe("insufficient_data");
    expect(cal.proofImproved).toBe(false);
  });

  it("no later proof => unknown/insufficient", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const snap = buildTemporalSnapshot(r);
    const cal = calibrateForecast(snap, {
      windowHours: 24, artifactsAfter: [], verdictsAfter: [], ledgerAfter: [],
    });
    expect(cal.realityCheck.verdict).toBe("insufficient_data");
  });

  it("low-confidence forecast does not overclaim", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const snap = buildTemporalSnapshot(r);
    snap.confidenceLevel = "low";
    const cal = calibrateForecast(snap, {
      windowHours: 24,
      artifactsAfter: [mk({ evidence_strength: "weak", quality_score: 3 })],
      verdictsAfter: [], ledgerAfter: [],
    });
    expect(cal.accuracyScore).toBeLessThanOrEqual(85);
  });

  it("rejected proof does not improve trajectory", () => {
    const r = computeTemporal({ now, artifacts: [mk({ evidence_strength: "weak" })] });
    const snap = buildTemporalSnapshot(r);
    const cal = calibrateForecast(snap, {
      windowHours: 24,
      artifactsAfter: [mk({ evidence_strength: "weak", quality_score: 2 })],
      verdictsAfter: [{ verdict: "rejected", created_at: new Date().toISOString() }],
      ledgerAfter: [],
    });
    expect(cal.proofImproved).toBe(false);
  });

  it("includes model version and advisory adjustments only", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const snap = buildTemporalSnapshot(r);
    const cal = calibrateForecast(snap, {
      windowHours: 24, artifactsAfter: [mk()], verdictsAfter: [], ledgerAfter: [],
    });
    expect(cal.modelVersion).toEqual(snap.modelVersion);
    expect(Array.isArray(cal.suggestedWeightAdjustments)).toBe(true);
  });

  it("legacy rows do not crash", () => {
    const legacy = (createdAt: string): ProofArtifactLike =>
      ({ created_at: createdAt }) as unknown as ProofArtifactLike;
    const r = computeTemporal({ now, artifacts: [legacy(daysAgo(1))] });
    const snap = buildTemporalSnapshot(r);
    expect(() =>
      calibrateForecast(snap, {
        windowHours: 24,
        artifactsAfter: [legacy(daysAgo(0))],
        verdictsAfter: [], ledgerAfter: [],
      }),
    ).not.toThrow();
  });
});

describe("reality check", () => {
  it("returns insufficient_data when no later evidence", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const snap = buildTemporalSnapshot(r);
    const rc = runTemporalRealityCheck(snap, {
      windowHours: 24, artifactsAfter: [], verdictsAfter: [], ledgerAfter: [],
    });
    expect(rc.verdict).toBe("insufficient_data");
  });
});

describe("confidence explainability", () => {
  it("explains why confidence is low for new users", () => {
    const r = computeTemporal({ now });
    expect(r.confidence.reasons?.length).toBeGreaterThan(0);
    expect(r.confidence.uncertaintyWarning?.toLowerCase()).toContain("not enough");
  });
});

describe("intervention memory", () => {
  it("identifies the most reliable intervention", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const snap = buildTemporalSnapshot(r);
    const cal = calibrateForecast(snap, {
      windowHours: 24,
      artifactsAfter: [mk({ evidence_strength: "strong", quality_score: 8 })],
      verdictsAfter: [{ verdict: "accepted_strong", created_at: new Date().toISOString() }],
      ledgerAfter: [],
    });
    const rec = recordFromCalibration("accepted_strong", "law", cal);
    const mem = summariseInterventionMemory([rec, rec, rec]);
    expect(mem.bestWorkingIntervention).toBe("accepted_strong");
    expect(mem.interventionReliabilityScore).toBeGreaterThan(0);
  });
});

describe("temporal intelligence score", () => {
  it("rises with more calibrated evidence", () => {
    const sparse = computeTemporal({ now });
    const dense = computeTemporal({
      now,
      artifacts: Array.from({ length: 20 }, (_, i) =>
        mk({ evidence_strength: "strong", quality_score: 8, created_at: daysAgo(i) }),
      ),
    });
    const a = computeTemporalIntelligenceScore({ result: sparse });
    const b = computeTemporalIntelligenceScore({ result: dense });
    expect(b.score).toBeGreaterThan(a.score);
  });
});

describe("coach context", () => {
  it("forbids certainty language and includes confidence explanation", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const ctx = buildTemporalCoachContext(r);
    expect(ctx.confidenceExplanation.length).toBeGreaterThan(0);
    expect(ctx.forbiddenClaims.some((c) => c.includes("blindly"))).toBe(true);
    expect(ctx.modelVersion).toMatch(/temporal-/);
  });
});

// preserve verdicts type usage to satisfy unused import lint
const _v: VerdictLike[] = [];
void _v;
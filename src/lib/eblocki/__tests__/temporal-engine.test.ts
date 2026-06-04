import { describe, it, expect } from "vitest";
import { computeTemporal, type ProofArtifactLike, type VerdictLike } from "../temporal-engine";
import { generateFutureNarrative } from "../future-narrative";
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

describe("temporal engine — new user", () => {
  it("does not crash and reports insufficient evidence", () => {
    const r = computeTemporal({ now });
    expect(r.hasEvidence).toBe(false);
    expect(r.intervention.command).toMatch(/proof/i);
    expect(r.confidence.band).toBe("low");
  });
});

describe("temporal engine — shallow path", () => {
  it("flags shallow risk and demands accepted_strong", () => {
    const arts = Array.from({ length: 6 }, (_, i) =>
      mk({ evidence_strength: "weak", quality_score: 4, created_at: daysAgo(i) }),
    );
    const r = computeTemporal({ now, artifacts: arts, activeDomains: ["law"] });
    expect(r.risk.shallow).toBeGreaterThan(0);
    expect(r.intervention.artifactRequired).toBe("accepted_strong");
  });
});

describe("temporal engine — decay path", () => {
  it("raises drift risk when no recent proof", () => {
    const arts = [mk({ created_at: daysAgo(20), evidence_strength: "weak" })];
    const r = computeTemporal({ now, artifacts: arts, activeDomains: ["law"] });
    expect(r.risk.drift).toBeGreaterThan(40);
    expect(r.trajectories.decay_path.probability).toBeGreaterThan(0);
  });
});

describe("temporal engine — escalation", () => {
  it("raises identity escalation chance with strong/elite + transfer", () => {
    const arts = [
      mk({ evidence_strength: "elite", quality_score: 9, transfer_flag: true }),
      mk({ evidence_strength: "strong", quality_score: 8 }),
      mk({ evidence_strength: "strong", quality_score: 8, created_at: daysAgo(2) }),
    ];
    const verds: VerdictLike[] = [
      { verdict: "accepted_strong", created_at: daysAgo(1) },
      { verdict: "accepted_strong", created_at: daysAgo(2) },
    ];
    const r = computeTemporal({ now, artifacts: arts, verdicts: verds, activeDomains: ["law"] });
    expect(r.identity.escalationChance).toBeGreaterThan(0.5);
    expect(r.trajectories.escalation_path.vector.identity).toBe(100);
  });
});

describe("temporal engine — academic displacement", () => {
  it("flags neglected domain when only one of many active is touched", () => {
    const arts = [
      mk({ domain: "discipline", evidence_strength: "strong", quality_score: 8 }),
    ];
    const r = computeTemporal({
      now,
      artifacts: arts,
      activeDomains: ["discipline", "law", "psychology"],
    });
    expect(r.intervention.domain).toMatch(/law|psychology/);
    expect(r.intervention.artifactRequired).toBe("accepted_strong");
  });
});

describe("temporal engine — confidence", () => {
  it("rises with consistent strong evidence", () => {
    const sparse = computeTemporal({ now, artifacts: [mk({ created_at: daysAgo(10) })] });
    const dense = computeTemporal({
      now,
      artifacts: Array.from({ length: 14 }, (_, i) =>
        mk({ created_at: daysAgo(i), evidence_strength: "strong", quality_score: 8 }),
      ),
    });
    expect(dense.confidence.score).toBeGreaterThan(sparse.confidence.score);
  });
});

describe("temporal engine — legacy rows", () => {
  it("does not crash on missing metadata", () => {
    const arts: ProofArtifactLike[] = [
      { created_at: daysAgo(1) },
      { created_at: daysAgo(2), evidence_strength: null, quality_score: null, domain: null },
    ];
    expect(() => computeTemporal({ now, artifacts: arts })).not.toThrow();
  });
});

describe("future narrative", () => {
  it("includes uncertainty warning and avoids guarantees", () => {
    const r = computeTemporal({
      now,
      artifacts: [mk({ evidence_strength: "strong", quality_score: 8 })],
    });
    const n = generateFutureNarrative(r);
    expect(n.uncertaintyWarning.toLowerCase()).toContain("not");
    const blob = JSON.stringify(n).toLowerCase();
    expect(blob).not.toContain("guaranteed");
    expect(blob).not.toContain("destiny");
  });
});

describe("coach context", () => {
  it("includes forbidden claims and makes no AI call", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    const ctx = buildTemporalCoachContext(r);
    expect(ctx.forbiddenClaims.length).toBeGreaterThan(3);
    expect(ctx.correctedPath).toBeDefined();
  });
});

describe("visual model", () => {
  it("returns four path coordinate sets", () => {
    const r = computeTemporal({ now, artifacts: [mk()] });
    expect(r.visual.paths).toHaveLength(4);
    for (const p of r.visual.paths) {
      expect(p.points.length).toBe(5);
    }
  });
});
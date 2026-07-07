import { describe, expect, it } from "vitest";
import { computeTemporal, type ProofArtifactLike } from "../temporal-engine";
import { buildTemporalSnapshotPayload } from "../temporal-snapshot";
import { auditTemporalLoop } from "../temporal-loop-audit";

const now = new Date("2026-06-05T04:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const hoursAfter = (base: string, h: number) => new Date(new Date(base).getTime() + h * 3_600_000).toISOString();

function proof(over: Partial<ProofArtifactLike> = {}): ProofArtifactLike {
  return {
    id: Math.random().toString(36).slice(2),
    domain: "law",
    quality_score: 7,
    evidence_strength: "strong",
    transfer_flag: false,
    pressure_flag: false,
    proof_tier: 3,
    created_at: daysAgo(1),
    ...over,
  };
}

describe("temporal loop audit", () => {
  it("no proof = inactive", () => {
    const forecast = computeTemporal({ now });
    const audit = auditTemporalLoop({ forecast, proofRows: [] });
    expect(audit.status).toBe("inactive");
  });

  it("snapshot exists but no later proof = partial", () => {
    const first = proof({ created_at: daysAgo(2), evidence_strength: "weak", quality_score: 3 });
    const forecast = computeTemporal({ now, artifacts: [first] });
    const snapshot = buildTemporalSnapshotPayload(forecast);
    const audit = auditTemporalLoop({
      forecast,
      proofRows: [{ ...first, temporal_snapshot: snapshot }],
    });
    expect(audit.status).toBe("partial");
    expect(audit.missingPieces).toContain("later proof after snapshot");
  });

  it("snapshot plus later proof = operational", () => {
    const first = proof({ created_at: daysAgo(2), evidence_strength: "weak", quality_score: 3 });
    const later = proof({ created_at: hoursAfter(first.created_at, 4), evidence_strength: "strong", quality_score: 8 });
    const forecast = computeTemporal({ now, artifacts: [first], activeDomains: ["law"] });
    const snapshot = buildTemporalSnapshotPayload(forecast);
    const audit = auditTemporalLoop({
      forecast,
      proofRows: [{ ...later }, { ...first, temporal_snapshot: snapshot }],
      verdicts: [{ verdict: "accepted_strong", created_at: later.created_at }],
    });
    expect(audit.status).toBe("operational");
  });

  it("invalid snapshot = degraded", () => {
    const first = proof({ created_at: daysAgo(2) });
    const forecast = computeTemporal({ now, artifacts: [first] });
    const audit = auditTemporalLoop({
      forecast,
      proofRows: [{ ...first, temporal_snapshot: { primaryPath: "banana", confidenceLevel: "certain" } }],
    });
    expect(audit.status).toBe("degraded");
  });

  it("missing calibration data = partial", () => {
    const first = proof({ created_at: daysAgo(2) });
    const forecast = computeTemporal({ now, artifacts: [first] });
    const snapshot = buildTemporalSnapshotPayload(forecast);
    const audit = auditTemporalLoop({
      forecast,
      proofRows: [{ ...first, temporal_snapshot: snapshot }],
      calibrations: [],
    });
    expect(audit.status).toBe("partial");
  });

  it("userSafeSummary never claims certainty", () => {
    const forecast = computeTemporal({ now });
    const audit = auditTemporalLoop({ forecast, proofRows: [] });
    expect(audit.userSafeSummary.toLowerCase()).not.toMatch(/certain|guarantee|definitely|100%/);
  });

  it("developerSafeSummary names missing pieces", () => {
    const forecast = computeTemporal({ now, artifacts: [proof()] });
    const audit = auditTemporalLoop({ forecast, proofRows: [] });
    expect(audit.developerSafeSummary).toContain("missing=");
    expect(audit.developerSafeSummary).toContain("stored snapshot");
  });
});

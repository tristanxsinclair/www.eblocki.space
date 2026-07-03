import { describe, expect, it } from "vitest";
import { computeTemporal, type ProofArtifactLike } from "../temporal-engine";
import {
  buildTemporalSnapshotPayload,
  isTemporalSnapshotPayload,
  normaliseTemporalSnapshot,
  stripSensitiveTemporalSnapshotFields,
} from "../temporal-snapshot";

const now = new Date("2026-06-05T04:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function proof(over: Partial<ProofArtifactLike> = {}): ProofArtifactLike {
  return {
    id: "proof_1",
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

describe("temporal snapshot helper", () => {
  it("includes modelVersion", () => {
    const result = computeTemporal({ now, artifacts: [proof()] });
    const snapshot = buildTemporalSnapshotPayload(result);
    expect(snapshot.modelVersion).toBe(result.modelVersion);
    expect(snapshot.generatedAt).toBe(result.generatedAt);
  });

  it("strips long proof text", () => {
    const result = computeTemporal({ now, artifacts: [proof()] });
    result.intervention.command = "x".repeat(5000);
    const snapshot = buildTemporalSnapshotPayload(result);
    expect(snapshot.proofRequired.length).toBeLessThan(5000);
    expect(snapshot.proofRequired.length).toBeLessThanOrEqual(180);
  });

  it("normalises invalid path names", () => {
    const snapshot = normaliseTemporalSnapshot({
      modelVersion: "temporal-test",
      generatedAt: now.toISOString(),
      predictionId: "p1",
      primaryPath: "banana_path",
      recommendedPath: "maybe_path",
      confidenceLevel: "moderate",
      mainRisk: "drift",
      artifactRequired: "accepted_strong",
    });
    expect(snapshot?.primaryPath).toBe("current_path");
    expect(snapshot?.recommendedPath).toBe("corrected_path");
  });

  it("normalises null and legacy snapshots without crashing", () => {
    expect(() => normaliseTemporalSnapshot(null)).not.toThrow();
    expect(normaliseTemporalSnapshot(null)).toBeNull();
    const legacy = normaliseTemporalSnapshot({ modelVersion: "old", generatedAt: now.toISOString() });
    expect(legacy?.modelVersion).toBe("old");
  });

  it("preserves valid confidence level", () => {
    const result = computeTemporal({ now, artifacts: [proof()] });
    const snapshot = buildTemporalSnapshotPayload(result);
    const normalised = normaliseTemporalSnapshot({ ...snapshot, confidenceLevel: "high" });
    expect(normalised?.confidenceLevel).toBe("high");
  });

  it("does not crash on missing fields", () => {
    expect(() => normaliseTemporalSnapshot({})).not.toThrow();
    expect(normaliseTemporalSnapshot({})?.confidenceLevel).toBe("low");
  });

  it("returns JSONB-safe output", () => {
    const result = computeTemporal({ now, artifacts: [proof()] });
    const snapshot = stripSensitiveTemporalSnapshotFields(buildTemporalSnapshotPayload(result));
    expect(snapshot).toBeTruthy();
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    expect(JSON.stringify(snapshot)).not.toContain("undefined");
  });

  it("does not store raw proof descriptions", () => {
    const unsafe = stripSensitiveTemporalSnapshotFields({
      modelVersion: "temporal-test",
      generatedAt: now.toISOString(),
      predictionId: "p1",
      primaryPath: "current_path",
      recommendedPath: "corrected_path",
      confidenceLevel: "moderate",
      mainRisk: "drift",
      artifactRequired: "accepted_strong",
      rawProofDescription: "private proof details should disappear",
      personalNotes: "private note",
    });
    const blob = JSON.stringify(unsafe).toLowerCase();
    expect(blob).not.toContain("private proof details");
    expect(blob).not.toContain("private note");
    expect(isTemporalSnapshotPayload(unsafe)).toBe(true);
  });
});

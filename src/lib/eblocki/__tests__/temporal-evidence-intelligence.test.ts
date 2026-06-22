import { describe, expect, it } from "vitest";
import {
  buildCounterfactualPaths,
  buildDisconfirmingProof,
  buildFutureScene,
  buildTemporalEvidenceSnapshot,
  buildTemporalForecast,
  calculateTemporalConfidence,
  selectTemporalRisk,
  type TemporalForecastInput,
} from "../temporal-evidence-intelligence";

const generatedAt = "2026-06-22T04:00:00.000Z";
const recentAt = "2026-06-21T04:00:00.000Z";

function input(overrides: Partial<TemporalForecastInput> = {}): TemporalForecastInput {
  return {
    userId: "user-1",
    horizon: "7d",
    proofs: [],
    generatedAt,
    ...overrides,
  };
}

function proof(
  domain: string,
  qualityScore: number,
  proofTier = 3,
): Record<string, unknown> {
  return {
    id: domain + "-" + qualityScore,
    domain,
    quality_score: qualityScore,
    evidence_strength: qualityScore >= 9 ? "elite" : qualityScore >= 7 ? "strong" : "weak",
    proof_tier: proofTier,
    created_at: recentAt,
  };
}

describe("Temporal Evidence Intelligence Phase 1", () => {
  it("models no proof history as empty no-artifact drift", () => {
    const forecast = buildTemporalForecast(input());

    expect(forecast.primaryRisk).toBe("no_artifact_drift");
    expect(forecast.evidenceSnapshot.dataQuality).toBe("empty");
    expect(forecast.evidenceSnapshot.averageProofQuality).toBeNull();
    expect(forecast.calibrationStatus).toBe("insufficient_evidence");
    expect(forecast.disconfirmingProof).toHaveLength(1);
    expect(forecast.disconfirmingProof[0].proofThatWouldDisproveIt).toMatch(/measurable proof artifact/i);
  });

  it("detects a shallow proof loop and requires a depth upgrade", () => {
    const scenario = input({
      proofs: [
        proof("sales", 3, 1),
        proof("sales", 4, 2),
        proof("sales", 3, 2),
      ],
    });
    const snapshot = buildTemporalEvidenceSnapshot(scenario);
    const risk = selectTemporalRisk(snapshot, scenario);
    const paths = buildCounterfactualPaths(risk, snapshot);

    expect(risk).toBe("shallow_proof_loop");
    expect(paths.correctedPath.userActionRequired).toMatch(/depth|pressure|transfer/i);
  });

  it("prioritises academic displacement when product proof replaces academic proof", () => {
    const scenario = input({
      proofs: [proof("eblocki", 8, 3)],
      activeDomains: ["eblocki", "law"],
      priorityDomains: ["law", "psychology"],
    });
    const snapshot = buildTemporalEvidenceSnapshot(scenario);

    expect(selectTemporalRisk(snapshot, scenario)).toBe("academic_displacement");
  });

  it("detects domain neglect when higher-priority risks are absent", () => {
    const scenario = input({
      proofs: [
        proof("sales", 7, 3),
        proof("sales", 8, 3),
        proof("sales", 9, 3),
        proof("sales", 10, 3),
      ],
      activeDomains: ["sales", "sport"],
      priorityDomains: ["sport"],
    });
    const snapshot = buildTemporalEvidenceSnapshot(scenario);

    expect(snapshot.neglectedDomains).toContain("sport");
    expect(selectTemporalRisk(snapshot, scenario)).toBe("domain_neglect");
  });

  it("detects identity inflation from adversarial evidence", () => {
    const scenario = input({
      proofs: [proof("law", 8, 3)],
      activeDomains: ["law"],
      adversarialRisks: ["identity_claim_exceeds_evidence"],
    });
    const snapshot = buildTemporalEvidenceSnapshot(scenario);

    expect(snapshot.recentAdversarialRisks).toContain("identity_claim_exceeds_evidence");
    expect(selectTemporalRisk(snapshot, scenario)).toBe("identity_inflation");
  });

  it("reduces confidence as the horizon expands and never exceeds 0.9", () => {
    const scenario = input({
      proofs: Array.from({ length: 15 }, (_, index) =>
        proof(index % 2 === 0 ? "law" : "psychology", 8, 3),
      ),
    });
    const snapshot = buildTemporalEvidenceSnapshot(scenario);
    const near = calculateTemporalConfidence(snapshot, "24h");
    const far = calculateTemporalConfidence(snapshot, "1y");

    expect(snapshot.dataQuality).toBe("strong");
    expect(near.confidence).toBeGreaterThan(far.confidence);
    expect(near.confidence).toBeLessThanOrEqual(0.9);
    expect(far.confidence).toBeLessThanOrEqual(0.9);
    expect(near.uncertaintyRange[1]).toBeLessThanOrEqual(0.9);
  });

  it("keeps future scenes cautious and names proof that changes the path", () => {
    const scenario = input();
    const snapshot = buildTemporalEvidenceSnapshot(scenario);
    const risk = selectTemporalRisk(snapshot, scenario);
    const disconfirming = buildDisconfirmingProof(risk, snapshot);
    const paths = buildCounterfactualPaths(risk, snapshot);
    const scene = buildFutureScene(
      risk,
      scenario.horizon,
      paths.currentPath,
      snapshot,
      disconfirming,
    );
    const text = JSON.stringify(scene).toLowerCase();
    const banned = [
      "eblocki knows your future",
      "you will fail",
      "destiny",
      "guaranteed",
      "diagnosis",
      "mental illness",
      "almost perfectly accurate",
    ];

    for (const term of banned) expect(text).not.toContain(term);
    expect(text).toContain("forecast, not fate");
    expect(scene.proofThatChangesPath).toMatch(/proof artifact/i);
    expect(scene.uncertaintyNote).toMatch(/weakens|uncertainty|forecast/i);
  });

  it("returns the complete forecast contract with all four paths", () => {
    const forecast = buildTemporalForecast(input({
      horizon: "30d",
      proofs: [proof("law", 8, 3)],
      activeDomains: ["law"],
    }));

    expect([
      forecast.currentPath.path,
      forecast.correctedPath.path,
      forecast.decayPath.path,
      forecast.escalationPath.path,
    ]).toEqual(["current", "corrected", "decay", "escalation"]);
    expect(forecast.evidenceSnapshot).toBeDefined();
    expect(forecast.futureScene).toBeDefined();
    expect(forecast.proofRequired).toBeTruthy();
    expect(forecast.blockedAction).toBeTruthy();
    expect(forecast.disconfirmingProof.length).toBeGreaterThan(0);
    expect(forecast.id).toContain("user-1");
    expect(forecast.generatedAt).toBe(generatedAt);
    expect(forecast.calibrationStatus).toBe("insufficient_evidence");
  });
});

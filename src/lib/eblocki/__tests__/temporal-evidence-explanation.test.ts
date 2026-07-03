import { describe, expect, it } from "vitest";
import {
  buildTemporalEvidenceExplanation,
  INSUFFICIENT_TEMPORAL_EVIDENCE,
  THIN_TEMPORAL_EVIDENCE_ACTION,
} from "../temporal-evidence-explanation";
import {
  computeTemporal,
  type ProofArtifactLike,
  type TemporalResult,
} from "../temporal-engine";

const now = new Date("2026-06-24T04:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();

function proof(
  index: number,
  overrides: Partial<ProofArtifactLike> = {},
): ProofArtifactLike {
  return {
    id: `proof_${index}`,
    domain: "law",
    quality_score: 8,
    evidence_strength: "strong",
    transfer_flag: false,
    pressure_flag: false,
    proof_tier: 3,
    created_at: daysAgo(index),
    ...overrides,
  };
}

function evidenceResult(): TemporalResult {
  return computeTemporal({
    now,
    artifacts: [proof(0), proof(1), proof(2), proof(3)],
    activeDomains: ["law"],
  });
}

describe("buildTemporalEvidenceExplanation", () => {
  it("uses evidence fields from the live TemporalResult", () => {
    const result = evidenceResult();
    const explanation = buildTemporalEvidenceExplanation(result);
    const evidence = explanation.supportingEvidence.join(" ");

    expect(explanation.primaryForecastClaim).toContain(
      result.trajectories[result.primary].label.toLowerCase(),
    );
    expect(evidence).toContain(`${result.momentum.last30} artifact(s)`);
    expect(evidence).toContain(result.domains[0].domain);
    expect(explanation.uncertaintyStatement).toBe(
      result.confidence.uncertaintyWarning,
    );
  });

  it("caps supporting evidence at three statements", () => {
    expect(
      buildTemporalEvidenceExplanation(evidenceResult()).supportingEvidence,
    ).toHaveLength(3);
  });

  it.each([
    ["no_proof", "measurable proof artifact"],
    ["shallow_proof", "accepted strong artifact"],
    ["neglected_domain", "accepted strong artifact in law"],
    ["overload", "depth proof artifact"],
    ["drift", "transfer or elite artifact"],
  ])(
    "produces concrete disconfirming proof for %s",
    (failureMode, expectedProof) => {
      const result = evidenceResult();
      result.risk.primaryFailureMode = failureMode;
      result.intervention = {
        ...result.intervention,
        domain: "law",
        artifactRequired: "transfer_or_elite",
        timeboxMinutes: 45,
      };

      const explanation = buildTemporalEvidenceExplanation(result);

      expect(explanation.disconfirmingProof).toContain(
        "This forecast weakens if",
      );
      expect(explanation.disconfirmingProof.toLowerCase()).toContain(
        expectedProof,
      );
      expect(explanation.proofChangingCommand).toContain("45 minutes");
    },
  );

  it("handles empty and thin evidence safely", () => {
    const empty = buildTemporalEvidenceExplanation(computeTemporal({ now }));
    const thin = buildTemporalEvidenceExplanation(
      computeTemporal({ now, artifacts: [proof(0)] }),
    );

    for (const explanation of [empty, thin]) {
      expect(explanation.supportingEvidence).toEqual([
        INSUFFICIENT_TEMPORAL_EVIDENCE,
      ]);
      expect(explanation.disconfirmingProof).toBe(
        THIN_TEMPORAL_EVIDENCE_ACTION,
      );
      expect(explanation.proofChangingCommand).toBe(
        THIN_TEMPORAL_EVIDENCE_ACTION,
      );
    }
  });

  it("does not emit banned certainty or diagnosis wording", () => {
    const blob = JSON.stringify(
      buildTemporalEvidenceExplanation(evidenceResult()),
    ).toLowerCase();

    for (const banned of [
      "destiny",
      "guaranteed",
      "you will fail",
      "eblocki knows your future",
      "mental health diagnosis",
      "almost perfectly accurate",
    ]) {
      expect(blob).not.toContain(banned);
    }
  });

  it("is deterministic for a fixed TemporalResult", () => {
    const result = evidenceResult();
    expect(buildTemporalEvidenceExplanation(result)).toEqual(
      buildTemporalEvidenceExplanation(result),
    );
  });

  it("uses existing artifact, domain, and timebox fields", () => {
    const result = evidenceResult();
    result.risk.primaryFailureMode = "drift";
    result.intervention = {
      ...result.intervention,
      artifactRequired: "accepted_strong",
      domain: "psychology",
      timeboxMinutes: 75,
    };

    const explanation = buildTemporalEvidenceExplanation(result);

    expect(explanation.proofChangingCommand).toBe(
      "Submit one accepted strong artifact in psychology within 75 minutes.",
    );
  });

  it("does not crash when optional explanation fields are missing", () => {
    const result = evidenceResult();
    delete result.confidence.reasons;
    delete result.confidence.uncertaintyWarning;
    result.intervention.domain = null;

    expect(() => buildTemporalEvidenceExplanation(result)).not.toThrow();
    expect(
      buildTemporalEvidenceExplanation(result).uncertaintyStatement,
    ).toContain("remains probabilistic");
  });
});

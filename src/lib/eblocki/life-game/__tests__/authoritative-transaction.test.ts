import { describe, expect, it } from "vitest";
import {
  buildLifeGameSnapshot,
  deriveLifeGamePulse,
  objectiveCanComplete,
  projectEvidenceSettlement,
  type LifeGameHealth,
  type LifeGameSourceRows,
} from "@/lib/eblocki/life-game";

const USER_ID = "test-user";
const COMMITMENT_ID = "11111111-1111-4111-8111-111111111111";
const OBJECTIVE_ID = "22222222-2222-4222-8222-222222222222";
const ARTIFACT_ID = "33333333-3333-4333-8333-333333333333";
const TODAY = "2026-07-25";

const HEALTH: LifeGameHealth = {
  operator: "ok",
  domains: "ok",
  objectives: "ok",
  commitments: "ok",
  proofs: "ok",
  verdicts: "ok",
  xpEvents: "ok",
  ledger: "empty",
  momentum: "ok",
  coachInteractions: "empty",
};

function rows(stage: "quest" | "artifact" | "settled"): LifeGameSourceRows {
  const artifactExists = stage !== "quest";
  const settled = stage === "settled";
  return {
    operator: {
      level: 4,
      rank: "Builder",
      title: "Evidence Builder",
      total_xp: settled ? 596 : 500,
      xp_in_level: settled ? 146 : 50,
    },
    domains: [
      {
        domain: "eblocki",
        level: 4,
        xp_in_level: settled ? 146 : 50,
      },
    ],
    objectives: [
      {
        id: OBJECTIVE_ID,
        objective_date: TODAY,
        title: "Ship the settlement reveal",
        description: "A committed diff and verification output",
        mode_id: "eblocki",
        kind: "mission",
        resistance_level: 4,
        proof_required: true,
        why_it_matters: "Closes the action-to-character loop",
        status: artifactExists ? "completed" : "active",
        proof_commitment_id: COMMITMENT_ID,
        position: 0,
      },
    ],
    commitments: [
      {
        id: COMMITMENT_ID,
        title: "Ship the settlement reveal",
        mode: "eblocki",
        status: artifactExists ? "completed" : "pending",
        required_artifact: "Commit plus test and browser output",
        evidence_standard: "Implementation exists and the verification matches the claim",
        proof_artifact_id: artifactExists ? ARTIFACT_ID : null,
        created_at: "2026-07-25T08:00:00.000Z",
      },
    ],
    proofs: artifactExists
      ? [
          {
            id: ARTIFACT_ID,
            title: "Shipped the settlement reveal",
            domain: "eblocki",
            created_at: "2026-07-25T09:00:00.000Z",
            evidence_strength: "elite",
          },
        ]
      : [],
    verdicts: settled
      ? [
          {
            proof_id: ARTIFACT_ID,
            created_at: "2026-07-25T09:00:01.000Z",
            verdict: "elite",
          },
        ]
      : [],
    xpEvents: settled
      ? [
          {
            id: "44444444-4444-4444-8444-444444444444",
            proof_id: ARTIFACT_ID,
            created_at: "2026-07-25T09:00:01.000Z",
            final_xp: 96,
          },
        ]
      : [],
    ledger: [],
    momentum: {
      momentum_score: settled ? 84 : 78,
      streak_days: 8,
      longest_streak: 12,
      proofs_today: artifactExists ? 1 : 0,
      state: "momentum",
    },
    coachInteractions: [],
  };
}

describe("authoritative life-game transaction", () => {
  it("keeps the quest incomplete before an artifact exists", () => {
    const snapshot = buildLifeGameSnapshot(rows("quest"), HEALTH, TODAY);

    expect(snapshot.activeQuest?.id).toBe(OBJECTIVE_ID);
    expect(
      objectiveCanComplete({ proof_required: true, proof_artifact_id: null }),
    ).toBe(false);
    expect(snapshot.runLog).toEqual([]);
  });

  it("shows a filed artifact as pending without assuming XP or a verdict", () => {
    const snapshot = buildLifeGameSnapshot(rows("artifact"), HEALTH, TODAY);
    const settlement = projectEvidenceSettlement(snapshot, ARTIFACT_ID);

    expect(snapshot.activeQuest).toBeNull();
    expect(snapshot.runLog[0]).toMatchObject({
      id: ARTIFACT_ID,
      xp: null,
      courtVerdict: null,
      syncState: "pending",
    });
    expect(settlement.state).toBe("pending");
    expect(deriveLifeGamePulse(snapshot).state).toBe("sync_pending");
  });

  it("settles the same artifact only after authoritative verdict and XP rows exist", () => {
    const snapshot = buildLifeGameSnapshot(rows("settled"), HEALTH, TODAY);
    const settlement = projectEvidenceSettlement(snapshot, ARTIFACT_ID);
    const pulse = deriveLifeGamePulse(snapshot);

    expect(
      objectiveCanComplete({ proof_required: true, proof_artifact_id: ARTIFACT_ID }),
    ).toBe(true);
    expect(snapshot.activeQuest).toBeNull();
    expect(snapshot.operator.totalXp).toBe(596);
    expect(snapshot.stats.find((stat) => stat.key === "craft")?.contributingDomains).toEqual([
      "eblocki",
    ]);
    expect(snapshot.runLog[0]).toMatchObject({
      id: ARTIFACT_ID,
      courtVerdict: "elite",
      xp: 96,
      syncState: "complete",
    });
    expect(settlement).toMatchObject({
      state: "settled",
      courtVerdict: "elite",
      evidenceStrength: "elite",
      xp: 96,
    });
    expect(pulse.state).toBe("xp_committed");
    expect(pulse.headline).toBe("+96 character XP landed.");
  });
});

import { describe, expect, it } from "vitest";
import type { Tables } from "@/integrations/supabase/types";
import {
  buildLifeGameSnapshot,
  buildQuestLogActionHref,
  buildRunLog,
  projectLifeStats,
  projectQuests,
} from "../projections";

type DomainRow = Tables<"domain_levels">;
type OperatorRow = Tables<"operator_level">;
type ObjectiveRow = Tables<"daily_objectives">;
type CommitmentRow = Tables<"proof_commitments">;
type ProofRow = Tables<"proof_artifacts">;
type VerdictRow = Tables<"court_verdicts">;
type XpRow = Tables<"xp_events">;

const domainRow = (domain: string, level: number, xpInLevel: number): DomainRow => ({
  id: `${domain}-id`,
  user_id: "user",
  domain,
  level,
  rank: "Rank",
  total_xp: 100,
  xp_in_level: xpInLevel,
  current_standard: null,
  next_requirement: null,
  updated_at: "2026-07-25T00:00:00.000Z",
});

const operatorRow: OperatorRow = {
  user_id: "user",
  level: 3,
  rank: "Initiate",
  title: "Emerging Operator",
  total_xp: 300,
  xp_in_level: 50,
  updated_at: "2026-07-25T00:00:00.000Z",
};

const commitment = (overrides: Partial<CommitmentRow> = {}): CommitmentRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "user",
  title: "File the implementation",
  domain: "eblocki",
  mode: "eblocki",
  status: "pending",
  required_artifact: "Commit and test output",
  evidence_standard: "Visible and verified",
  proof_artifact_id: null,
  completed_at: null,
  completion_reflection: null,
  coach_interaction_id: null,
  daily_control_sheet_id: null,
  assistance_boundary: null,
  blocked_actions: [],
  restriction_evidence: [],
  due_date: null,
  created_at: "2026-07-25T02:00:00.000Z",
  ...overrides,
} as CommitmentRow);

const objective = (overrides: Partial<ObjectiveRow> = {}): ObjectiveRow => ({
  id: "22222222-2222-4222-8222-222222222222",
  user_id: "user",
  objective_date: "2026-07-25",
  title: "Ship the slice",
  description: "A visible change",
  mode_id: "eblocki",
  kind: "mission",
  resistance_level: 4,
  focus_minutes: 45,
  reward_value: 20,
  streak_impact: 1,
  identity_alignment: 5,
  proof_required: true,
  why_it_matters: "Closes the loop",
  status: "pending",
  completed_at: null,
  proof_artifact_id: null,
  proof_commitment_id: "11111111-1111-4111-8111-111111111111",
  position: 1,
  completion_proof_text: null,
  completion_hard_part: null,
  completion_quality_self_rating: null,
  completion_upgrade: null,
  created_at: "2026-07-25T01:00:00.000Z",
  updated_at: "2026-07-25T01:00:00.000Z",
  ...overrides,
});

const proof: ProofRow = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: "user",
  title: "Shipped life-game adapter",
  domain: "eblocki",
  created_at: "2026-07-25T04:00:00.000Z",
  artifact_type: "implementation",
  content: "private content must not enter the run log",
  content_hash: null,
  corrects_proof_artifact_id: null,
  evidence_strength: "strong",
  feedback: null,
  next_upgrade: null,
  pressure_flag: false,
  proof_tier: 3,
  quality_score: 4,
  temporal_snapshot: null,
  transfer_flag: false,
  attachment_name: null,
  attachment_path: null,
  attachment_size: null,
  attachment_type: null,
  attachment_url: null,
} as ProofRow;

describe("life stat projections", () => {
  it("maps every canonical domain into the five cosmetic stats", () => {
    const stats = projectLifeStats(
      [
        domainRow("soccer", 4, 50),
        domainRow("law", 5, 30),
        domainRow("psychology", 3, 20),
        domainRow("sales", 2, 10),
        domainRow("finance", 3, 10),
        domainRow("eblocki", 4, 10),
        domainRow("life", 6, 10),
      ],
      operatorRow,
    );
    expect(stats.map((stat) => stat.key)).toEqual([
      "body",
      "mind",
      "craft",
      "social",
      "discipline",
    ]);
    expect(stats.find((stat) => stat.key === "craft")?.contributingDomains).toEqual([
      "sales",
      "finance",
      "eblocki",
    ]);
  });

  it("uses level one at zero percent when grouped domain rows are missing", () => {
    const stats = projectLifeStats([], null);
    expect(stats.every((stat) => stat.level === 1 && stat.progressPercent === 0)).toBe(true);
  });

  it("clamps negative and excessive progress without mutating authoritative levels", () => {
    const body = projectLifeStats([domainRow("soccer", 2, Number.MAX_VALUE)], operatorRow)[0];
    const mind = projectLifeStats([domainRow("law", 2, -500)], operatorRow)[1];
    expect(body.level).toBe(2);
    expect(body.progressPercent).toBe(99.9);
    expect(mind.progressPercent).toBe(0);
  });
});

describe("quest projection", () => {
  it("prefers an active objective, then pending position, then newest commitment", () => {
    const active = objective({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "active", position: 9 });
    const firstPending = objective({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", position: 0, proof_commitment_id: null });
    const result = projectQuests(
      [firstPending, active],
      [commitment()],
      "2026-07-25",
    );
    expect(result.activeQuest?.id).toBe(active.id);
    expect(result.queuedQuests[0]?.id).toBe(firstPending.id);
  });

  it("uses trusted IDs only when constructing quest deep links", () => {
    expect(
      buildQuestLogActionHref({
        commitmentId: "11111111-1111-4111-8111-111111111111",
        objectiveId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toBe(
      "/proof?source=quest&contract=11111111-1111-4111-8111-111111111111&objective=22222222-2222-4222-8222-222222222222",
    );
    expect(buildQuestLogActionHref({ commitmentId: "not-a-record" })).toBe(
      "/proof?source=quest",
    );
  });
});

describe("run log truth boundaries", () => {
  const verdict = (createdAt: string, value: string): VerdictRow => ({
    proof_id: proof.id,
    user_id: "user",
    created_at: createdAt,
    verdict: value,
    observer: null,
    reasoning: null,
  });
  const xp = (createdAt: string, value: number): XpRow => ({
    id: `${createdAt}-${value}`,
    proof_id: proof.id,
    user_id: "user",
    created_at: createdAt,
    base_xp: value,
    final_xp: value,
    domain: "eblocki",
    tier: 3,
    quality: 4,
    verdict: "accepted_strong",
    quality_mult: 1,
    streak_mult: 1,
    pressure_mult: 1,
    transfer_mult: 1,
    diminishing_mult: 1,
    reasoning: null,
  });

  it("keeps proof rows visible and never manufactures missing XP or verdicts", () => {
    const [entry] = buildRunLog({ proofs: [proof], xpEvents: [], verdicts: [], ledger: [] });
    expect(entry.title).toBe(proof.title);
    expect(entry.xp).toBeNull();
    expect(entry.courtVerdict).toBeNull();
    expect(entry.syncState).toBe("pending");
    expect(entry.title).not.toContain(proof.content ?? "");
  });

  it("selects the newest duplicate secondary record without double-awarding", () => {
    const [entry] = buildRunLog({
      proofs: [proof],
      xpEvents: [
        xp("2026-07-25T04:00:01.000Z", 20),
        xp("2026-07-25T04:00:02.000Z", 40),
      ],
      verdicts: [
        verdict("2026-07-25T04:00:01.000Z", "accepted_useful"),
        verdict("2026-07-25T04:00:02.000Z", "accepted_strong"),
      ],
      ledger: [],
    });
    expect(entry.xp).toBe(40);
    expect(entry.courtVerdict).toBe("accepted_strong");
    expect(entry.syncState).toBe("complete");
  });

  it("marks secondary query failures unavailable instead of assuming success", () => {
    const [entry] = buildRunLog({
      proofs: [proof],
      xpEvents: [],
      verdicts: [],
      ledger: [],
      health: { xpEvents: "error", verdicts: "ok" },
    });
    expect(entry.syncState).toBe("unavailable");
  });
});

describe("snapshot defaults", () => {
  it("builds an honest zero-data character without fake run-log success", () => {
    const snapshot = buildLifeGameSnapshot(
      {
        operator: null,
        domains: [],
        objectives: [],
        commitments: [],
        proofs: [],
        verdicts: [],
        xpEvents: [],
        ledger: [],
        momentum: null,
        coachInteractions: [],
      },
      { operator: "empty" },
      "2026-07-25",
      "UTC",
    );
    expect(snapshot.operator.level).toBe(1);
    expect(snapshot.operator.totalXp).toBe(0);
    expect(snapshot.activeQuest).toBeNull();
    expect(snapshot.runLog).toEqual([]);
    expect(snapshot.health.operator).toBe("empty");
    expect(snapshot.clock).toEqual({
      localDate: "2026-07-25",
      timeZone: "UTC",
      weekStartsOn: 1,
    });
  });
});

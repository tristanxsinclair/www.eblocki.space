import { describe, expect, it } from "vitest";
import {
  neglectedDomain,
  personaliseQuests,
  resistanceBand,
  summariseQuestSignals,
  type QuestProofRow,
} from "../quest-personalisation";

const day = "2026-08-18";
const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

describe("resistanceBand", () => {
  it("caps resistance for cold or weak operators", () => {
    expect(resistanceBand({ streak_days: 0, avg_quality: 2 }).max).toBe(3);
  });
  it("raises the floor for earned streaks with strong quality", () => {
    const band = resistanceBand({ streak_days: 5, avg_quality: 7 });
    expect(band.min).toBe(3);
    expect(band.max).toBe(5);
  });
  it("forces hard reps when only low resistance is logged", () => {
    expect(resistanceBand({ streak_days: 4, avg_quality: 7 }, ["only_low_resistance"]).min).toBe(4);
  });
  it("survives null momentum", () => {
    expect(resistanceBand(null).min).toBeGreaterThanOrEqual(1);
  });
});

describe("neglectedDomain", () => {
  it("picks the stalest active-mode domain", () => {
    const result = neglectedDomain(
      [{ mode_id: "LAW_MAX", is_default: true }, { mode_id: "ATHLETE_MODE" }],
      [{ domain: "law", created_at: iso(0) }, { domain: "soccer", created_at: iso(9) }],
      [],
    );
    expect(result?.domain).toBe("soccer");
  });
  it("returns null when everything is fresh", () => {
    expect(
      neglectedDomain([{ mode_id: "LAW_MAX" }], [{ domain: "law", created_at: iso(0) }], []),
    ).toBeNull();
  });
});

describe("personaliseQuests", () => {
  it("gives a new user exactly one honest starting quest set", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [],
      domainLevels: [],
      recentProofs: [],
      momentum: null,
    });
    expect(quests.length).toBeGreaterThan(0);
    expect(quests.length).toBeLessThanOrEqual(3);
    quests.forEach((q) => expect(q.required_artifact.length).toBeGreaterThan(4));
  });

  it("leads with a correction quest when the last proof was weak", () => {
    const proofs: QuestProofRow[] = [
      { title: "Thin summary", domain: "law", quality_score: 3, created_at: iso(0) },
    ];
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX", is_default: true }],
      domainLevels: [],
      recentProofs: proofs,
      momentum: { streak_days: 2, avg_quality: 3 },
    });
    expect(quests[0].origin).toBe("correction");
  });

  it("carries the operator's own next_upgrade into a quest", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX" }],
      domainLevels: [],
      recentProofs: [
        {
          title: "IRAC draft",
          domain: "law",
          quality_score: 7,
          next_upgrade: "Add authority currency check to each rule statement",
          created_at: iso(0),
        },
      ],
      momentum: { streak_days: 3, avg_quality: 7 },
    });
    expect(quests.some((q) => q.origin === "next_upgrade")).toBe(true);
  });

  it("escalates to pressure once output is repeatedly proven", () => {
    const proofs: QuestProofRow[] = [0, 1, 2].map((i) => ({
      title: `Proof ${i}`,
      domain: "law",
      quality_score: 7,
      created_at: iso(i),
    }));
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX" }],
      domainLevels: [],
      recentProofs: proofs,
      momentum: { streak_days: 6, avg_quality: 8 },
      maxQuests: 4,
    });
    expect(quests.some((q) => q.origin === "pressure_step")).toBe(true);
  });

  it("uses the operator's own evidence standard when they defined one", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [
        {
          mode_id: "SALES_CLOSE",
          display_name: "Closing",
          strong_evidence_examples: ["Recorded call with objection handled and outcome noted"],
        },
      ],
      domainLevels: [],
      recentProofs: [],
      momentum: { streak_days: 1, avg_quality: 6 },
    });
    expect(quests.some((q) => q.required_artifact.includes("Recorded call"))).toBe(true);
  });

  it("respects overload by capping the day at two quests", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX" }, { mode_id: "PSYCH_HD" }],
      domainLevels: [],
      recentProofs: [],
      momentum: { streak_days: 4, avg_quality: 7 },
      calibrationFlags: ["objective_overload"],
    });
    expect(quests.length).toBeLessThanOrEqual(2);
  });

  it("represents multiple active modes for multi-mode operators", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX", is_default: true }, { mode_id: "ATHLETE_MODE" }],
      domainLevels: [],
      recentProofs: [{ domain: "law", created_at: iso(0), quality_score: 6 }],
      momentum: { streak_days: 2, avg_quality: 6 },
      maxQuests: 3,
    });
    const domains = new Set(quests.map((q) => q.domain));
    expect(domains.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same input", () => {
    const input = {
      dayKey: day,
      modes: [{ mode_id: "EBLOCKI_BUILD" }],
      domainLevels: [],
      recentProofs: [],
      momentum: { streak_days: 2, avg_quality: 5 },
    };
    expect(personaliseQuests(input)).toEqual(personaliseQuests(input));
  });

  it("attaches governance fields to every quest", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX" }],
      domainLevels: [],
      recentProofs: [
        { title: "Weak note", domain: "law", quality_score: 2, created_at: iso(0) },
      ],
      momentum: { streak_days: 1, avg_quality: 3 },
      maxQuests: 3,
    });
    quests.forEach((q) => {
      expect(q.questKey).toMatch(new RegExp(`^${day}:`));
      expect(["contact", "output", "depth", "pressure", "transfer"]).toContain(q.stage);
      expect(q.escalationRule.length).toBeGreaterThan(10);
      expect(q.selfDeceptionRisk.length).toBeGreaterThan(10);
    });
    expect(new Set(quests.map((q) => q.questKey)).size).toBe(quests.length);
  });

  it("marks pressure escalation as transfer stage", () => {
    const quests = personaliseQuests({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX" }],
      domainLevels: [],
      recentProofs: [0, 1, 2].map((i) => ({
        title: `Proof ${i}`,
        domain: "law",
        quality_score: 8,
        created_at: iso(i),
      })),
      momentum: { streak_days: 7, avg_quality: 8 },
      maxQuests: 4,
    });
    const pressure = quests.find((q) => q.origin === "pressure_step");
    expect(pressure?.stage).toBe("transfer");
  });
});

describe("summariseQuestSignals", () => {
  it("is honest about a blank record", () => {
    const brief = summariseQuestSignals({
      dayKey: day,
      modes: [],
      domainLevels: [],
      recentProofs: [],
      momentum: null,
    });
    expect(brief.personalised).toBe(false);
    expect(brief.headline).toMatch(/No history/i);
  });

  it("reports modes, quality, streak and stale domains", () => {
    const brief = summariseQuestSignals({
      dayKey: day,
      modes: [{ mode_id: "LAW_MAX", display_name: "Law Max", is_default: true }],
      domainLevels: [],
      recentProofs: [{ domain: "law", quality_score: 7, created_at: iso(8) }],
      momentum: { streak_days: 4, avg_quality: 7 },
    });
    expect(brief.personalised).toBe(true);
    expect(brief.signals.join(" ")).toContain("Law Max");
    expect(brief.signals.join(" ")).toMatch(/law stale 8d/);
    expect(brief.band.min).toBe(3);
  });

  it("pins the band low when evidence is thin", () => {
    const brief = summariseQuestSignals({
      dayKey: day,
      modes: [{ mode_id: "PSYCH_HD" }],
      domainLevels: [],
      recentProofs: [{ domain: "psychology", quality_score: 2, created_at: iso(0) }],
      momentum: { streak_days: 1, avg_quality: 2 },
    });
    expect(brief.band.max).toBe(3);
    expect(brief.headline).toMatch(/thin/i);
  });
});

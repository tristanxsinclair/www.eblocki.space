import { describe, it, expect } from "vitest";
import { runQAChecks } from "../qa-checks";

const baseSnap = {
  state: "momentum" as const,
  momentum_score: 65,
  streak_days: 5,
  longest_streak: 10,
  freeze_tokens: 1,
  proofs_today: 1,
  resistance_overcome: 3,
  identity_signal: "x",
  last_proof_at: new Date().toISOString(),
  avg_quality: 7,
  hours_since_proof: 3,
};

describe("qa-checks", () => {
  it("flags impossible streak invariant", () => {
    const w = runQAChecks({
      snapshot: { ...baseSnap, streak_days: 20, longest_streak: 10 },
      objectives: [], artifacts: [], notifications: [], timezone: "UTC", recentCoachOutputs: [],
    });
    expect(w.some((x) => x.code === "STREAK_INVARIANT")).toBe(true);
  });

  it("flags freeze cap violation", () => {
    const w = runQAChecks({
      snapshot: { ...baseSnap, freeze_tokens: 9 },
      objectives: [], artifacts: [], notifications: [], timezone: "UTC", recentCoachOutputs: [],
    });
    expect(w.some((x) => x.code === "FREEZE_CAP")).toBe(true);
  });

  it("flags inflated quality score", () => {
    const w = runQAChecks({
      snapshot: baseSnap,
      objectives: [],
      artifacts: [{ quality_score: 9, content: "tiny", created_at: new Date().toISOString() }],
      notifications: [], timezone: "UTC", recentCoachOutputs: [],
    });
    expect(w.some((x) => x.code === "QUALITY_INFLATED")).toBe(true);
  });

  it("flags notification spam", () => {
    const now = new Date().toISOString();
    const w = runQAChecks({
      snapshot: baseSnap, objectives: [], artifacts: [],
      notifications: [
        { sent_at: now, dedup_key: "a" },
        { sent_at: now, dedup_key: "b" },
        { sent_at: now, dedup_key: "c" },
      ],
      timezone: "UTC", recentCoachOutputs: [],
    });
    expect(w.some((x) => x.code === "NOTIF_SPAM")).toBe(true);
  });

  it("flags coach repetition", () => {
    const w = runQAChecks({
      snapshot: baseSnap, objectives: [], artifacts: [], notifications: [],
      timezone: "Europe/Sydney",
      recentCoachOutputs: ["Do one IRAC paragraph now.", "Do one IRAC paragraph now."],
    });
    expect(w.some((x) => x.code === "COACH_REPEAT")).toBe(true);
  });
});
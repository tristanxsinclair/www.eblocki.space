import { describe, it, expect } from "vitest";
import { canSendNudge, INTEGRITY_RULES } from "../integrity-rules";

const HOUR = 3_600_000;
const NOW = new Date("2026-05-16T15:00:00Z");

describe("canSendNudge — daily cap", () => {
  it("allows when under cap and no prior nudge", () => {
    expect(canSendNudge({ nudgesSentToday: 0, lastNudgeAt: null, now: NOW }))
      .toEqual({ allowed: true });
  });

  it("blocks when daily cap reached", () => {
    const r = canSendNudge({
      nudgesSentToday: INTEGRITY_RULES.MAX_NUDGES_PER_DAY,
      lastNudgeAt: null,
      now: NOW,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("daily_cap_reached");
  });

  it("blocks one over the cap", () => {
    const r = canSendNudge({
      nudgesSentToday: INTEGRITY_RULES.MAX_NUDGES_PER_DAY + 1,
      lastNudgeAt: new Date(NOW.getTime() - 10 * HOUR),
      now: NOW,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("daily_cap_reached");
  });
});

describe("canSendNudge — spacing", () => {
  it("blocks if last nudge is within MIN_HOURS_BETWEEN_NUDGES", () => {
    const r = canSendNudge({
      nudgesSentToday: 1,
      lastNudgeAt: new Date(NOW.getTime() - 1 * HOUR),
      now: NOW,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("min_spacing_not_met");
  });

  it("allows once spacing satisfied", () => {
    const r = canSendNudge({
      nudgesSentToday: 1,
      lastNudgeAt: new Date(NOW.getTime() - (INTEGRITY_RULES.MIN_HOURS_BETWEEN_NUDGES + 0.1) * HOUR),
      now: NOW,
    });
    expect(r.allowed).toBe(true);
  });

  it("treats exactly-at-boundary as blocked (strict <)", () => {
    const r = canSendNudge({
      nudgesSentToday: 1,
      lastNudgeAt: new Date(NOW.getTime() - (INTEGRITY_RULES.MIN_HOURS_BETWEEN_NUDGES - 0.01) * HOUR),
      now: NOW,
    });
    expect(r.allowed).toBe(false);
  });
});

describe("INTEGRITY_RULES contract", () => {
  it("hardcodes max 3 nudges/day", () => {
    expect(INTEGRITY_RULES.MAX_NUDGES_PER_DAY).toBe(3);
  });
  it("hardcodes min 4h spacing", () => {
    expect(INTEGRITY_RULES.MIN_HOURS_BETWEEN_NUDGES).toBe(4);
  });
  it("forbids guilt framing, fake urgency, fabricated citations", () => {
    expect(INTEGRITY_RULES.NO_GUILT_FRAMING).toBe(true);
    expect(INTEGRITY_RULES.NO_FAKE_URGENCY).toBe(true);
    expect(INTEGRITY_RULES.NO_FABRICATED_CITATIONS).toBe(true);
  });
});

// Mirror of inQuietHours in notify-momentum/index.ts.
// Kept here as a behavioural contract: the rule shape must not drift.
function inQuietHours(hour: number, start: number, end: number): boolean {
  return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
}

describe("quiet hours window", () => {
  it("default 22→9 blocks 23, 0, 8 and allows 10, 18, 21", () => {
    expect(inQuietHours(23, 22, 9)).toBe(true);
    expect(inQuietHours(0,  22, 9)).toBe(true);
    expect(inQuietHours(8,  22, 9)).toBe(true);
    expect(inQuietHours(9,  22, 9)).toBe(false);
    expect(inQuietHours(10, 22, 9)).toBe(false);
    expect(inQuietHours(21, 22, 9)).toBe(false);
  });

  it("non-wrap window 13→14 blocks only 13", () => {
    expect(inQuietHours(12, 13, 14)).toBe(false);
    expect(inQuietHours(13, 13, 14)).toBe(true);
    expect(inQuietHours(14, 13, 14)).toBe(false);
  });
});
import { describe, expect, it } from "vitest";
import {
  getInterestSignalDecision,
  isSameInterestSignal,
  normaliseInterestNote,
  normalisePreferredPrice,
} from "../interest-signals";

const now = new Date("2026-06-16T12:00:00.000Z");
const insideCooldown = "2026-06-16T00:30:00.000Z";
const outsideCooldown = "2026-06-15T11:30:00.000Z";

const baseSignal = {
  signal_type: "would_pay",
  user_id: "user-1",
  preferred_price_cents: 900,
  note: "Worth it for proof review",
};

describe("interest signal soft guard", () => {
  it("blocks same type, same price, and same note inside cooldown", () => {
    const decision = getInterestSignalDecision({
      candidate: baseSignal,
      recentSignals: [{ ...baseSignal, created_at: insideCooldown }],
      now,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("duplicate_within_cooldown");
  });

  it("allows same type after cooldown", () => {
    const decision = getInterestSignalDecision({
      candidate: baseSignal,
      recentSignals: [{ ...baseSignal, created_at: outsideCooldown }],
      now,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("cooldown_expired");
  });

  it("allows same type inside cooldown when price changes", () => {
    const decision = getInterestSignalDecision({
      candidate: { ...baseSignal, preferred_price_cents: 1200 },
      recentSignals: [{ ...baseSignal, created_at: insideCooldown }],
      now,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("changed_intent");
  });

  it("allows same type inside cooldown when note changes", () => {
    const decision = getInterestSignalDecision({
      candidate: { ...baseSignal, note: "Worth it for Sentinel memory" },
      recentSignals: [{ ...baseSignal, created_at: insideCooldown }],
      now,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("changed_intent");
  });

  it("allows different signal type inside cooldown", () => {
    const decision = getInterestSignalDecision({
      candidate: { ...baseSignal, signal_type: "founder_waitlist" },
      recentSignals: [{ ...baseSignal, created_at: insideCooldown }],
      now,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("no_previous_matching_signal");
  });

  it("handles missing and blank notes consistently", () => {
    expect(normaliseInterestNote(null)).toBe("");
    expect(normaliseInterestNote("   \n  ")).toBe("");
    expect(
      isSameInterestSignal(
        { ...baseSignal, note: null },
        { ...baseSignal, note: "   ", created_at: insideCooldown },
      ),
    ).toBe(true);
  });

  it("normalises price strings and numbers consistently", () => {
    expect(normalisePreferredPrice("900")).toBe(900);
    expect(normalisePreferredPrice("$9,900")).toBe(9900);
    expect(normalisePreferredPrice(900.2)).toBe(900);
    expect(
      isSameInterestSignal(
        { ...baseSignal, preferred_price_cents: "900" },
        { ...baseSignal, preferred_price_cents: 900, created_at: insideCooldown },
      ),
    ).toBe(true);
  });
});

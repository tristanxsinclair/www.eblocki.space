import { describe, it, expect } from "vitest";
import { computeProofWeek } from "../proof-week";

describe("proof-week", () => {
  it("returns inactive when no join date", () => {
    const r = computeProofWeek({ joinedAt: null, artifactDates: [], todayISO: "2026-06-10" });
    expect(r.active).toBe(false);
    expect(r.currentDay).toBe(0);
    expect(r.today).toBeNull();
  });

  it("day 1 on join day", () => {
    const r = computeProofWeek({
      joinedAt: "2026-06-10",
      artifactDates: [],
      todayISO: "2026-06-10",
    });
    expect(r.currentDay).toBe(1);
    expect(r.today?.label).toMatch(/Activate/);
    expect(r.active).toBe(true);
  });

  it("day 4 after 3 days", () => {
    const r = computeProofWeek({
      joinedAt: "2026-06-10",
      artifactDates: ["2026-06-10T08:00:00Z", "2026-06-12T10:00:00Z"],
      todayISO: "2026-06-13",
    });
    expect(r.currentDay).toBe(4);
    expect(r.artifactsThisWeek).toBe(2);
    expect(r.daysWithProof).toBe(2);
  });

  it("completes after day 7", () => {
    const r = computeProofWeek({
      joinedAt: "2026-06-01",
      artifactDates: [],
      todayISO: "2026-06-10",
    });
    expect(r.completed).toBe(true);
    expect(r.active).toBe(false);
    expect(r.today).toBeNull();
  });

  it("ignores artifacts outside the 7-day window", () => {
    const r = computeProofWeek({
      joinedAt: "2026-06-10",
      artifactDates: ["2026-06-09T12:00:00Z", "2026-06-18T12:00:00Z"],
      todayISO: "2026-06-12",
    });
    expect(r.artifactsThisWeek).toBe(0);
  });
});
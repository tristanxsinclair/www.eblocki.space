import { describe, expect, it } from "vitest";
import { createLifeGameDemoSnapshot, DEMO_GAME_MASTER_SCRIPT } from "../demo";

describe("life-game demo fixture", () => {
  it("is deterministic for an injected clock", () => {
    const first = createLifeGameDemoSnapshot("2026-07-25T12:00:00.000Z");
    const second = createLifeGameDemoSnapshot("2026-07-25T12:00:00.000Z");
    expect(first).toEqual(second);
  });

  it("contains fictional labels and no live integration state", () => {
    const snapshot = createLifeGameDemoSnapshot("2026-07-25T12:00:00.000Z");
    const serialised = JSON.stringify(snapshot);
    expect(serialised).not.toMatch(/tristan|@|supabase|attachment_url/i);
    expect(snapshot.activeQuest?.id).toContain("demo");
    expect(DEMO_GAME_MASTER_SCRIPT.join(" ")).toContain("ARTIFACT");
  });

  it("rejects an invalid clock rather than creating drifting fixtures", () => {
    expect(() => createLifeGameDemoSnapshot("not-a-date")).toThrow(
      "A valid demo clock is required.",
    );
  });
});

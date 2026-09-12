import { describe, expect, it } from "vitest";
import { buildArenaLedgerContent } from "../arena-presentation";
import type {
  GameForgeMasteryResult,
  GameForgeProofArtifact,
} from "../gameforge-engine";

describe("Arena presentation boundary", () => {
  it("labels practice points as Arena score and never as character XP", () => {
    const result = {
      score: 84,
      masteryLabel: "Strong",
      accuracy: 80,
      xp: 42,
      completedBossBattle: true,
      strongestSkill: "application",
      weakPoints: ["counterargument"],
    } as GameForgeMasteryResult;
    const artifact = {
      nextUpgrade: "Repeat the counterargument drill.",
    } as GameForgeProofArtifact;

    const content = buildArenaLedgerContent({
      packTitle: "Application Trial",
      result,
      artifact,
    });

    expect(content).toContain("Arena score: 42");
    expect(content).not.toMatch(/\bXP\b/);
    expect(content).not.toContain("character");
  });
});

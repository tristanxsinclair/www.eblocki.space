import type {
  GameForgeMasteryResult,
  GameForgeProofArtifact,
} from "./gameforge-engine";

export function buildArenaLedgerContent(input: {
  packTitle: string;
  result: GameForgeMasteryResult;
  artifact: GameForgeProofArtifact;
}): string {
  const { packTitle, result, artifact } = input;
  return [
    `Arena result — ${packTitle}`,
    `Mastery score: ${result.score}/100 (${result.masteryLabel}).`,
    `Accuracy: ${result.accuracy}%. Arena score: ${result.xp}. Boss battle: ${result.completedBossBattle ? "cleared" : "not cleared"}.`,
    `Strongest skill: ${result.strongestSkill}.`,
    `Weak points: ${result.weakPoints.join("; ")}.`,
    `Next upgrade: ${artifact.nextUpgrade}`,
  ].join("\n");
}

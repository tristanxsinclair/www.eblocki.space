import type { GameForgeProofArtifact, GamePack, GameSession } from "./types";
import { calculateAccuracy, calculateMasteryRank } from "./scoring";

function inferSkillImproved(mode: string): string {
  switch (mode) {
    case "law_max":
      return "legal recall, issue identification, and application discipline";
    case "psych_hd":
      return "concept recall, applied reasoning, and evaluation";
    case "sales_close":
      return "needs diagnosis, value framing, and objection handling";
    case "language_grind":
      return "active recall and sentence production";
    case "sport_iq":
      return "tactical awareness and decision-making";
    case "finance_builder":
      return "financial judgement and risk awareness";
    default:
      return "recall, application, and correction";
  }
}

function buildNextUpgrade(accuracy: number, mistakeCount: number): string {
  if (accuracy >= 90 && mistakeCount === 0) return "Increase difficulty and attempt a Boss Battle.";
  if (accuracy >= 75) return "Convert the weakest concept into one scenario application drill.";
  return "Complete Mistake Clinic before claiming mastery.";
}

export function createGameForgeProofArtifact(params: {
  pack: GamePack;
  session: GameSession;
}): GameForgeProofArtifact {
  const accuracy = calculateAccuracy(params.session.answers);
  const mistakesResolved = params.session.mistakes.filter((m) => m.resolved).length;
  const masteryRank = calculateMasteryRank({
    accuracy,
    xp: params.session.xp,
    mistakesResolved,
    bossCompleted: params.session.completed,
  });
  const weakest = params.session.mistakes[0];
  return {
    domain: params.pack.mode,
    topic: params.pack.title,
    gameMode: params.pack.style,
    evidenceCompleted: `${params.session.answers.length} questions completed with ${params.session.xp} XP earned.`,
    weaknessFound: weakest
      ? `${weakest.mistakeType}: ${weakest.skillTested ?? weakest.prompt}`
      : "No major weakness detected. Increase difficulty.",
    skillImproved: inferSkillImproved(params.pack.mode),
    xpEarned: params.session.xp,
    accuracy,
    masteryRank,
    nextUpgrade: buildNextUpgrade(accuracy, params.session.mistakes.length),
    createdAt: new Date().toISOString(),
  };
}
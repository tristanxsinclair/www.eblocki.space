import type { GameDifficulty, MasteryRank, UserAnswer } from "./types";

export function getXpForDifficulty(difficulty: GameDifficulty): number {
  switch (difficulty) {
    case "easy":
      return 5;
    case "medium":
      return 10;
    case "hard":
      return 20;
    case "boss":
      return 50;
  }
}

export function calculateAccuracy(answers: UserAnswer[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((a) => a.isCorrect).length;
  return Math.round((correct / answers.length) * 100);
}

export function calculateMasteryRank(params: {
  accuracy: number;
  xp: number;
  mistakesResolved: number;
  bossCompleted: boolean;
}): MasteryRank {
  const { accuracy, xp, mistakesResolved, bossCompleted } = params;
  if (accuracy >= 95 && bossCompleted && xp >= 500) return "Top 1%";
  if (accuracy >= 90 && bossCompleted) return "Exam-Ready";
  if (accuracy >= 85 && mistakesResolved >= 3) return "Mastery Candidate";
  if (accuracy >= 80) return "Elite";
  if (accuracy >= 70) return "Weaponised";
  if (accuracy >= 60) return "Specialist";
  if (accuracy >= 45) return "Operator";
  return "Novice";
}
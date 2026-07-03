import type { GameDifficulty, MasteryRank, UserAnswer } from "./types";
import { CONFIDENCE_CALIBRATION_BONUS, XP_BY_DIFFICULTY } from "./constants";

export function getXpForDifficulty(difficulty: GameDifficulty): number {
  return XP_BY_DIFFICULTY[difficulty];
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
  if (accuracy >= 95 && bossCompleted && xp >= 300) return "Top 1%";
  if (accuracy >= 90 && bossCompleted) return "Exam-Ready";
  if (accuracy >= 85 && mistakesResolved >= 2) return "Mastery Candidate";
  if (accuracy >= 80) return "Elite";
  if (accuracy >= 70) return "Weaponised";
  if (accuracy >= 60) return "Specialist";
  if (accuracy >= 45) return "Operator";
  return "Novice";
}

export function calculateAnswerXp(params: {
  isCorrect: boolean;
  difficulty: GameDifficulty;
  confidence: 1 | 2 | 3 | 4 | 5;
}): number {
  if (!params.isCorrect) return 0;
  const base = getXpForDifficulty(params.difficulty);
  const calibration = params.confidence <= 2 ? CONFIDENCE_CALIBRATION_BONUS : 0;
  return base + calibration;
}
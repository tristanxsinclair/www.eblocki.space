import type { GameDifficulty, MasteryRank } from "./types";

export const STARTING_FOCUS_POINTS = 5;

export const XP_BY_DIFFICULTY: Record<GameDifficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
  boss: 50,
};

export const PERFECT_LEVEL_BONUS = 25;
export const MISTAKE_CORRECTION_BONUS = 15;
export const CONFIDENCE_CALIBRATION_BONUS = 10;

export const MASTERY_RANKS: MasteryRank[] = [
  "Novice",
  "Operator",
  "Specialist",
  "Weaponised",
  "Elite",
  "Mastery Candidate",
  "Exam-Ready",
  "Top 1%",
];
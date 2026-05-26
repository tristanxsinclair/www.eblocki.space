import type { GameSession } from "./types";

export type AdaptiveInstruction = {
  label: string;
  message: string;
  action:
    | "continue"
    | "increase_difficulty"
    | "trigger_mistake_clinic"
    | "precision_warning"
    | "boss_unlocked"
    | "finish";
};

export function getAdaptiveInstruction(session: GameSession): AdaptiveInstruction {
  if (session.focusPoints <= 0) {
    return {
      label: "Focus depleted",
      message: "Boss pressure broke the run. Enter recovery drill before replaying.",
      action: "finish",
    };
  }
  if (session.wrongStreak >= 2) {
    return {
      label: "Mistake Clinic triggered",
      message: "Two errors in a row. Fix the pattern before chasing more XP.",
      action: "trigger_mistake_clinic",
    };
  }
  if (session.correctStreak >= 3) {
    return {
      label: "Difficulty rising",
      message: "Correct streak: 3. Recall is stable. Application pressure increases now.",
      action: "increase_difficulty",
    };
  }
  return { label: "Continue", message: "Next question. Keep precision high.", action: "continue" };
}
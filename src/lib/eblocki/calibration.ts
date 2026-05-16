/**
 * Calibration flags — derived signals used to tune the engine over time.
 * No intervention; purely observational. Computed on demand from raw
 * tables so we don't carry duplicate state.
 */

export interface CalibrationInput {
  proofs: Array<{ quality_score: number | null; created_at: string }>;
  objectives: Array<{ status: string; resistance_level: number | null; completion_proof_text: string | null }>;
  coachInteractions: number;
  capturesOpened: number;
  capturesCompleted: number;
  streakDays: number;
  avgQuality: number | null;
  objectivesPerDay: number;
}

export type CalibrationFlag =
  | "abandons_proof_capture"
  | "never_uses_coach"
  | "only_low_resistance"
  | "inflated_streak_low_quality"
  | "objective_overload";

export interface CalibrationResult {
  flag: CalibrationFlag;
  detail: string;
}

export function computeCalibration(input: CalibrationInput): CalibrationResult[] {
  const out: CalibrationResult[] = [];

  if (input.capturesOpened >= 3 && input.capturesCompleted / Math.max(1, input.capturesOpened) < 0.4) {
    out.push({
      flag: "abandons_proof_capture",
      detail: `Opened ${input.capturesOpened}, completed ${input.capturesCompleted}.`,
    });
  }

  if (input.coachInteractions === 0 && input.proofs.length >= 3) {
    out.push({
      flag: "never_uses_coach",
      detail: `${input.proofs.length} proofs, 0 coach calls.`,
    });
  }

  const completedObjectives = input.objectives.filter((o) => o.status === "completed");
  if (completedObjectives.length >= 5) {
    const highRes = completedObjectives.filter((o) => (o.resistance_level ?? 0) >= 4).length;
    if (highRes / completedObjectives.length < 0.15) {
      out.push({
        flag: "only_low_resistance",
        detail: `${highRes}/${completedObjectives.length} completions ≥ resistance 4.`,
      });
    }
  }

  if (input.streakDays >= 5 && (input.avgQuality ?? 0) < 4) {
    out.push({
      flag: "inflated_streak_low_quality",
      detail: `Streak ${input.streakDays}d, avg quality ${(input.avgQuality ?? 0).toFixed(1)}/10.`,
    });
  }

  if (input.objectivesPerDay > 5) {
    out.push({
      flag: "objective_overload",
      detail: `Average ${input.objectivesPerDay.toFixed(1)} objectives/day.`,
    });
  }

  return out;
}

export const FLAG_LABELS: Record<CalibrationFlag, string> = {
  abandons_proof_capture: "Abandons Proof Capture",
  never_uses_coach: "Never uses coach",
  only_low_resistance: "Only low-resistance wins",
  inflated_streak_low_quality: "Inflated streak, low quality",
  objective_overload: "Objective overload",
};
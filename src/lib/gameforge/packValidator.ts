import type { GamePack, GameQuestion } from "./types";

export type GamePackValidationResult = {
  valid: boolean;
  issues: string[];
};

const SCENARIO_TYPES = new Set([
  "scenario",
  "written_application",
  "scenario_simulator",
  "deep_application",
]);

const BOSS_TYPES = new Set(["boss", "boss_battle"]);

const MC_TYPES = new Set(["multiple_choice", "multiple_choice_arena"]);

export function validateGamePack(pack: GamePack | null): GamePackValidationResult {
  const issues: string[] = [];
  if (!pack) return { valid: false, issues: ["No game pack exists."] };

  if (!pack.title || pack.title.trim().length < 3) issues.push("Game pack title is missing or too short.");
  if (!pack.topicDiagnosis || pack.topicDiagnosis.trim().length < 20)
    issues.push("Topic diagnosis is too shallow.");
  if (!pack.learningObjectives || pack.learningObjectives.length < 3)
    issues.push("At least 3 learning objectives are required.");
  if (!pack.levels || pack.levels.length < 1) issues.push("At least 1 level is required.");

  const allQuestions = (pack.levels ?? []).flatMap((l) => l.questions ?? []);
  if (allQuestions.length < 5) issues.push("At least 5 questions are required for a playable pack.");

  const seen = new Set<string>();
  for (const q of allQuestions) {
    validateQuestion(q, issues);
    const key = (q.prompt ?? "").trim().toLowerCase();
    if (key && seen.has(key)) issues.push(`Duplicate question detected: ${q.prompt}`);
    seen.add(key);
  }

  const hasScenario = allQuestions.some(
    (q) => SCENARIO_TYPES.has(q.type) || q.prompt.toLowerCase().includes("scenario"),
  );
  const hasBoss = allQuestions.some((q) => BOSS_TYPES.has(q.type) || q.difficulty === "boss");
  if (!hasScenario) issues.push("At least one scenario/application question is required.");
  if (!hasBoss) issues.push("At least one boss-level question is required.");

  return { valid: issues.length === 0, issues };
}

function validateQuestion(q: GameQuestion, issues: string[]) {
  if (!q.id) issues.push("Question missing id.");
  if (!q.prompt || q.prompt.trim().length < 10) issues.push("Question prompt is too short.");
  if (!q.correctAnswer || q.correctAnswer.trim().length < 1)
    issues.push(`Question missing correct answer: ${q.prompt}`);
  if (!q.explanation || q.explanation.trim().length < 20)
    issues.push(`Question explanation is too shallow: ${q.prompt}`);
  if (!q.skillTested || q.skillTested.trim().length < 3)
    issues.push(`Question missing skill tested: ${q.prompt}`);

  if (MC_TYPES.has(q.type)) {
    if (!q.options || q.options.length !== 4) {
      issues.push(`Multiple-choice question must have exactly 4 options: ${q.prompt}`);
    }
    if (q.options) {
      const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
      if (unique.size !== q.options.length) issues.push(`Duplicate options detected: ${q.prompt}`);
      const includes = q.options.some(
        (o) => o.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
      );
      if (!includes) issues.push(`Options do not include correct answer: ${q.prompt}`);
    }
  }
}
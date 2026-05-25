import type {
  GameForgeIntensity,
  GameForgeMode,
  GameForgeStyle,
  GamePack,
  GameQuestion,
  GameDifficulty,
} from "./types";
import { getXpForDifficulty } from "./scoring";

type GenerateGamePackInput = {
  sourceMaterial: string;
  mode: GameForgeMode;
  intensity: GameForgeIntensity;
  style: GameForgeStyle;
};

function readableMode(mode: GameForgeMode): string {
  return mode.replaceAll("_", " ");
}
function readableStyle(style: GameForgeStyle): string {
  return style.replaceAll("_", " ");
}
function readableIntensity(intensity: GameForgeIntensity): string {
  return intensity.replaceAll("_", " ");
}

function inferTopic(sourceMaterial: string, mode: GameForgeMode): string {
  const trimmed = sourceMaterial.trim();
  if (trimmed.length < 60) return trimmed || readableMode(mode);
  return `${readableMode(mode)} Training Pack`;
}

function extractKeyTerms(sourceMaterial: string): string[] {
  const words = sourceMaterial
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 5);
  const unique = Array.from(new Set(words));
  return unique.length > 0
    ? unique.slice(0, 15)
    : ["concept", "application", "evidence", "judgement", "mastery"];
}

function buildPrompt(term: string, mode: GameForgeMode): string {
  switch (mode) {
    case "law_max":
      return `Which key legal term or concept fits this prompt: ${term}?`;
    case "psych_hd":
      return `Identify the psychological concept connected to: ${term}.`;
    case "sales_close":
      return `Which product/customer concept are you being tested on: ${term}?`;
    case "language_grind":
      return `Translate or recall the key phrase: ${term}.`;
    case "sport_iq":
      return `Identify the tactical idea connected to: ${term}.`;
    case "finance_builder":
      return `Identify the financial concept connected to: ${term}.`;
    default:
      return `Recall the key concept: ${term}.`;
  }
}

function buildOptions(correct: string): string[] {
  return [correct, "surface-level recall", "unsupported assumption", "irrelevant detail"].sort(
    () => Math.random() - 0.5,
  );
}

function buildExplanation(term: string, mode: GameForgeMode): string {
  return `${term} is being used as a core ${readableMode(mode)} concept. The next upgrade is to explain it, apply it, and test it in a scenario.`;
}

function buildSkillTested(mode: GameForgeMode): string {
  switch (mode) {
    case "law_max":
      return "legal recall and application";
    case "psych_hd":
      return "concept application and evaluation";
    case "sales_close":
      return "customer diagnosis and value framing";
    case "language_grind":
      return "active recall and sentence use";
    case "sport_iq":
      return "tactical decision-making";
    case "finance_builder":
      return "financial judgement";
    default:
      return "recall and transfer";
  }
}

function buildQuestionsFromTerms(terms: string[], mode: GameForgeMode): GameQuestion[] {
  // Ensure at least 15 questions by recycling if needed.
  const base = terms.length >= 15 ? terms : [...terms, ...terms, ...terms].slice(0, 15);
  return base.map((term, index) => {
    const difficulty: GameDifficulty =
      index >= 12 ? "boss" : index >= 8 ? "hard" : index >= 4 ? "medium" : "easy";
    return {
      id: crypto.randomUUID(),
      type:
        index % 3 === 0
          ? "multiple_choice_arena"
          : index % 3 === 1
            ? "flashcard_duel"
            : "deep_application",
      prompt: buildPrompt(term, mode),
      options: buildOptions(term),
      correctAnswer: term,
      explanation: buildExplanation(term, mode),
      difficulty,
      skillTested: buildSkillTested(mode),
      xpValue: getXpForDifficulty(difficulty),
      feedbackCorrect: "Correct. This is usable recall. Next step: apply it under pressure.",
      feedbackIncorrect:
        "Incorrect. The issue is not effort; it is precision. Review the concept and retry.",
    };
  });
}

function buildPackTitle(topic: string, mode: GameForgeMode, style: GameForgeStyle): string {
  return `${topic} — ${readableMode(mode)} ${readableStyle(style)}`;
}

function buildTopicDiagnosis(
  _topic: string,
  mode: GameForgeMode,
  intensity: GameForgeIntensity,
): string {
  return `This pack trains ${readableMode(mode)} through ${readableIntensity(intensity)} recall, application, and correction. Bottleneck likely: turning passive familiarity into usable proof.`;
}

function buildLearningObjectives(topic: string, mode: GameForgeMode): string[] {
  return [
    `Recall the core ideas in ${topic}.`,
    `Apply the material through ${readableMode(mode)} scenarios.`,
    "Identify weak areas through mistake patterns.",
    "Produce a proof artifact showing measurable learning.",
  ];
}

export function generateLocalGamePack(input: GenerateGamePackInput): GamePack {
  const topic = inferTopic(input.sourceMaterial, input.mode);
  const terms = extractKeyTerms(input.sourceMaterial);
  const questions = buildQuestionsFromTerms(terms, input.mode);

  return {
    id: crypto.randomUUID(),
    title: buildPackTitle(topic, input.mode, input.style),
    sourceMaterial: input.sourceMaterial,
    topicDiagnosis: buildTopicDiagnosis(topic, input.mode, input.intensity),
    learningObjectives: buildLearningObjectives(topic, input.mode),
    mode: input.mode,
    intensity: input.intensity,
    style: input.style,
    levels: [
      {
        id: crypto.randomUUID(),
        title: "Level 1 — Core Recall",
        objective: "Prove you can identify the core concepts without hiding behind passive reading.",
        requiredAccuracyToPass: 70,
        questions: questions.slice(0, 5),
      },
      {
        id: crypto.randomUUID(),
        title: "Level 2 — Application Pressure",
        objective: "Move from recognition into applied judgement.",
        requiredAccuracyToPass: 75,
        questions: questions.slice(5, 10),
      },
      {
        id: crypto.randomUUID(),
        title: "Level 3 — Boss Check",
        objective: "Survive a harder mixed round and expose weak areas.",
        requiredAccuracyToPass: 80,
        questions: questions.slice(10, 15),
      },
    ],
    createdAt: new Date().toISOString(),
  };
}
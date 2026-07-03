import type {
  GameForgeIntensity,
  GameForgeMode,
  GameForgeStyle,
  GamePack,
  GameQuestion,
  GameDifficulty,
  GameQuestionType,
} from "./types";
import { getXpForDifficulty } from "./scoring";
import { GAMEFORGE_MODE_PROFILES } from "./modeProfiles";

type GenerateGamePackInput = {
  sourceMaterial: string;
  mode: GameForgeMode;
  intensity: GameForgeIntensity;
  style: GameForgeStyle;
};

function readableMode(mode: GameForgeMode): string {
  return mode.replace(/_/g, " ");
}
function readableStyle(style: GameForgeStyle): string {
  return style.replace(/_/g, " ");
}
function readableIntensity(intensity: GameForgeIntensity): string {
  return intensity.replace(/_/g, " ");
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
  const distractors = ["surface-level recall", "unsupported assumption", "irrelevant detail"];
  const opts = [correct, ...distractors];
  // Fisher-Yates so correct answer is not always first
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
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
  const base = terms.length >= 15 ? terms : [...terms, ...terms, ...terms].slice(0, 15);
  const profile = GAMEFORGE_MODE_PROFILES[mode];
  return base.map((term, index) => {
    let type: GameQuestionType;
    if (index === base.length - 1) type = "boss";
    else if (index % 4 === 3) type = "scenario";
    else if (index % 3 === 0) type = "multiple_choice";
    else if (index % 3 === 1) type = "flashcard";
    else type = "written_application";
    const difficulty: GameDifficulty =
      type === "boss"
        ? "boss"
        : index >= 10
          ? "hard"
          : index >= 5
            ? "medium"
            : "easy";
    const prompt =
      type === "scenario"
        ? `Scenario — apply ${term} to a realistic ${profile.label} situation. What is the correct call?`
        : type === "written_application"
          ? `Explain how ${term} applies using the ${profile.answerFramework} framework.`
          : type === "boss"
            ? `Boss check — under pressure, demonstrate ${term} using ${profile.answerFramework}. Name the move.`
            : buildPrompt(term, mode);
    return {
      id: crypto.randomUUID(),
      type,
      prompt,
      options: type === "multiple_choice" ? buildOptions(term) : undefined,
      correctAnswer: term,
      explanation: buildExplanation(term, mode),
      difficulty,
      skillTested: buildSkillTested(mode),
      xpValue: getXpForDifficulty(difficulty),
      feedbackCorrect: "Correct. Usable recall. Next round forces application.",
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
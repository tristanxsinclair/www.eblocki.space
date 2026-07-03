import type { GameMistake, GameQuestion } from "./types";

export function createMistakeFromWrongAnswer(params: {
  question: GameQuestion;
  userAnswer: string;
  confidence: 1 | 2 | 3 | 4 | 5;
}): GameMistake {
  const mistakeType = classifyMistakeType(params.question, params.userAnswer, params.confidence);
  return {
    questionId: params.question.id,
    prompt: params.question.prompt,
    userAnswer: params.userAnswer,
    correctAnswer: params.question.correctAnswer,
    explanation: params.question.explanation,
    skillTested: params.question.skillTested,
    mistakeType,
    recoveryDrill: buildRecoveryDrill(params.question.skillTested, mistakeType),
    resolved: false,
  };
}

function classifyMistakeType(
  question: GameQuestion,
  userAnswer: string,
  confidence: 1 | 2 | 3 | 4 | 5,
): GameMistake["mistakeType"] {
  if (confidence >= 4) return "false_confidence";
  if (userAnswer.trim().split(/\s+/).length > 80) return "weak_application";
  if (
    question.type === "scenario" ||
    question.type === "written_application" ||
    question.type === "scenario_simulator" ||
    question.type === "deep_application"
  ) {
    return "weak_application";
  }
  if (question.skillTested.toLowerCase().includes("recall")) return "recall_gap";
  return "concept_confusion";
}

function buildRecoveryDrill(skillTested: string, mistakeType: GameMistake["mistakeType"]): string {
  switch (mistakeType) {
    case "false_confidence":
      return `False certainty detected. Re-answer one ${skillTested} question with confidence capped at 3 until the explanation is correct.`;
    case "weak_application":
      return `Application weakness detected. Write one sentence defining the concept, then one sentence applying it to a new scenario.`;
    case "recall_gap":
      return `Recall gap detected. Repeat the core definition, then answer one similar question without notes.`;
    case "speed_precision_leak":
      return `Precision leak. Re-answer the question slowly and state the rule before the answer.`;
    case "overthinking":
      return `Overthinking detected. Answer in one sentence without qualifiers.`;
    case "unsupported_reasoning":
      return `Reasoning unsupported. Restate the answer with one piece of evidence or authority.`;
    default:
      return `Concept confusion detected. Explain the difference between the correct answer and your answer in one precise sentence.`;
  }
}
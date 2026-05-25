import type {
  GameQuestion,
  GameSession,
  UserAnswer,
  GameMistake,
} from "./types";
import { getXpForDifficulty } from "./scoring";

export function createInitialSession(packId: string): GameSession {
  return {
    id: crypto.randomUUID(),
    packId,
    currentLevelIndex: 0,
    currentQuestionIndex: 0,
    xp: 0,
    focusPoints: 5,
    correctStreak: 0,
    wrongStreak: 0,
    answers: [],
    mistakes: [],
    completed: false,
  };
}

export function normaliseAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export function checkAnswer(question: GameQuestion, userAnswer: string): boolean {
  return normaliseAnswer(userAnswer) === normaliseAnswer(question.correctAnswer);
}

export function createUserAnswer(params: {
  question: GameQuestion;
  userAnswer: string;
  confidence: 1 | 2 | 3 | 4 | 5;
}): UserAnswer {
  const isCorrect = checkAnswer(params.question, params.userAnswer);
  let xpAwarded = isCorrect ? getXpForDifficulty(params.question.difficulty) : 0;
  if (isCorrect && params.confidence <= 2) xpAwarded += 10;
  return {
    questionId: params.question.id,
    userAnswer: params.userAnswer,
    correctAnswer: params.question.correctAnswer,
    isCorrect,
    confidence: params.confidence,
    xpAwarded,
  };
}

function buildRecoveryDrill(skill: string): string {
  return `Redo one short drill targeting: ${skill}. Explain the answer in one precise sentence before moving on.`;
}

export function classifyMistake(question: GameQuestion, answer: UserAnswer): GameMistake {
  const highConfidenceWrong = !answer.isCorrect && answer.confidence >= 4;
  return {
    questionId: question.id,
    prompt: question.prompt,
    userAnswer: answer.userAnswer,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    skillTested: question.skillTested,
    mistakeType: highConfidenceWrong
      ? "false_confidence"
      : question.type === "deep_application" || question.type === "scenario_simulator"
        ? "weak_application"
        : "concept_confusion",
    recoveryDrill: buildRecoveryDrill(question.skillTested),
    resolved: false,
  };
}
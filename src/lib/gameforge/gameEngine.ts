import type {
  GameQuestion,
  GameSession,
  UserAnswer,
  GameMistake,
  GamePack,
} from "./types";
import { getXpForDifficulty, calculateAnswerXp } from "./scoring";
import { STARTING_FOCUS_POINTS } from "./constants";
import { createMistakeFromWrongAnswer } from "./mistakes";

export function createInitialSession(packId: string): GameSession {
  return {
    id: crypto.randomUUID(),
    packId,
    phase: "playing",
    currentLevelIndex: 0,
    currentQuestionIndex: 0,
    xp: 0,
    focusPoints: STARTING_FOCUS_POINTS,
    correctStreak: 0,
    wrongStreak: 0,
    totalAnswered: 0,
    correctAnswers: 0,
    answers: [],
    mistakes: [],
    completed: false,
  };
}

export function normaliseAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function checkAnswer(question: GameQuestion, userAnswer: string): boolean {
  return evaluateAnswer(question, userAnswer);
}

export function evaluateAnswer(question: GameQuestion, userAnswer: string): boolean {
  const u = normaliseAnswer(userAnswer);
  const c = normaliseAnswer(question.correctAnswer);
  const exactTypes = new Set([
    "multiple_choice",
    "multiple_choice_arena",
    "flashcard",
    "flashcard_duel",
    "fill_gap",
    "fill_the_gap",
  ]);
  if (exactTypes.has(question.type)) return u === c;
  const keywords = c.split(" ").filter((w) => w.length >= 4);
  if (keywords.length === 0) return u === c;
  const matched = keywords.filter((w) => u.includes(w));
  return matched.length / keywords.length >= 0.6;
}

export function getCurrentQuestion(pack: GamePack, session: GameSession): GameQuestion | null {
  return pack.levels[session.currentLevelIndex]?.questions[session.currentQuestionIndex] ?? null;
}

export function submitAnswer(params: {
  pack: GamePack;
  session: GameSession;
  question: GameQuestion;
  userAnswer: string;
  confidence: 1 | 2 | 3 | 4 | 5;
}): GameSession {
  const isCorrect = evaluateAnswer(params.question, params.userAnswer);
  const xpAwarded = calculateAnswerXp({
    isCorrect,
    difficulty: params.question.difficulty,
    confidence: params.confidence,
  });
  const answer: UserAnswer = {
    questionId: params.question.id,
    userAnswer: params.userAnswer,
    correctAnswer: params.question.correctAnswer,
    isCorrect,
    confidence: params.confidence,
    xpAwarded,
    answeredAt: new Date().toISOString(),
  };
  const nextMistakes = isCorrect
    ? params.session.mistakes
    : [
        ...params.session.mistakes,
        createMistakeFromWrongAnswer({
          question: params.question,
          userAnswer: params.userAnswer,
          confidence: params.confidence,
        }),
      ];
  return {
    ...params.session,
    phase: "feedback",
    xp: params.session.xp + xpAwarded,
    focusPoints: isCorrect ? params.session.focusPoints : Math.max(0, params.session.focusPoints - 1),
    correctStreak: isCorrect ? params.session.correctStreak + 1 : 0,
    wrongStreak: isCorrect ? 0 : params.session.wrongStreak + 1,
    totalAnswered: (params.session.totalAnswered ?? params.session.answers.length) + 1,
    correctAnswers:
      (params.session.correctAnswers ?? params.session.answers.filter((a) => a.isCorrect).length) +
      (isCorrect ? 1 : 0),
    answers: [...params.session.answers, answer],
    mistakes: nextMistakes,
  };
}

export function moveToNextQuestion(pack: GamePack, session: GameSession): GameSession {
  if (session.focusPoints <= 0) return { ...session, phase: "completed", completed: true };
  if (session.wrongStreak >= 2) return { ...session, phase: "mistake_clinic" };
  const level = pack.levels[session.currentLevelIndex];
  if (session.currentQuestionIndex + 1 < level.questions.length) {
    return { ...session, phase: "playing", currentQuestionIndex: session.currentQuestionIndex + 1 };
  }
  if (session.currentLevelIndex + 1 < pack.levels.length) {
    const nextLevel = pack.levels[session.currentLevelIndex + 1];
    const phase = nextLevel.title.toLowerCase().includes("boss") ? "boss_battle" : "playing";
    return {
      ...session,
      phase,
      currentLevelIndex: session.currentLevelIndex + 1,
      currentQuestionIndex: 0,
    };
  }
  return { ...session, phase: "completed", completed: true };
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
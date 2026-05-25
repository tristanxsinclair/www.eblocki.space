export type GameForgeMode =
  | "law_max"
  | "psych_hd"
  | "sales_close"
  | "language_grind"
  | "sport_iq"
  | "finance_builder"
  | "general_knowledge"
  | "custom";

export type GameForgeIntensity =
  | "casual"
  | "focused"
  | "exam_prep"
  | "boss_fight"
  | "elite_mastery";

export type GameForgeStyle =
  | "quick_sprint"
  | "full_lesson_path"
  | "mistake_clinic"
  | "boss_battle"
  | "scenario_simulator"
  | "memory_drill"
  | "application_challenge"
  | "mixed_mode";

export type GameQuestionType =
  | "flashcard_duel"
  | "multiple_choice_arena"
  | "fill_the_gap"
  | "match_attack"
  | "scenario_simulator"
  | "boss_battle"
  | "speed_sprint"
  | "deep_application";

export type GameDifficulty = "easy" | "medium" | "hard" | "boss";

export type MasteryRank =
  | "Novice"
  | "Operator"
  | "Specialist"
  | "Weaponised"
  | "Elite"
  | "Mastery Candidate"
  | "Exam-Ready"
  | "Top 1%";

export type GameQuestion = {
  id: string;
  type: GameQuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: GameDifficulty;
  skillTested: string;
  xpValue: number;
  feedbackCorrect: string;
  feedbackIncorrect: string;
};

export type GameLevel = {
  id: string;
  title: string;
  objective: string;
  requiredAccuracyToPass: number;
  questions: GameQuestion[];
};

export type GamePack = {
  id: string;
  title: string;
  sourceMaterial: string;
  topicDiagnosis: string;
  learningObjectives: string[];
  mode: GameForgeMode;
  intensity: GameForgeIntensity;
  style: GameForgeStyle;
  levels: GameLevel[];
  createdAt: string;
};

export type UserAnswer = {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  confidence: 1 | 2 | 3 | 4 | 5;
  responseTimeMs?: number;
  xpAwarded: number;
};

export type GameMistake = {
  questionId: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  skillTested?: string;
  mistakeType:
    | "recall_gap"
    | "concept_confusion"
    | "weak_application"
    | "speed_precision_leak"
    | "overthinking"
    | "false_confidence"
    | "unsupported_reasoning";
  recoveryDrill: string;
  resolved: boolean;
};

export type GameSession = {
  id: string;
  packId: string;
  currentLevelIndex: number;
  currentQuestionIndex: number;
  xp: number;
  focusPoints: number;
  correctStreak: number;
  wrongStreak: number;
  answers: UserAnswer[];
  mistakes: GameMistake[];
  completed: boolean;
};

export type GameForgeProofArtifact = {
  domain: GameForgeMode;
  topic: string;
  gameMode: GameForgeStyle;
  evidenceCompleted: string;
  weaknessFound: string;
  skillImproved: string;
  xpEarned: number;
  accuracy: number;
  masteryRank: MasteryRank;
  nextUpgrade: string;
  createdAt: string;
};
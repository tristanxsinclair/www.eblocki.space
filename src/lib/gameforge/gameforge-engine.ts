export type GameForgeMode =
  | "law"
  | "psychology"
  | "sales"
  | "language"
  | "sport"
  | "finance"
  | "general"
  | "custom";

export type GameForgeIntensity = "warmup" | "focused" | "exam" | "pressure" | "elite";

export type GameForgeGameStyle =
  | "recall"
  | "scenario"
  | "boss_battle"
  | "speed_round"
  | "mistake_clinic"
  | "mixed"
  | "court_trial"
  | "transfer_challenge";

export type GameForgeAnswerMode = "choice" | "text";
export type GameForgeDifficulty = "easy" | "medium" | "hard" | "boss";
export type GameForgeSessionPhase = "ready" | "playing" | "feedback" | "mistake_clinic" | "boss_battle" | "complete";

export interface GameForgeInput {
  material: string;
  mode?: GameForgeMode | "auto";
  intensity?: GameForgeIntensity;
  style?: GameForgeGameStyle;
}

export interface GameForgeConcept {
  id: string;
  term: string;
  clue: string;
  sourceFragment: string;
}

export interface GameForgeQuestion {
  id: string;
  type: GameForgeGameStyle;
  answerMode: GameForgeAnswerMode;
  prompt: string;
  options?: string[];
  expectedAnswer: string;
  evaluationKeywords: string[];
  explanation: string;
  difficulty: GameForgeDifficulty;
  skill: string;
  concept: string;
  xp: number;
}

export interface GameForgeScenario {
  id: string;
  title: string;
  setup: string;
  decisionPrompt: string;
  idealMove: string;
}

export interface GameForgeRound {
  id: string;
  title: string;
  style: GameForgeGameStyle;
  objective: string;
  timePressureSeconds?: number;
  questions: GameForgeQuestion[];
}

export interface GameForgeLevel {
  id: string;
  title: string;
  objective: string;
  difficulty: GameForgeDifficulty;
  rounds: GameForgeRound[];
}

export interface GameForgePack {
  id: string;
  title: string;
  detectedDomain: GameForgeMode;
  mode: GameForgeMode;
  intensity: GameForgeIntensity;
  style: GameForgeGameStyle;
  difficultyRating: number;
  learningObjectives: string[];
  concepts: GameForgeConcept[];
  levels: GameForgeLevel[];
  bossBattle: GameForgeScenario;
  proofStandard: string;
  nextPracticeRecommendation: string;
  createdAt: string;
}

export interface GameForgeFeedback {
  questionId: string;
  prompt: string;
  userAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
  confidence: 1 | 2 | 3 | 4 | 5;
  responseTimeMs: number;
  xpAwarded: number;
  mistakeKind?: "recall_gap" | "weak_application" | "false_confidence" | "speed_leak" | "concept_confusion";
  skill: string;
  concept: string;
  explanation: string;
  recoveryDrill: string;
  resolved: boolean;
}

export interface GameForgeSession {
  id: string;
  packId: string;
  phase: GameForgeSessionPhase;
  currentLevelIndex: number;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  answers: GameForgeFeedback[];
  mistakes: GameForgeFeedback[];
  xp: number;
  streak: number;
  focus: number;
  adaptiveDifficulty: GameForgeDifficulty;
  startedAt: string;
}

export interface GameForgeMasteryResult {
  score: number;
  scoreBucket: "weak" | "developing" | "solid" | "strong" | "mastery";
  accuracy: number;
  xp: number;
  masteryLabel: string;
  weakPoints: string[];
  strongestSkill: string;
  completedBossBattle: boolean;
  nextPracticeRecommendation: string;
  summary: string;
}

export interface GameForgeProofArtifact {
  title: string;
  domain: GameForgeMode;
  artifactType: "gameforge_mastery_result";
  summary: string;
  masteryScore: number;
  weakPoint: string;
  evidence: string;
  nextUpgrade: string;
  createdAt: string;
}

export interface GameForgeAIPayload {
  system: string;
  user: string;
  expectedJsonShape: string[];
  privacyRules: string[];
}

const DOMAIN_KEYWORDS: Record<GameForgeMode, string[]> = {
  law: ["law", "legal", "irac", "case", "statute", "statutory", "jurisdiction", "contract", "tort", "authority"],
  psychology: ["psych", "cognition", "behaviour", "behavior", "study", "evidence", "concept", "evaluation", "memory", "development"],
  sales: ["sales", "customer", "objection", "close", "premium", "gse", "warranty", "value", "aov", "attach"],
  language: ["translate", "spanish", "vocab", "grammar", "sentence", "phrase", "conversation", "word"],
  sport: ["sport", "soccer", "football", "tactic", "press", "movement", "match", "drill", "finish", "scan"],
  finance: ["finance", "budget", "interest", "risk", "return", "saving", "debt", "invest", "cost", "inflation"],
  general: ["concept", "explain", "apply", "learn", "practice", "transfer"],
  custom: [],
};

const MODE_LABELS: Record<GameForgeMode, string> = {
  law: "Court Mode",
  psychology: "Psych HD Arena",
  sales: "Sales Objection Arena",
  language: "Language Sprint",
  sport: "Sport IQ Tactical Read",
  finance: "Finance Decision Lab",
  general: "Concept Forge",
  custom: "Custom Forge",
};

const MODE_FRAMEWORKS: Record<GameForgeMode, string> = {
  law: "Issue -> Rule -> Application -> Conclusion",
  psychology: "Concept -> Application -> Evidence -> Evaluation",
  sales: "Need -> Value -> Objection -> Close",
  language: "Recall -> Sentence -> Variation -> Conversation",
  sport: "Observe -> Decide -> Execute -> Review",
  finance: "Situation -> Risk -> Decision -> Future Impact",
  general: "Recall -> Explain -> Apply -> Transfer",
  custom: "Define -> Apply -> Test -> Improve",
};

const STOP_WORDS = new Set([
  "about", "after", "again", "being", "because", "before", "between", "could", "every", "first", "from", "have", "into", "more", "must", "other", "should", "their", "there", "these", "thing", "those", "through", "under", "where", "which", "while", "with", "without", "would",
]);

function makeId(prefix: string, seed: string, index = 0): string {
  let hash = 0;
  const value = `${prefix}:${seed}:${index}`;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return `${prefix}_${hash.toString(36)}_${index}`;
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function detectGameForgeMode(material: string): GameForgeMode {
  const text = normalise(material);
  let best: GameForgeMode = "general";
  let bestScore = 0;
  for (const [mode, keywords] of Object.entries(DOMAIN_KEYWORDS) as Array<[GameForgeMode, string[]]>) {
    if (mode === "custom") continue;
    const score = keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = mode;
      bestScore = score;
    }
  }
  return best;
}

export function parseGameForgeConcepts(material: string): GameForgeConcept[] {
  const safeMaterial = material.trim() || "core concept application evidence transfer proof";
  const fragments = safeMaterial
    .split(/[\n.;:!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const words = normalise(safeMaterial)
    .split(" ")
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
  const ranked = Array.from(new Set(words))
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);
  const terms = ranked.length >= 4 ? ranked : [...ranked, "concept", "application", "evidence", "transfer"].slice(0, 6);

  return terms.slice(0, 10).map((term, index) => {
    const sourceFragment = fragments.find((fragment) => normalise(fragment).includes(term)) ?? fragments[index % Math.max(1, fragments.length)] ?? safeMaterial;
    return {
      id: makeId("concept", term, index),
      term,
      clue: clip(sourceFragment, 120),
      sourceFragment: clip(sourceFragment, 220),
    };
  });
}

function styleTitle(style: GameForgeGameStyle, mode: GameForgeMode): string {
  if (style === "court_trial") return "Court Mode";
  if (style === "boss_battle") return "Boss Battle";
  if (style === "mistake_clinic") return "Mistake Clinic";
  if (style === "speed_round") return "Speed Round";
  if (style === "transfer_challenge") return "Transfer Challenge";
  if (style === "scenario") return mode === "sales" ? "Objection Arena" : "Scenario Trial";
  if (style === "recall") return "Recall Duel";
  return MODE_LABELS[mode];
}

function difficultyFor(index: number, boss = false): GameForgeDifficulty {
  if (boss) return "boss";
  if (index >= 6) return "hard";
  if (index >= 3) return "medium";
  return "easy";
}

function xpFor(difficulty: GameForgeDifficulty): number {
  if (difficulty === "boss") return 50;
  if (difficulty === "hard") return 25;
  if (difficulty === "medium") return 15;
  return 8;
}

function domainSkill(mode: GameForgeMode, level: number): string {
  const skills: Record<GameForgeMode, string[]> = {
    law: ["issue spotting", "authority application", "counterargument"],
    psychology: ["concept definition", "scenario application", "evidence evaluation"],
    sales: ["customer diagnosis", "value framing", "objection handling"],
    language: ["active recall", "sentence repair", "conversation use"],
    sport: ["tactical read", "decision correction", "match transfer"],
    finance: ["calculation", "risk judgement", "opportunity cost"],
    general: ["recall", "application", "transfer"],
    custom: ["definition", "application", "transfer"],
  };
  return skills[mode][Math.min(level, 2)];
}

function buildOptions(concept: GameForgeConcept, allConcepts: GameForgeConcept[]): string[] {
  const distractors = allConcepts
    .map((candidate) => candidate.term)
    .filter((term) => term !== concept.term)
    .slice(0, 3);
  const fallback = ["surface detail", "unsupported assumption", "irrelevant example"];
  const options = [concept.term, ...distractors, ...fallback].slice(0, 4);
  return options.sort((a, b) => a.localeCompare(b));
}

function buildQuestion(params: {
  concept: GameForgeConcept;
  concepts: GameForgeConcept[];
  mode: GameForgeMode;
  style: GameForgeGameStyle;
  index: number;
  level: number;
  boss?: boolean;
}): GameForgeQuestion {
  const difficulty = difficultyFor(params.index, params.boss);
  const skill = domainSkill(params.mode, params.level);
  const framework = MODE_FRAMEWORKS[params.mode];
  const isChoice = params.style === "recall" || params.style === "speed_round" || params.index % 3 === 0;
  const type = params.boss ? "boss_battle" : params.style;
  const prompt = params.boss
    ? `Boss Battle: use ${params.concept.term} under pressure. Give the strongest ${framework} move.`
    : params.style === "scenario" || params.style === "court_trial" || params.style === "transfer_challenge"
      ? `Apply ${params.concept.term} to this situation: ${params.concept.clue}. What is the correct move?`
      : params.style === "mistake_clinic"
        ? `Repair the weak point: explain ${params.concept.term} precisely, then name the mistake it prevents.`
        : isChoice
          ? `Recall Duel: which concept is being tested by this clue? ${params.concept.clue}`
          : `Concept Forge: explain ${params.concept.term} using ${framework}.`;

  return {
    id: makeId("question", `${params.concept.term}:${type}`, params.index),
    type,
    answerMode: isChoice && !params.boss ? "choice" : "text",
    prompt,
    options: isChoice && !params.boss ? buildOptions(params.concept, params.concepts) : undefined,
    expectedAnswer: params.concept.term,
    evaluationKeywords: [params.concept.term, ...params.concept.term.split(/\s+/), skill.split(" ")[0]].filter(Boolean),
    explanation: `${params.concept.term} is the target concept. Strong answers connect it to ${framework} and avoid passive familiarity.`,
    difficulty,
    skill,
    concept: params.concept.term,
    xp: xpFor(difficulty),
  };
}

function buildRound(params: {
  idSeed: string;
  title: string;
  style: GameForgeGameStyle;
  objective: string;
  concepts: GameForgeConcept[];
  mode: GameForgeMode;
  level: number;
  offset: number;
  count: number;
  timePressureSeconds?: number;
}): GameForgeRound {
  const questions = params.concepts.slice(params.offset, params.offset + params.count).map((concept, localIndex) =>
    buildQuestion({
      concept,
      concepts: params.concepts,
      mode: params.mode,
      style: params.style,
      index: params.offset + localIndex,
      level: params.level,
    }),
  );
  return {
    id: makeId("round", params.idSeed, params.level),
    title: params.title,
    style: params.style,
    objective: params.objective,
    timePressureSeconds: params.timePressureSeconds,
    questions,
  };
}

function proofStandardFor(mode: GameForgeMode): string {
  const standards: Record<GameForgeMode, string> = {
    law: "Proof must show issue, rule, application, conclusion, and one counterargument or authority check.",
    psychology: "Proof must show concept, application, evidence, evaluation, and a limitation.",
    sales: "Proof must show customer need, value frame, objection move, and close attempt.",
    language: "Proof must show recall, sentence production, correction, and conversation use.",
    sport: "Proof must show tactical read, decision correction, drill, and match-transfer target.",
    finance: "Proof must show a number, risk decision, opportunity cost, and next money rule.",
    general: "Proof must show recall, explanation, application, and transfer.",
    custom: "Proof must show definition, application, correction, and next upgrade.",
  };
  return standards[mode];
}

function recommendationFor(mode: GameForgeMode, style: GameForgeGameStyle): string {
  if (style !== "mistake_clinic") return `Replay as Mistake Clinic and attack the weakest ${domainSkill(mode, 1)} pattern.`;
  return `Replay as Boss Battle once all mistakes are resolved.`;
}

export function buildGameForgePack(input: GameForgeInput): GameForgePack {
  const material = input.material?.trim() || "Core concept. Apply it. Test it. Produce proof.";
  const detectedDomain = detectGameForgeMode(material);
  const mode = input.mode && input.mode !== "auto" ? input.mode : detectedDomain;
  const intensity = input.intensity ?? "focused";
  const style = input.style ?? "mixed";
  const concepts = parseGameForgeConcepts(material);
  const styleA = style === "mixed" ? "recall" : style;
  const styleB = style === "mixed" ? "scenario" : style === "recall" ? "scenario" : style;
  const styleC = style === "mixed" ? "transfer_challenge" : style;
  const expandedConcepts = concepts.length >= 9 ? concepts : [...concepts, ...concepts, ...concepts].slice(0, 9);
  const titleConcept = titleCase(concepts[0]?.term ?? "Practice");
  const difficultyRating = intensity === "elite" ? 9 : intensity === "pressure" ? 8 : intensity === "exam" ? 7 : intensity === "focused" ? 5 : 3;
  const bossConcept = expandedConcepts[expandedConcepts.length - 1];
  const bossQuestion = buildQuestion({
    concept: bossConcept,
    concepts: expandedConcepts,
    mode,
    style: "boss_battle",
    index: 99,
    level: 2,
    boss: true,
  });

  const levels: GameForgeLevel[] = [
    {
      id: makeId("level", `${mode}:recall`, 0),
      title: "Level 1 - Recall Duel",
      objective: "Prove the core terms are available without notes.",
      difficulty: "easy",
      rounds: [
        buildRound({ idSeed: `${mode}:recall`, title: "Recall Duel", style: styleA, objective: "Name the concept from the clue.", concepts: expandedConcepts, mode, level: 0, offset: 0, count: 3, timePressureSeconds: style === "speed_round" ? 45 : undefined }),
      ],
    },
    {
      id: makeId("level", `${mode}:application`, 1),
      title: "Level 2 - Application Arena",
      objective: "Apply the concept to a realistic pressure situation.",
      difficulty: "medium",
      rounds: [
        buildRound({ idSeed: `${mode}:scenario`, title: styleTitle(styleB, mode), style: styleB, objective: "Move from recognition to applied judgement.", concepts: expandedConcepts, mode, level: 1, offset: 3, count: 3 }),
      ],
    },
    {
      id: makeId("level", `${mode}:boss`, 2),
      title: "Level 3 - Boss Battle",
      objective: "Synthesize the weak points into one high-pressure answer.",
      difficulty: "boss",
      rounds: [
        buildRound({ idSeed: `${mode}:transfer`, title: styleTitle(styleC, mode), style: styleC, objective: "Transfer the skill outside the original wording.", concepts: expandedConcepts, mode, level: 2, offset: 6, count: 2 }),
        {
          id: makeId("round", `${mode}:boss`, 3),
          title: "Boss Battle",
          style: "boss_battle",
          objective: "One answer that proves mastery under pressure.",
          timePressureSeconds: intensity === "warmup" ? undefined : 90,
          questions: [bossQuestion],
        },
      ],
    },
  ];

  return {
    id: makeId("pack", `${mode}:${material}`, material.length),
    title: `${MODE_LABELS[mode]}: ${titleConcept}`,
    detectedDomain,
    mode,
    intensity,
    style,
    difficultyRating,
    learningObjectives: [
      `Recall the strongest concepts from the material.`,
      `Apply them through ${MODE_FRAMEWORKS[mode]}.`,
      `Expose weak points through mistakes and confidence checks.`,
      `Produce one proof artifact that can feed Eblocki evidence.`,
    ],
    concepts,
    levels,
    bossBattle: {
      id: makeId("scenario", `${mode}:boss`, 0),
      title: "Boss Battle",
      setup: `You must use ${bossConcept.term} without hiding behind passive recall.`,
      decisionPrompt: bossQuestion.prompt,
      idealMove: bossQuestion.expectedAnswer,
    },
    proofStandard: proofStandardFor(mode),
    nextPracticeRecommendation: recommendationFor(mode, style),
    createdAt: new Date().toISOString(),
  };
}

export function createInitialGameForgeSession(pack: GameForgePack): GameForgeSession {
  return {
    id: makeId("session", pack.id, 0),
    packId: pack.id,
    phase: "playing",
    currentLevelIndex: 0,
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    answers: [],
    mistakes: [],
    xp: 0,
    streak: 0,
    focus: 5,
    adaptiveDifficulty: "easy",
    startedAt: new Date().toISOString(),
  };
}

export function getActiveQuestion(pack: GameForgePack, session: GameForgeSession): GameForgeQuestion | null {
  return pack.levels[session.currentLevelIndex]?.rounds[session.currentRoundIndex]?.questions[session.currentQuestionIndex] ?? null;
}

function evaluateQuestion(question: GameForgeQuestion, userAnswer: string): boolean {
  const answer = normalise(userAnswer);
  const expected = normalise(question.expectedAnswer);
  if (!answer) return false;
  if (question.answerMode === "choice") return answer === expected;
  if (answer.includes(expected)) return true;
  const keywords = question.evaluationKeywords.map(normalise).filter((word) => word.length >= 4);
  const hits = keywords.filter((keyword) => answer.includes(keyword)).length;
  return hits >= Math.min(2, Math.max(1, keywords.length));
}

function mistakeKind(question: GameForgeQuestion, isCorrect: boolean, confidence: 1 | 2 | 3 | 4 | 5, responseTimeMs: number): GameForgeFeedback["mistakeKind"] | undefined {
  if (isCorrect) return undefined;
  if (confidence >= 4) return "false_confidence";
  if (responseTimeMs > 0 && responseTimeMs < 2500) return "speed_leak";
  if (question.type === "scenario" || question.type === "court_trial" || question.type === "transfer_challenge" || question.type === "boss_battle") return "weak_application";
  return "concept_confusion";
}

function recoveryDrill(kind: GameForgeFeedback["mistakeKind"], skill: string): string {
  if (kind === "false_confidence") return `Re-answer one ${skill} question with confidence capped at 3 until the explanation is accurate.`;
  if (kind === "speed_leak") return `Slow drill: state the concept first, then answer in one sentence.`;
  if (kind === "weak_application") return `Application repair: define the concept, then apply it to a new scenario in two sentences.`;
  if (kind === "recall_gap") return `Recall repair: write the definition once, hide it, then answer again without notes.`;
  return `Concept repair: explain the difference between your answer and the expected answer in one precise sentence.`;
}

function nextAdaptiveDifficulty(session: GameForgeSession, isCorrect: boolean): GameForgeDifficulty {
  const recent = [...session.answers].slice(-2);
  const recentWrong = recent.filter((answer) => !answer.isCorrect).length + (isCorrect ? 0 : 1);
  if (recentWrong >= 2) return "easy";
  if (session.streak >= 2 && isCorrect) return "hard";
  if (isCorrect) return session.adaptiveDifficulty === "easy" ? "medium" : session.adaptiveDifficulty;
  return "medium";
}

export function submitGameForgeAnswer(params: {
  pack: GameForgePack;
  session: GameForgeSession;
  question: GameForgeQuestion;
  userAnswer: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  responseTimeMs?: number;
}): { session: GameForgeSession; feedback: GameForgeFeedback } {
  const isCorrect = evaluateQuestion(params.question, params.userAnswer);
  const kind = mistakeKind(params.question, isCorrect, params.confidence, params.responseTimeMs ?? 0);
  const xpAwarded = isCorrect ? params.question.xp + (params.confidence <= 2 ? 5 : 0) : 0;
  const feedback: GameForgeFeedback = {
    questionId: params.question.id,
    prompt: params.question.prompt,
    userAnswer: clip(params.userAnswer, 240),
    expectedAnswer: params.question.expectedAnswer,
    isCorrect,
    confidence: params.confidence,
    responseTimeMs: params.responseTimeMs ?? 0,
    xpAwarded,
    mistakeKind: kind,
    skill: params.question.skill,
    concept: params.question.concept,
    explanation: params.question.explanation,
    recoveryDrill: recoveryDrill(kind, params.question.skill),
    resolved: false,
  };
  const nextAnswers = [...params.session.answers, feedback];
  const nextMistakes = isCorrect ? params.session.mistakes : [...params.session.mistakes, feedback];
  return {
    feedback,
    session: {
      ...params.session,
      phase: "feedback",
      answers: nextAnswers,
      mistakes: nextMistakes,
      xp: params.session.xp + xpAwarded,
      streak: isCorrect ? params.session.streak + 1 : 0,
      focus: isCorrect ? params.session.focus : Math.max(0, params.session.focus - 1),
      adaptiveDifficulty: nextAdaptiveDifficulty(params.session, isCorrect),
    },
  };
}

export function advanceGameForgeSession(pack: GameForgePack, session: GameForgeSession): GameForgeSession {
  if (session.focus <= 0) return { ...session, phase: "complete" };
  const level = pack.levels[session.currentLevelIndex];
  const round = level?.rounds[session.currentRoundIndex];
  if (!level || !round) return { ...session, phase: "complete" };
  if (session.currentQuestionIndex + 1 < round.questions.length) {
    const nextQuestion = round.questions[session.currentQuestionIndex + 1];
    return { ...session, phase: nextQuestion.type === "boss_battle" ? "boss_battle" : "playing", currentQuestionIndex: session.currentQuestionIndex + 1 };
  }
  if (session.currentRoundIndex + 1 < level.rounds.length) {
    const nextRound = level.rounds[session.currentRoundIndex + 1];
    return { ...session, phase: nextRound.style === "boss_battle" ? "boss_battle" : "playing", currentRoundIndex: session.currentRoundIndex + 1, currentQuestionIndex: 0 };
  }
  if (session.currentLevelIndex + 1 < pack.levels.length) {
    return { ...session, phase: "playing", currentLevelIndex: session.currentLevelIndex + 1, currentRoundIndex: 0, currentQuestionIndex: 0 };
  }
  return { ...session, phase: "complete" };
}

export function resolveGameForgeMistake(session: GameForgeSession, questionId: string): GameForgeSession {
  return {
    ...session,
    xp: session.xp + 5,
    mistakes: session.mistakes.map((mistake) => mistake.questionId === questionId ? { ...mistake, resolved: true } : mistake),
  };
}

export function buildGameForgeMasteryResult(pack: GameForgePack, session: GameForgeSession): GameForgeMasteryResult {
  const total = session.answers.length;
  const correct = session.answers.filter((answer) => answer.isCorrect).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const bossAnswered = session.answers.some((answer) => pack.levels.some((level) => level.rounds.some((round) => round.questions.some((q) => q.id === answer.questionId && q.type === "boss_battle"))));
  const resolvedCount = session.mistakes.filter((mistake) => mistake.resolved).length;
  const score = Math.max(0, Math.min(100, Math.round(accuracy * 0.7 + Math.min(20, session.xp / 8) + (bossAnswered ? 8 : 0) + resolvedCount * 3)));
  const scoreBucket: GameForgeMasteryResult["scoreBucket"] = score >= 90 ? "mastery" : score >= 78 ? "strong" : score >= 62 ? "solid" : score >= 40 ? "developing" : "weak";
  const weakPoints = Array.from(new Set(session.mistakes.map((mistake) => mistake.skill || mistake.concept))).slice(0, 4);
  const skillCounts = session.answers.reduce<Record<string, number>>((acc, answer) => {
    if (answer.isCorrect) acc[answer.skill] = (acc[answer.skill] ?? 0) + 1;
    return acc;
  }, {});
  const strongestSkill = Object.entries(skillCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? domainSkill(pack.mode, 0);
  return {
    score,
    scoreBucket,
    accuracy,
    xp: session.xp,
    masteryLabel: scoreBucket === "mastery" ? "Mastery Candidate" : scoreBucket === "strong" ? "Battle Ready" : scoreBucket === "solid" ? "Operator" : scoreBucket === "developing" ? "Developing" : "Needs Clinic",
    weakPoints: weakPoints.length ? weakPoints : ["no major weakness detected"],
    strongestSkill,
    completedBossBattle: bossAnswered,
    nextPracticeRecommendation: weakPoints.length ? `Run Mistake Clinic on ${weakPoints[0]}.` : pack.nextPracticeRecommendation,
    summary: `${pack.title}: ${accuracy}% accuracy, ${session.xp} XP, ${weakPoints.length} weak point signal(s).`,
  };
}

export function buildGameForgeProofArtifact(pack: GameForgePack, result: GameForgeMasteryResult): GameForgeProofArtifact {
  return {
    title: `GameForge proof: ${pack.title}`,
    domain: pack.mode,
    artifactType: "gameforge_mastery_result",
    summary: result.summary,
    masteryScore: result.score,
    weakPoint: result.weakPoints[0] ?? "none detected",
    evidence: `${result.accuracy}% accuracy, ${result.xp} XP, boss battle ${result.completedBossBattle ? "completed" : "not completed"}.`,
    nextUpgrade: result.nextPracticeRecommendation,
    createdAt: new Date().toISOString(),
  };
}

export function buildGameForgeAIPayload(input: GameForgeInput): GameForgeAIPayload {
  return {
    system: "Create a JSON-only GameForge practice pack. Keep it evidence-backed, uncertainty-aware, and directly playable. Do not invent sources. Do not include secrets or personal notes.",
    user: clip(input.material ?? "", 2000),
    expectedJsonShape: ["title", "detectedDomain", "difficultyRating", "learningObjectives", "levels", "rounds", "bossBattle", "proofArtifact"],
    privacyRules: ["no raw private notes in analytics", "no secrets", "no fake AI claim", "fallback must be deterministic if AI fails"],
  };
}

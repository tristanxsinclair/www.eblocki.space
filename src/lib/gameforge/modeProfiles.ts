import type { GameForgeMode } from "./types";

export type GameForgeModeProfile = {
  label: string;
  description: string;
  skills: string[];
  answerFramework: string;
  feedbackVoice: string;
  strongQuestionPattern: string;
  weakQuestionPattern: string;
  proofStandard: string;
};

export const GAMEFORGE_MODE_PROFILES: Record<GameForgeMode, GameForgeModeProfile> = {
  law_max: {
    label: "Law Max",
    description:
      "Curtin law exam training with IRAC, issue spotting, authority hierarchy, statutory interpretation, and AGLC4 discipline.",
    skills: [
      "issue spotting",
      "IRAC",
      "statutory interpretation",
      "text-context-purpose",
      "authority hierarchy",
      "client advice reasoning",
      "AGLC4 precision",
    ],
    answerFramework: "Issue → Rule → Application → Conclusion",
    feedbackVoice: "strict law marker",
    strongQuestionPattern:
      "Put the user into a legal scenario and force issue identification or rule application.",
    weakQuestionPattern:
      "Do not ask vague definition-only questions unless it is Level 1 recall.",
    proofStandard:
      "A strong law proof artifact must show issue, rule, application, authority awareness, and citation discipline.",
  },
  psych_hd: {
    label: "Psych HD",
    description:
      "Psychology mastery using Concept → Application → Evidence → Evaluation.",
    skills: [
      "concept definition",
      "application",
      "evidence use",
      "critical evaluation",
      "research method awareness",
      "alternative explanations",
    ],
    answerFramework: "Concept → Application → Evidence → Evaluation",
    feedbackVoice: "strict psychology tutor",
    strongQuestionPattern:
      "Force the user to apply a concept to behaviour, evidence, or a scenario.",
    weakQuestionPattern: "Avoid concept-only questions after the first level.",
    proofStandard:
      "A strong psychology proof artifact must include concept, application, evidence, and evaluation.",
  },
  sales_close: {
    label: "Sales Close",
    description:
      "High-ticket retail sales training for needs diagnosis, premium positioning, GSE, objections, AOV, and closing.",
    skills: [
      "needs diagnosis",
      "premium positioning",
      "GSE attachment",
      "objection handling",
      "closing",
      "AOV growth",
      "customer trust",
    ],
    answerFramework: "Need → Match → Value → Objection → Close",
    feedbackVoice: "sales floor performance coach",
    strongQuestionPattern:
      "Put the user into a customer interaction and force a value-framing or closing decision.",
    weakQuestionPattern: "Avoid generic product trivia unless tied to customer benefit.",
    proofStandard:
      "A strong sales proof artifact must improve real customer diagnosis, premium value, GSE attachment, or revenue behaviour.",
  },
  language_grind: {
    label: "Language Grind",
    description: "Active recall, sentence construction, translation, and conversation confidence.",
    skills: [
      "vocabulary",
      "sentence building",
      "translation",
      "grammar pattern",
      "conversation choice",
      "recall speed",
    ],
    answerFramework: "Meaning → Sentence → Variation → Conversation Use",
    feedbackVoice: "direct language coach",
    strongQuestionPattern: "Force active production, not just recognition.",
    weakQuestionPattern: "Avoid passive multiple-choice only.",
    proofStandard: "A strong language proof artifact must show active recall and sentence production.",
  },
  sport_iq: {
    label: "Sport IQ",
    description:
      "Tactical sport decision-making, scanning, positioning, movement, finishing, and transfer to match behaviour.",
    skills: [
      "scanning",
      "movement",
      "positioning",
      "energy management",
      "finishing decision",
      "pressing",
      "match transfer",
    ],
    answerFramework: "Observe → Decide → Execute → Review",
    feedbackVoice: "tactical coach",
    strongQuestionPattern: "Place the user in a match situation and force a decision.",
    weakQuestionPattern: "Avoid generic motivation or vague sport advice.",
    proofStandard:
      "A strong sport proof artifact must produce a tactical correction, drill, or match-transfer target.",
  },
  finance_builder: {
    label: "Finance Builder",
    description:
      "Financial literacy, spending control, risk, saving, allocation, opportunity cost, and future optionality.",
    skills: ["budgeting", "risk control", "saving", "opportunity cost", "allocation", "income decision"],
    answerFramework: "Situation → Risk → Decision → Future Impact",
    feedbackVoice: "future-self finance coach",
    strongQuestionPattern: "Force a measurable financial decision.",
    weakQuestionPattern: "Avoid vague money advice.",
    proofStandard:
      "A strong finance proof artifact must include a number, allocation, risk-control decision, or measurable action.",
  },
  general_knowledge: {
    label: "General Knowledge",
    description: "General mastery through recall, application, evaluation, and transfer.",
    skills: ["recall", "understanding", "application", "evaluation", "transfer"],
    answerFramework: "Recall → Explain → Apply → Evaluate → Transfer",
    feedbackVoice: "strict learning coach",
    strongQuestionPattern: "Move beyond recall into scenario transfer.",
    weakQuestionPattern: "Avoid generic trivia loops.",
    proofStandard: "A strong proof artifact must show applied understanding and a next upgrade.",
  },
  custom: {
    label: "Custom",
    description: "User-defined GameForge mode.",
    skills: ["custom recall", "custom application", "custom transfer"],
    answerFramework: "Define → Apply → Test → Improve",
    feedbackVoice: "adaptive Eblocki coach",
    strongQuestionPattern: "Use the supplied material and create applied questions.",
    weakQuestionPattern: "Avoid generic filler.",
    proofStandard: "A strong custom proof artifact must show visible learning and a next action.",
  },
};
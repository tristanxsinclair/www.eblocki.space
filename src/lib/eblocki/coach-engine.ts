import type { GameForgeGameStyle, GameForgeMode } from "@/lib/gameforge/gameforge-engine";

export type CoachDetectedDomain =
  | "law"
  | "psychology"
  | "sales"
  | "sport"
  | "language"
  | "finance"
  | "product"
  | "study"
  | "life"
  | "general";

export type CoachDetectedIntent =
  | "question"
  | "diagnosis"
  | "study_help"
  | "proof_review"
  | "planning"
  | "execution"
  | "prompt_building"
  | "practice_request"
  | "emotional_regulation"
  | "decision";

export type CoachDetectedState =
  | "clear"
  | "avoidant"
  | "overplanning"
  | "overloaded"
  | "low_energy"
  | "confused"
  | "urgent"
  | "stuck_loop";

export type CoachUrgency = "low" | "normal" | "high" | "crisis_boundary";

export type CoachResponseMode =
  | "direct_answer"
  | "diagnostic_coaching"
  | "study_coach"
  | "law_reasoning"
  | "psychology_reasoning"
  | "sales_coach"
  | "sport_coach"
  | "product_builder"
  | "life_strategy"
  | "emotional_regulation"
  | "proof_review"
  | "prompt_builder"
  | "planning"
  | "execution_lock"
  | "crisis_boundary_safe";

export interface CoachInput {
  input: string;
  preferredMode?: CoachResponseMode | "auto";
  recentProofCount?: number;
  recentWeakPoint?: string | null;
}

export interface CoachGameForgeSuggestion {
  title: string;
  reason: string;
  mode: GameForgeMode;
  style: GameForgeGameStyle;
  sourceMaterial: string;
}

export interface CoachAiPayload {
  system: string;
  user: string;
  responseMode: CoachResponseMode;
  safeContext: Record<string, string | number | boolean | null>;
  forbidden: string[];
}

export interface CoachEngineResult {
  detectedDomain: CoachDetectedDomain;
  detectedIntent: CoachDetectedIntent;
  detectedState: CoachDetectedState;
  urgency: CoachUrgency;
  responseMode: CoachResponseMode;
  internalPromptSummary: string;
  diagnosis: string;
  answer: string;
  plan: string[];
  proofAction: string;
  proofActionType: "artifact" | "practice_result" | "written_answer" | "decision_log" | "conversation_attempt" | "implementation";
  nextCheckpoint: string;
  followUpQuestion?: string;
  warning?: string;
  suggestedGameForgePack?: CoachGameForgeSuggestion;
  aiPayload: CoachAiPayload;
}

const DOMAIN_KEYWORDS: Record<CoachDetectedDomain, string[]> = {
  law: ["law", "legal", "irac", "case", "statute", "statutory", "jurisdiction", "contract", "tort", "authority"],
  psychology: ["psych", "cognition", "behaviour", "behavior", "evidence", "concept", "evaluation", "study", "research", "therapy"],
  sales: ["sales", "customer", "objection", "close", "premium", "gse", "warranty", "aov", "attach", "pitch"],
  sport: ["sport", "soccer", "football", "training", "match", "tactic", "drill", "movement", "finish", "press"],
  language: ["spanish", "language", "vocab", "translate", "grammar", "sentence", "conversation", "word"],
  finance: ["finance", "budget", "money", "debt", "saving", "invest", "risk", "return", "cost", "income"],
  product: ["product", "feature", "build", "bug", "ship", "repo", "code", "implementation", "dashboard", "app"],
  study: ["study", "exam", "assignment", "lecture", "notes", "revision", "practice", "topic", "memorise", "memorize"],
  life: ["life", "relationship", "sleep", "energy", "habit", "emotion", "stress", "overwhelmed", "avoidance"],
  general: ["problem", "plan", "help", "question", "task"],
};

const GAMEFORGE_DOMAIN_MAP: Partial<Record<CoachDetectedDomain, GameForgeMode>> = {
  law: "law",
  psychology: "psychology",
  sales: "sales",
  sport: "sport",
  language: "language",
  finance: "finance",
  study: "general",
  general: "general",
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function lower(value: string): string {
  return clean(value).toLowerCase();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function scoreKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

export function detectCoachDomain(input: string): CoachDetectedDomain {
  const text = lower(input);
  let best: CoachDetectedDomain = "general";
  let bestScore = 0;
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as Array<[CoachDetectedDomain, string[]]>) {
    const score = scoreKeywords(text, keywords);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  if (best === "general" && text.length > 500) return "study";
  return best;
}

export function detectCoachIntent(input: string): CoachDetectedIntent {
  const text = lower(input);
  if (/\b(review|mark|judge|score|feedback)\b/.test(text)) return "proof_review";
  if (/\b(practice|quiz|game|drill|memorise|memorize|test me)\b/.test(text)) return "practice_request";
  if (/\b(plan|schedule|roadmap|structure|organise|organize)\b/.test(text)) return "planning";
  if (/\b(avoid|stuck|procrastinat|can't start|cant start|keep delaying)\b/.test(text)) return "execution";
  if (/\b(prompt|rewrite this prompt|better prompt)\b/.test(text)) return "prompt_building";
  if (/\b(anxious|panic|overwhelmed|spiral|emotional|stress)\b/.test(text)) return "emotional_regulation";
  if (/\b(decide|choice|should i|option|tradeoff)\b/.test(text)) return "decision";
  if (/\b(exam|study|assignment|notes|lecture|revise)\b/.test(text)) return "study_help";
  if (text.endsWith("?") || /\b(what|why|how|when|which)\b/.test(text)) return "question";
  return "diagnosis";
}

export function detectCoachState(input: string): CoachDetectedState {
  const text = lower(input);
  if (/\b(urgent|due today|deadline|tonight|exam tomorrow|now)\b/.test(text)) return "urgent";
  if (/\b(reorganis|reorganiz|setup|researching more|more planning|perfect plan|template)\b/.test(text)) return "overplanning";
  if (/\b(avoid|procrastinat|can't start|cant start|scrolling|delaying)\b/.test(text)) return "avoidant";
  if (/\b(too much|overwhelmed|drowning|behind|chaos)\b/.test(text)) return "overloaded";
  if (/\b(tired|exhausted|burnt|no energy|flat)\b/.test(text)) return "low_energy";
  if (/\b(confused|don't understand|dont understand|lost|unclear)\b/.test(text)) return "confused";
  if (/\b(again|same problem|still stuck|keep doing this)\b/.test(text)) return "stuck_loop";
  return "clear";
}

export function detectCoachUrgency(input: string): CoachUrgency {
  const text = lower(input);
  if (/\b(kill myself|suicide|self harm|self-harm|hurt myself|end it)\b/.test(text)) return "crisis_boundary";
  if (/\b(due today|tonight|urgent|deadline|exam tomorrow|panic)\b/.test(text)) return "high";
  if (text.length < 30) return "low";
  return "normal";
}

function selectResponseMode(domain: CoachDetectedDomain, intent: CoachDetectedIntent, state: CoachDetectedState, urgency: CoachUrgency, preferred?: CoachResponseMode | "auto"): CoachResponseMode {
  if (urgency === "crisis_boundary") return "crisis_boundary_safe";
  if (preferred && preferred !== "auto") return preferred;
  if (state === "avoidant" || state === "overplanning" || intent === "execution") return "execution_lock";
  if (intent === "proof_review") return "proof_review";
  if (intent === "prompt_building") return "prompt_builder";
  if (intent === "planning") return "planning";
  if (intent === "emotional_regulation") return "emotional_regulation";
  if (domain === "law") return "law_reasoning";
  if (domain === "psychology") return "psychology_reasoning";
  if (domain === "sales") return "sales_coach";
  if (domain === "sport") return "sport_coach";
  if (domain === "product") return "product_builder";
  if (domain === "life") return "life_strategy";
  if (domain === "study" || intent === "study_help" || intent === "practice_request") return "study_coach";
  if (intent === "question") return "direct_answer";
  return "diagnostic_coaching";
}

function domainAnswer(domain: CoachDetectedDomain, mode: CoachResponseMode): string {
  if (mode === "execution_lock") return "This is not a knowledge problem. It is an execution problem: the missing piece is the next visible artifact.";
  if (mode === "planning") return "The plan only matters if it creates a proof checkpoint. Keep the structure small enough that the first artifact can be finished today.";
  if (mode === "proof_review") return "Judge the artifact by evidence strength, not by effort. The useful question is what the proof shows and what weakness it exposes.";
  if (domain === "law") return "Use IRAC: isolate the issue, state the rule without inventing authority, apply it to the facts, then land the conclusion.";
  if (domain === "psychology") return "Use concept -> application -> evidence -> evaluation. A definition alone is not a high-quality answer.";
  if (domain === "sales") return "Start with the customer's need, frame value in their language, handle the objection, then make a clear close or attachment move.";
  if (domain === "sport") return "Translate the issue into a decision cue, a movement correction, one drill, and one match-transfer target.";
  if (domain === "product") return "Reduce the build problem to the smallest user-visible change, then prove it with a working route, test, screenshot, or shipped diff.";
  if (domain === "finance") return "Make the decision measurable: number, downside, upside, opportunity cost, and the rule you will follow next.";
  if (domain === "language") return "Active production beats recognition. Recall it, use it in a sentence, then repair the mistake immediately.";
  return "We solve the primary bottleneck first, then create proof that the situation actually changed.";
}

function proofActionFor(domain: CoachDetectedDomain, mode: CoachResponseMode): { action: string; type: CoachEngineResult["proofActionType"] } {
  if (mode === "execution_lock") return { action: "Produce one visible artifact in 25 minutes: a paragraph, solved question, shipped change, recorded rep, or submitted practice result.", type: "artifact" };
  if (domain === "law") return { action: "Write one IRAC paragraph with issue, rule, application, conclusion, and one counterargument note.", type: "written_answer" };
  if (domain === "psychology") return { action: "Write one CAEE answer: concept, application, evidence, evaluation, plus one limitation.", type: "written_answer" };
  if (domain === "sales") return { action: "Record one customer scenario: need, value frame, objection, response, and next close attempt.", type: "conversation_attempt" };
  if (domain === "sport") return { action: "Complete one drill or match-review entry with decision cue, mistake, correction, and next rep target.", type: "practice_result" };
  if (domain === "product") return { action: "Ship or verify one user-visible change and note the exact file, route, or behaviour that changed.", type: "implementation" };
  if (domain === "finance") return { action: "Create one decision log with the number, risk, opportunity cost, and next money rule.", type: "decision_log" };
  if (domain === "language") return { action: "Complete one recall sprint and write five original sentences using the weak vocabulary.", type: "practice_result" };
  return { action: "Submit one concrete artifact that proves the action happened and names the next upgrade.", type: "artifact" };
}

function planFor(domain: CoachDetectedDomain, state: CoachDetectedState, mode: CoachResponseMode): string[] {
  if (mode === "crisis_boundary_safe") {
    return [
      "Stop trying to solve this inside a productivity loop.",
      "Contact local emergency support or a trusted person now.",
      "Return to Eblocki only for practical proof work once immediate safety is handled.",
    ];
  }
  const first = state === "overplanning"
    ? "Cut the plan to one artifact and one timer."
    : state === "avoidant"
      ? "Start with the smallest physical action, not the full task."
      : "Name the primary bottleneck in one sentence.";
  const second = domain === "law"
    ? "Write the issue and rule before touching polish."
    : domain === "psychology"
      ? "Map the concept to one real scenario before adding evidence."
      : domain === "sales"
        ? "Identify the customer need before choosing the product move."
        : domain === "sport"
          ? "Turn the mistake into one repeatable drill cue."
          : domain === "product"
            ? "Choose the smallest working slice and verify it."
            : "Run one focused practice or output block.";
  return [first, second, "Submit or save the proof artifact before asking for the next layer."];
}

function shouldSuggestGameForge(domain: CoachDetectedDomain, intent: CoachDetectedIntent, state: CoachDetectedState, input: string): boolean {
  if (!GAMEFORGE_DOMAIN_MAP[domain]) return false;
  const text = lower(input);
  return (
    intent === "study_help" ||
    intent === "practice_request" ||
    state === "confused" ||
    /\b(exam|notes|concept|mistake|weak|practice|quiz|memorise|memorize|objection|tactic|vocab|application)\b/.test(text)
  );
}

function gameForgeStyleFor(domain: CoachDetectedDomain): GameForgeGameStyle {
  if (domain === "law") return "court_trial";
  if (domain === "sales") return "scenario";
  if (domain === "sport") return "transfer_challenge";
  if (domain === "language") return "speed_round";
  if (domain === "psychology") return "scenario";
  if (domain === "finance") return "transfer_challenge";
  return "mixed";
}

function buildAiPayload(params: {
  input: string;
  domain: CoachDetectedDomain;
  intent: CoachDetectedIntent;
  state: CoachDetectedState;
  urgency: CoachUrgency;
  mode: CoachResponseMode;
  proofActionType: CoachEngineResult["proofActionType"];
}): CoachAiPayload {
  return {
    system: "You are Eblocki Proof Coach. Diagnose the input, answer directly, require proof, avoid generic motivation, do not fabricate sources, and suggest GameForge only when practice is the correct intervention.",
    user: clip(params.input, 3000),
    responseMode: params.mode,
    safeContext: {
      detectedDomain: params.domain,
      detectedIntent: params.intent,
      detectedState: params.state,
      urgency: params.urgency,
      proofActionType: params.proofActionType,
    },
    forbidden: [
      "generic motivation",
      "fake certainty",
      "fabricated legal authority",
      "fabricated psychology citations",
      "identity praise without proof",
      "planning without an artifact",
      "raw private notes in analytics",
      "claiming AI is active when deterministic fallback produced the answer",
    ],
  };
}

export function buildCoachResponse(input: CoachInput): CoachEngineResult {
  const raw = input.input ?? "";
  const text = clean(raw);
  const empty = text.length === 0;
  const detectedDomain = empty ? "general" : detectCoachDomain(text);
  const detectedIntent = empty ? "diagnosis" : detectCoachIntent(text);
  const detectedState = empty ? "clear" : detectCoachState(text);
  const urgency = empty ? "low" : detectCoachUrgency(text);
  const responseMode = selectResponseMode(detectedDomain, detectedIntent, detectedState, urgency, input.preferredMode);
  const proof = proofActionFor(detectedDomain, responseMode);
  const warning = detectedState === "overplanning"
    ? "You are asking for more planning when the missing piece is proof."
    : detectedState === "avoidant"
      ? "Avoidance signal detected: reduce scope, keep the standard."
      : urgency === "crisis_boundary"
        ? "This sits outside coaching. Immediate human support matters more than productivity."
        : undefined;
  const diagnosis = empty
    ? "No input yet. Eblocki needs a real bottleneck, note, question, or situation before it can prescribe proof."
    : detectedState === "overplanning"
      ? "The primary bottleneck is over-structuring. You are using planning to delay the artifact."
      : detectedState === "avoidant"
        ? "The primary bottleneck is execution resistance. The answer must become a small proof action."
        : detectedState === "confused"
          ? "The primary bottleneck is concept clarity. Practice should expose the exact weak point."
          : `The primary bottleneck is ${detectedIntent.replace(/_/g, " ")} inside ${detectedDomain}.`;
  const answer = empty
    ? "Paste the real material or problem. The coach will diagnose domain, intent, state, and the next proof action."
    : domainAnswer(detectedDomain, responseMode);
  const plan = empty ? ["Paste the problem.", "Choose the closest mode chip if useful.", "Run the diagnosis and create proof."] : planFor(detectedDomain, detectedState, responseMode);
  const nextCheckpoint = urgency === "high"
    ? "Checkpoint in 25 minutes: either the proof artifact exists, or the scope must be cut again."
    : "Checkpoint after one artifact: submit proof or review the mistake pattern.";
  const internalPromptSummary = `Classified as ${responseMode} for ${detectedDomain}; state ${detectedState}; intent ${detectedIntent}; proof required as ${proof.type}.`;
  const suggestedGameForgePack = !empty && shouldSuggestGameForge(detectedDomain, detectedIntent, detectedState, text)
    ? {
        title: `${detectedDomain} practice pack`,
        reason: "Practice is useful here because the weakness is skill recall, application, or repeated mistake exposure.",
        mode: GAMEFORGE_DOMAIN_MAP[detectedDomain] ?? "general",
        style: gameForgeStyleFor(detectedDomain),
        sourceMaterial: clip(text, 1200),
      }
    : undefined;
  const followUpQuestion = text.length < 45 && !empty
    ? "What would count as proof that this is handled today?"
    : undefined;
  const aiPayload = buildAiPayload({
    input: text,
    domain: detectedDomain,
    intent: detectedIntent,
    state: detectedState,
    urgency,
    mode: responseMode,
    proofActionType: proof.type,
  });

  return {
    detectedDomain,
    detectedIntent,
    detectedState,
    urgency,
    responseMode,
    internalPromptSummary,
    diagnosis,
    answer,
    plan,
    proofAction: proof.action,
    proofActionType: proof.type,
    nextCheckpoint,
    followUpQuestion,
    warning,
    suggestedGameForgePack,
    aiPayload,
  };
}

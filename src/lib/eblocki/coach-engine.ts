import type { GameForgeGameStyle, GameForgeMode } from "@/lib/gameforge/gameforge-engine";
import {
  routeCoachInput,
  type CoachDomain,
  type CoachIntent,
  type CoachMode,
  type CoachRouteResult,
  type CoachState,
  type CoachUrgency,
} from "./coach-router";

export type CoachDetectedDomain = CoachDomain;
export type CoachDetectedIntent = CoachIntent;
export type CoachDetectedState = CoachState;
export type { CoachUrgency };
export type CoachResponseMode = CoachMode;

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
  confidence: number;
  routeEvidence: string[];
  proofStandardKey: string;
  recommendedProofArtifact: CoachRouteResult["recommendedProofArtifact"];
  internalPromptSummary: string;
  diagnosis: string;
  answer: string;
  plan: string[];
  proofAction: string;
  proofActionType:
    | "artifact"
    | "practice_result"
    | "written_answer"
    | "decision_log"
    | "conversation_attempt"
    | "implementation"
    | "source_bank"
    | "product_review";
  nextCheckpoint: string;
  followUpQuestion?: string;
  warning?: string;
  suggestedGameForgePack?: CoachGameForgeSuggestion;
  aiPayload: CoachAiPayload;
}

const GAMEFORGE_DOMAIN_MAP: Partial<Record<CoachDetectedDomain, GameForgeMode>> = {
  law: "law",
  law_academic: "law",
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

function clip(value: string, max: number): string {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

const MODE_DOMAIN_FORCE: Partial<Record<CoachResponseMode, CoachDomain>> = {
  law_reasoning: "law",
  law_source_bank: "law_academic",
  academic_operating_system: "law_academic",
  psychology_reasoning: "psychology",
  sales_coach: "sales",
  sport_coach: "sport",
  study_coach: "study",
  product_builder: "product",
  life_strategy: "life",
};

function applyPreferredMode(route: CoachRouteResult, preferred?: CoachResponseMode | "auto"): CoachRouteResult {
  if (!preferred || preferred === "auto") return route;

  const protectedIntents: CoachIntent[] = [
    "academic_proof_plan",
    "law_source_bank",
    "product_system_review",
    "proof_review",
    "execution_lock",
  ];

  if (protectedIntents.includes(route.intent)) return route;
  const forcedDomain = MODE_DOMAIN_FORCE[preferred];
  return {
    ...route,
    mode: preferred,
    domain: forcedDomain ?? route.domain,
  };
}

export function detectCoachDomain(input: string): CoachDetectedDomain {
  return routeCoachInput(input).domain;
}

export function detectCoachIntent(input: string): CoachDetectedIntent {
  return routeCoachInput(input).intent;
}

export function detectCoachState(input: string): CoachDetectedState {
  return routeCoachInput(input).state;
}

export function detectCoachUrgency(input: string): CoachUrgency {
  return routeCoachInput(input).urgency;
}

function proofActionTypeFor(route: CoachRouteResult): CoachEngineResult["proofActionType"] {
  switch (route.recommendedProofArtifact.artifactType) {
    case "source_bank_entries":
      return "source_bank";
    case "irac_paragraph":
      return "written_answer";
    case "product_system_review":
      return "product_review";
    case "implementation_proof":
      return "implementation";
    default:
      return "artifact";
  }
}

function answerFor(route: CoachRouteResult): string {
  switch (route.intent) {
    case "academic_proof_plan":
      return "This is a law academic operating-system request, not a legal-answer request. Start with authorities: two source-bank entries create the evidence base before any IRAC paragraph is required.";
    case "law_source_bank":
      return "Source-bank work comes before analysis. Verify the authority, extract the usable rule, name the assessment use, then move to an issue matrix.";
    case "legal_reasoning":
      return "Use IRAC: isolate the issue, state the rule with authority, apply it to the facts, then land the conclusion. Do not invent authority.";
    case "product_system_review":
      return "Judge the product behavior, not the intention. The artifact must show the actual output, corrected logic, implementation path, and measurable acceptance test.";
    case "proof_review":
      return "The Court should judge the submitted artifact against the right standard. Effort does not count unless the artifact shows evidence.";
    case "execution_lock":
      return "This is not a theory problem. The next move is one visible artifact with one evidence standard.";
    default:
      return "Solve the primary bottleneck first, then create proof that the situation actually changed.";
  }
}

function diagnosisFor(route: CoachRouteResult): string {
  if (route.intent === "academic_proof_plan") {
    return "The prompt is asking for a law mastery system. The correct first proof is source-bank preparation, not an immediate IRAC paragraph.";
  }
  if (route.intent === "product_system_review") {
    return "The prompt is reviewing Eblocki's behavior. It must be judged by product-system evidence, not law-answer criteria.";
  }
  if (route.intent === "law_source_bank") return "The prompt is authority preparation. The proof artifact is a source-bank entry.";
  if (route.intent === "legal_reasoning") return "The prompt is legal reasoning. The proof artifact is one law answer or IRAC paragraph.";
  if (route.intent === "execution_lock") return "The prompt shows planning or avoidance drift. Scope must collapse to one artifact.";
  return `Classified as ${route.intent.replace(/_/g, " ")} inside ${route.domain}.`;
}

function planFor(route: CoachRouteResult): string[] {
  if (route.intent === "academic_proof_plan") {
    return [
      "Create two verified source-bank entries, one for BLAW1003 and one for LAWS1004.",
      "After at least one authority exists, convert it into an issue matrix.",
      "Only then write an IRAC paragraph or problem-answer section.",
    ];
  }
  if (route.intent === "law_source_bank") {
    return [
      "Open the current official source.",
      "Complete the source-bank fields without inventing legal content.",
      "Use the entry to seed an issue matrix before writing analysis.",
    ];
  }
  if (route.intent === "product_system_review") {
    return [
      "Quote or describe the actual product output that failed.",
      "State the corrected logic and the smallest implementation path.",
      "Define the measurable test that proves the fix worked.",
    ];
  }
  if (route.intent === "execution_lock") {
    return ["Set one timer.", "Produce one visible artifact.", "Submit it before asking for another layer."];
  }
  return ["Name the bottleneck.", "Produce the recommended artifact.", "Submit it against the selected standard."];
}

function checkpointFor(route: CoachRouteResult): string {
  if (route.intent === "academic_proof_plan" || route.intent === "law_source_bank") {
    return "After two source-bank entries exist, generate one issue matrix. No IRAC requirement before at least one authority exists.";
  }
  if (route.intent === "product_system_review") {
    return "After the review artifact exists, implementation or test evidence is required before identity escalation.";
  }
  if (route.urgency === "high") return "Checkpoint in 25 minutes: artifact exists, or scope gets cut again.";
  return "Checkpoint after one artifact: submit proof or review the mistake pattern.";
}

function warningFor(route: CoachRouteResult): string | undefined {
  if (route.intent === "academic_proof_plan") return "Do not turn this into competing artifacts. Source bank first; IRAC later.";
  if (route.intent === "execution_lock") return "Planning is replacing proof. One artifact only.";
  if (route.intent === "product_system_review") return "Do not use law-answer criteria for product-system proof.";
  if (route.urgency === "crisis_boundary") return "This sits outside coaching. Immediate human support matters more than productivity.";
  return undefined;
}

function shouldSuggestGameForge(route: CoachRouteResult, input: string): boolean {
  const text = input.toLowerCase();
  if (!GAMEFORGE_DOMAIN_MAP[route.domain]) return false;
  if (route.intent === "academic_proof_plan" || route.intent === "law_source_bank" || route.intent === "product_system_review") return false;
  return route.intent === "practice_request" || /\b(exam|concept|mistake|weak|practice|quiz|memorise|memorize|objection|tactic|vocab|application)\b/.test(text);
}

function gameForgeStyleFor(domain: CoachDetectedDomain): GameForgeGameStyle {
  if (domain === "law" || domain === "law_academic") return "court_trial";
  if (domain === "sales") return "scenario";
  if (domain === "sport") return "transfer_challenge";
  if (domain === "language") return "speed_round";
  if (domain === "psychology") return "scenario";
  if (domain === "finance") return "transfer_challenge";
  return "mixed";
}

function buildAiPayload(params: { input: string; route: CoachRouteResult; proofActionType: CoachEngineResult["proofActionType"] }): CoachAiPayload {
  return {
    system: "You are Eblocki Proof Coach. Use the supplied deterministic route. One classification, one artifact, one proof standard, one next action. Do not fabricate sources or claim AI certainty.",
    user: clip(params.input, 3000),
    responseMode: params.route.mode,
    safeContext: {
      detectedDomain: params.route.domain,
      detectedIntent: params.route.intent,
      detectedState: params.route.state,
      urgency: params.route.urgency,
      proofActionType: params.proofActionType,
      proofStandardKey: params.route.recommendedProofArtifact.proofStandardKey,
      confidence: params.route.confidence,
    },
    forbidden: [
      "generic motivation",
      "fake certainty",
      "fabricated legal authority",
      "fabricated psychology citations",
      "identity praise without proof",
      "planning without an artifact",
      "competing proof artifacts unless explicitly requested",
      "raw private notes in analytics",
      "claiming AI is active when deterministic fallback produced the answer",
    ],
  };
}

export function buildCoachResponse(input: CoachInput): CoachEngineResult {
  const text = clean(input.input ?? "");
  const empty = text.length === 0;
  const baseRoute = empty ? routeCoachInput("") : routeCoachInput(text);
  const route = applyPreferredMode(baseRoute, input.preferredMode);
  const proofActionType = proofActionTypeFor(route);
  const answer = empty
    ? "Paste the real material or problem. The coach will diagnose domain, intent, state, and the next proof action."
    : answerFor(route);
  const plan = empty
    ? ["Paste the problem.", "Choose the closest mode chip if useful.", "Run the diagnosis and create proof."]
    : planFor(route);
  const diagnosis = empty
    ? "No input yet. Eblocki needs a real bottleneck, note, question, or situation before it can prescribe proof."
    : diagnosisFor(route);
  const suggestedGameForgePack = !empty && shouldSuggestGameForge(route, text)
    ? {
        title: `${route.domain} practice pack`,
        reason: "Practice is useful here because the weakness is skill recall, application, or repeated mistake exposure.",
        mode: GAMEFORGE_DOMAIN_MAP[route.domain] ?? "general",
        style: gameForgeStyleFor(route.domain),
        sourceMaterial: clip(text, 1200),
      }
    : undefined;
  const internalPromptSummary = `Classified as ${route.intent} for ${route.domain}; state ${route.state}; mode ${route.mode}; artifact ${route.recommendedProofArtifact.artifactType}; standard ${route.recommendedProofArtifact.proofStandardKey}.`;
  const aiPayload = buildAiPayload({ input: text, route, proofActionType });

  return {
    detectedDomain: route.domain,
    detectedIntent: route.intent,
    detectedState: route.state,
    urgency: route.urgency,
    responseMode: route.mode,
    confidence: route.confidence,
    routeEvidence: route.evidence,
    proofStandardKey: route.recommendedProofArtifact.proofStandardKey,
    recommendedProofArtifact: route.recommendedProofArtifact,
    internalPromptSummary,
    diagnosis,
    answer,
    plan,
    proofAction: route.recommendedProofArtifact.action,
    proofActionType,
    nextCheckpoint: checkpointFor(route),
    followUpQuestion: text.length < 45 && !empty ? "What would count as proof that this is handled today?" : undefined,
    warning: warningFor(route),
    suggestedGameForgePack,
    aiPayload,
  };
}

import { routeCoachInput } from "./coach-router";

export type EblockiMode =
  | "LAW_MAX"
  | "PSYCH_HD"
  | "SALES_CLOSE"
  | "EBLOCKI"
  | "SPORT"
  | "BRAND"
  | "CAREER_MONEY"
  | "GENERAL_EXECUTION";

export type EblockiState =
  | "locked_in"
  | "avoidant"
  | "overloaded"
  | "low_energy"
  | "hype_drift"
  | "recovery"
  | "momentum"
  | "scattered"
  | "academic_displacement"
  | "strategic_build"
  | null;

export interface ProofContract {
  shouldCreate: boolean;
  domain: string;
  mode: string;
  title: string;
  requiredArtifact: string;
  evidenceStandard: string;
  dueDate: string | null;
  seriousnessScore: number;
  reason: string;
}

export interface NormalisedCoachResponse {
  success: boolean;
  mode: string;
  hybrid: string | null;
  state: EblockiState;
  response: string;
  proofContract: ProofContract;
  proofQuestion: string;
  interactionId: string | null;
  commitmentId: string | null;
  usedFallback: boolean;
}

const DEFAULT_PROOF_CONTRACT: ProofContract = {
  shouldCreate: false,
  domain: "general",
  mode: "GENERAL_EXECUTION",
  title: "No Proof Contract",
  requiredArtifact: "",
  evidenceStandard: "",
  dueDate: null,
  seriousnessScore: 0,
  reason: "No serious action was detected.",
};

export function normaliseCoachResponse(raw: unknown): NormalisedCoachResponse {
  const data = typeof raw === "object" && raw !== null ? (raw as any) : {};
  const proofContract = typeof data.proofContract === "object" && data.proofContract !== null ? data.proofContract : {};

  return {
    success: typeof data.success === "boolean" ? data.success : true,
    mode: String(data.mode || "GENERAL_EXECUTION"),
    hybrid: data.hybrid ? String(data.hybrid) : null,
    state: data.state ?? null,
    response: String(data.response || data.assistantOutput || data.output || "Coach response generated, but no response text was returned."),
    proofContract: {
      shouldCreate: typeof proofContract.shouldCreate === "boolean" ? proofContract.shouldCreate : false,
      domain: String(proofContract.domain || DEFAULT_PROOF_CONTRACT.domain),
      mode: String(proofContract.mode || data.mode || DEFAULT_PROOF_CONTRACT.mode),
      title: String(proofContract.title || DEFAULT_PROOF_CONTRACT.title),
      requiredArtifact: String(proofContract.requiredArtifact || proofContract.required_artifact || DEFAULT_PROOF_CONTRACT.requiredArtifact),
      evidenceStandard: String(proofContract.evidenceStandard || proofContract.evidence_standard || DEFAULT_PROOF_CONTRACT.evidenceStandard),
      dueDate: proofContract.dueDate || proofContract.due_date || null,
      seriousnessScore: Number(proofContract.seriousnessScore || proofContract.seriousness_score || DEFAULT_PROOF_CONTRACT.seriousnessScore),
      reason: String(proofContract.reason || DEFAULT_PROOF_CONTRACT.reason),
    },
    proofQuestion: String(data.proofQuestion || "What proof artifact will confirm completion?"),
    interactionId: data.interactionId || data.interaction_id || null,
    commitmentId: data.commitmentId || data.commitment_id || null,
    usedFallback: !!(data.debug && data.debug.usedFallback),
  };
}

export function isSeriousActionPrompt(message: string): boolean {
  return /\b(write|draft|study|prepare|build|practise|practice|revise|reflect|train|sell|complete|submit|create|produce|fix|review)\b/i.test(message);
}

function routeModeToEblockiMode(routeMode: string): EblockiMode {
  if (routeMode.includes("law") || routeMode.includes("academic")) return "LAW_MAX";
  if (routeMode.includes("product")) return "EBLOCKI";
  if (routeMode.includes("psychology")) return "PSYCH_HD";
  if (routeMode.includes("sales")) return "SALES_CLOSE";
  if (routeMode.includes("sport")) return "SPORT";
  return "GENERAL_EXECUTION";
}

function routeStateToEblockiState(state: string): EblockiState {
  if (state === "strategic_build") return "strategic_build";
  if (state === "avoidant") return "avoidant";
  if (state === "overloaded") return "overloaded";
  if (state === "low_energy") return "low_energy";
  if (state === "overplanning") return "academic_displacement";
  return "momentum";
}

export function getFallbackCoachResponse(message: string): NormalisedCoachResponse {
  const route = routeCoachInput(message);
  const serious = isSeriousActionPrompt(message) || ["academic_proof_plan", "law_source_bank", "product_system_review"].includes(route.intent);
  const mode = routeModeToEblockiMode(route.mode);
  const artifact = route.recommendedProofArtifact;

  return {
    success: true,
    mode,
    hybrid: null,
    state: routeStateToEblockiState(route.state),
    response: [
      `Classified as ${route.intent.replace(/_/g, " ")} in ${route.domain}.`,
      `One artifact only: ${artifact.requiredArtifact}`,
      `Standard: ${artifact.evidenceStandard}`,
      `Next checkpoint: ${route.intent === "academic_proof_plan" ? "after two source-bank entries exist, generate one issue matrix" : "submit the artifact before adding another layer"}.`,
    ].join("\n\n"),
    proofContract: {
      shouldCreate: serious,
      domain: route.domain,
      mode,
      title: artifact.title,
      requiredArtifact: artifact.requiredArtifact,
      evidenceStandard: artifact.evidenceStandard,
      dueDate: null,
      seriousnessScore: serious ? 8 : 0,
      reason: serious ? "Typed coach route requires one artifact with one standard." : "No serious action request was detected.",
    },
    proofQuestion: "What proof artifact will confirm completion?",
    interactionId: null,
    commitmentId: null,
    usedFallback: true,
  };
}

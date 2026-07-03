import { type Mode, MODE_DOMAINS } from "./modes";
import { routeCoachInput } from "./coach-router";
import { validateProofContractAlignment } from "./proof-contract-alignment";

const SERIOUS_VERBS = [
  "write","draft","study","produce","submit","build","practise","practice",
  "reflect","revise","sell","train","complete","prepare","ship","read",
  "analyse","analyze","argue","summarise","summarize","review","record","create",
];

export interface ProofContract {
  shouldCreate: boolean;
  domain: string;
  mode: Mode;
  title: string;
  requiredArtifact: string;
  evidenceStandard: string;
  dueDate: string | null;
  seriousnessScore: number;
  reason: string;
}

function modeForRoute(routeMode: string, fallback: Mode): Mode {
  if (routeMode.includes("law")) return "LAW_MAX";
  if (routeMode.includes("product") || routeMode.includes("academic")) return fallback === "GENERAL_EXECUTION" ? "EBLOCKI" : fallback;
  return fallback;
}

export function buildProofContract(input: {
  message: string;
  assistantOutput: string;
  mode: Mode;
}): ProofContract {
  const text = `${input.message}\n${input.assistantOutput}`.toLowerCase();
  let seriousness = 0;
  for (const v of SERIOUS_VERBS) {
    if (new RegExp(`\\b${v}\\b`).test(text)) seriousness += 1;
  }
  if (/\b(today|tonight|tomorrow|by \d|deadline)\b/.test(text)) seriousness += 2;
  if (/\b(exam|due|assessment|shift|match|mastery|source bank)\b/.test(text)) seriousness += 2;

  seriousness = Math.max(1, Math.min(10, seriousness));
  const route = routeCoachInput(input.message);
  const alignment = validateProofContractAlignment({
    proofAction: route.recommendedProofArtifact.action,
    recommendedProofArtifact: route.recommendedProofArtifact,
    proofContract: {
      domain: route.domain,
      title: route.recommendedProofArtifact.title,
      requiredArtifact: route.recommendedProofArtifact.requiredArtifact,
      evidenceStandard: route.recommendedProofArtifact.evidenceStandard,
    },
    proofStandardKey: route.recommendedProofArtifact.proofStandardKey,
    domain: route.domain,
  });
  const aligned = alignment.alignedContract;
  const firstLine = input.message.split("\n")[0].slice(0, 80) || aligned.title || "Next action";

  return {
    shouldCreate: seriousness >= 4 || ["academic_proof_plan", "law_source_bank", "product_system_review"].includes(route.intent),
    domain: aligned.domain || MODE_DOMAINS[input.mode],
    mode: modeForRoute(route.mode, input.mode),
    title: route.recommendedProofArtifact.title || firstLine,
    requiredArtifact: aligned.requiredArtifact,
    evidenceStandard: aligned.evidenceStandard,
    dueDate: null,
    seriousnessScore: seriousness,
    reason:
      seriousness >= 4
        ? `Detected ${seriousness} action signals - proof contract enforced.`
        : "Route requires one artifact with one evidence standard.",
  };
}

export const PROOF_QUESTION = "What proof artifact will confirm completion?";

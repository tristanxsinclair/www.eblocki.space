import type { DomainStandardKey } from "./domain-standards";
import type { ProofArtifactRequirement } from "./coach-router";

export interface ProofContractLike {
  domain?: string | null;
  mode?: string | null;
  title?: string | null;
  requiredArtifact?: string | null;
  required_artifact?: string | null;
  evidenceStandard?: string | null;
  evidence_standard?: string | null;
}

export interface ProofContractAlignmentInput {
  proofAction?: string | null;
  proofContract?: ProofContractLike | null;
  recommendedProofArtifact?: ProofArtifactRequirement | null;
  proofStandardKey?: DomainStandardKey | null;
  domain?: string | null;
}

export interface ProofContractAlignmentResult {
  aligned: boolean;
  issues: string[];
  alignedContract: {
    domain: string;
    title: string;
    requiredArtifact: string;
    evidenceStandard: string;
    proofStandardKey: DomainStandardKey;
  };
}

function normalise(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function requiredArtifact(contract?: ProofContractLike | null): string {
  return contract?.requiredArtifact ?? contract?.required_artifact ?? "";
}

function evidenceStandard(contract?: ProofContractLike | null): string {
  return contract?.evidenceStandard ?? contract?.evidence_standard ?? "";
}

function artifactFamily(value?: string | null): string {
  const text = normalise(value);
  if (!text) return "missing";
  if (/source bank|authority|statute note|case note|issue matrix/.test(text)) return "source_bank_entries";
  if (/irac|legal answer|problem answer|paragraph/.test(text)) return "irac_paragraph";
  if (/product system|corrected logic|implementation path|acceptance test|router|ux/.test(text)) return "product_system_review";
  if (/implementation|file changes|build|test result|commit|shipped/.test(text)) return "implementation_proof";
  if (/study system|mastery plan|academic proof plan|weekly artifact/.test(text)) return "academic_proof_plan";
  return "visible_artifact";
}

function hasTooManyRequirements(value: string): boolean {
  const text = normalise(value);
  const markers = ["source bank", "irac", "problem answer", "implementation", "reflection", "issue matrix"].filter((marker) => text.includes(marker));
  return new Set(markers).size > 1 && /\band\b|\bthen\b|\bplus\b|,/.test(text);
}

function isVague(value: string): boolean {
  const text = normalise(value);
  return !text || text.length < 18 || /do the task|work on it|make progress|some proof|artifact required/.test(text);
}

export function validateProofContractAlignment(input: ProofContractAlignmentInput): ProofContractAlignmentResult {
  const proofAction = input.proofAction ?? input.recommendedProofArtifact?.action ?? "";
  const contractArtifact = requiredArtifact(input.proofContract);
  const contractStandard = evidenceStandard(input.proofContract);
  const recommended = input.recommendedProofArtifact;
  const actionFamily = artifactFamily(proofAction || recommended?.requiredArtifact);
  const contractFamily = artifactFamily(contractArtifact);
  const issues: string[] = [];

  if (!proofAction.trim()) issues.push("proof_action_missing");
  if (!contractStandard.trim()) issues.push("proof_standard_missing");
  if (contractFamily === "missing") issues.push("proof_contract_missing");
  if (actionFamily !== "missing" && contractFamily !== "missing" && actionFamily !== contractFamily) issues.push("mismatched_artifact_type");
  if (hasTooManyRequirements(contractArtifact)) issues.push("too_many_proof_requirements");
  if (isVague(contractArtifact)) issues.push("vague_proof_requirement");

  const recommendedStandard = recommended?.proofStandardKey ?? input.proofStandardKey ?? "general_proof_standard";
  if (input.proofStandardKey && recommended?.proofStandardKey && input.proofStandardKey !== recommended.proofStandardKey) {
    if (recommended.artifactType !== "source_bank_entries") issues.push("domain_standard_mismatch");
  }

  const fallback = {
    domain: input.domain ?? input.proofContract?.domain ?? "general",
    title: recommended?.title ?? input.proofContract?.title ?? "One visible artifact",
    requiredArtifact: recommended?.requiredArtifact ?? "One visible artifact with one evidence standard.",
    evidenceStandard: recommended?.evidenceStandard ?? "visible artifact / applied detail / feedback awareness / next upgrade",
    proofStandardKey: recommendedStandard,
  };

  if (issues.length > 0) {
    return {
      aligned: false,
      issues,
      alignedContract: fallback,
    };
  }

  return {
    aligned: true,
    issues: [],
    alignedContract: {
      domain: input.proofContract?.domain ?? fallback.domain,
      title: input.proofContract?.title ?? fallback.title,
      requiredArtifact: contractArtifact,
      evidenceStandard: contractStandard,
      proofStandardKey: recommendedStandard,
    },
  };
}

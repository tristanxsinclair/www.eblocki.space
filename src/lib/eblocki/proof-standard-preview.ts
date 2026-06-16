import { selectDomainStandard, type DomainStandardKey } from "./domain-standards";
import { validateProofContractAlignment, type ProofContractLike } from "./proof-contract-alignment";

export interface ProofStandardPreviewInput {
  domain?: string | null;
  intent?: string | null;
  artifactType?: string | null;
  proofAction?: string | null;
  proofContract?: ProofContractLike | null;
}

export interface ProofStandardPreview {
  selectedDomain: string;
  artifactType: string;
  standardKey: DomainStandardKey;
  standardLabel: string;
  requiredEvidence: string[];
  missingStandard: string;
  eliteVersion: string;
  nextUpgrade: string;
  identityEscalationAllowed: boolean;
  identityRule: string;
  alignmentStatus: "aligned" | "not_aligned" | "no_contract";
  alignmentMessage: string;
  contractCompletedLabel: string;
}

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function normalise(value?: string | null): string {
  return clean(value).toLowerCase().replace(/[_-]+/g, " ");
}

function contractArtifact(contract?: ProofContractLike | null): string {
  return contract?.requiredArtifact ?? contract?.required_artifact ?? "";
}

function inferArtifactType(input: ProofStandardPreviewInput): string {
  const explicit = clean(input.artifactType);
  const contract = clean(contractArtifact(input.proofContract));
  return explicit || contract || "visible artifact";
}

function inferDomain(input: ProofStandardPreviewInput): string {
  const domain = clean(input.domain) || clean(input.proofContract?.domain);
  return domain || "general";
}

function identityRuleForStandard(key: DomainStandardKey): { allowed: boolean; rule: string } {
  switch (key) {
    case "product_system_review_standard":
      return {
        allowed: false,
        rule: "Strong proof can be accepted, but identity escalation is blocked until implementation or external test evidence exists.",
      };
    case "eblocki_implementation_standard":
      return {
        allowed: true,
        rule: "Identity escalation can be considered when implementation evidence and verification results are present.",
      };
    case "law_source_bank_standard":
      return {
        allowed: false,
        rule: "Source-bank proof can be accepted, but identity escalation waits for an issue matrix, paragraph, or assessed output built from the authority.",
      };
    case "academic_proof_plan_standard":
      return {
        allowed: false,
        rule: "Planning proof is accepted as setup only. Identity escalation waits for the first visible academic artifact.",
      };
    case "law_irac_standard":
      return {
        allowed: true,
        rule: "Identity escalation can be considered when the answer uses authority, applies facts, and reaches a defensible conclusion.",
      };
    default:
      return {
        allowed: false,
        rule: "Identity escalation is blocked until the artifact is concrete, externally checkable, or implemented.",
      };
  }
}

function stableArtifactHint(value: string): string {
  const text = normalise(value);
  if (text.includes("source bank") || text.includes("authority")) return "source-bank entries";
  if (text.includes("irac") || text.includes("problem answer")) return "IRAC paragraph";
  if (text.includes("product") || text.includes("router") || text.includes("logic")) return "product system review";
  if (text.includes("implementation") || text.includes("test result")) return "implementation proof";
  if (text.includes("academic") || text.includes("mastery") || text.includes("study")) return "academic proof plan";
  return value || "visible artifact";
}

export function buildProofStandardPreview(input: ProofStandardPreviewInput = {}): ProofStandardPreview {
  const selectedDomain = inferDomain(input);
  const artifactType = stableArtifactHint(inferArtifactType(input));
  const selectionArtifact = [artifactType, contractArtifact(input.proofContract), input.proofAction]
    .map((value) => clean(value))
    .filter(Boolean)
    .join(" ");
  const standard = selectDomainStandard({
    domain: selectedDomain,
    intent: input.intent,
    artifactType: selectionArtifact || artifactType,
  });
  const identity = identityRuleForStandard(standard.key);

  if (!input.proofContract) {
    return {
      selectedDomain,
      artifactType,
      standardKey: standard.key,
      standardLabel: standard.label,
      requiredEvidence: standard.requiredEvidence,
      missingStandard: standard.missingStandard,
      eliteVersion: standard.eliteVersion,
      nextUpgrade: standard.nextUpgrade,
      identityEscalationAllowed: identity.allowed,
      identityRule: identity.rule,
      alignmentStatus: "no_contract",
      alignmentMessage: "No linked Proof Contract. Court will judge one visible artifact against the selected standard.",
      contractCompletedLabel: "No linked contract",
    };
  }

  const alignment = validateProofContractAlignment({
    proofAction: input.proofAction ?? contractArtifact(input.proofContract),
    proofContract: input.proofContract,
    proofStandardKey: standard.key,
    domain: selectedDomain,
  });

  return {
    selectedDomain,
    artifactType,
    standardKey: standard.key,
    standardLabel: standard.label,
    requiredEvidence: standard.requiredEvidence,
    missingStandard: standard.missingStandard,
    eliteVersion: standard.eliteVersion,
    nextUpgrade: standard.nextUpgrade,
    identityEscalationAllowed: identity.allowed,
    identityRule: identity.rule,
    alignmentStatus: alignment.aligned ? "aligned" : "not_aligned",
    alignmentMessage: alignment.aligned
      ? "Proof Action and Proof Contract require the same artifact type."
      : `Contract alignment failed: ${alignment.issues.join(", ")}. Use one visible artifact with one evidence standard.`,
    contractCompletedLabel: alignment.aligned ? "Aligned contract" : "Fallback contract required",
  };
}

export type DomainStandardKey =
  | "law_irac_standard"
  | "law_source_bank_standard"
  | "academic_proof_plan_standard"
  | "product_system_review_standard"
  | "eblocki_implementation_standard"
  | "general_proof_standard";

export type ProofLevel = "baseline" | "strong" | "elite";

export interface DomainStandard {
  key: DomainStandardKey;
  label: string;
  criteria: string[];
  requiredEvidence: string[];
  missingStandard: string;
  eliteVersion: string;
  nextUpgrade: string;
}

export interface DomainStandardSelectionInput {
  domain?: string | null;
  intent?: string | null;
  artifactType?: string | null;
  proofLevel?: ProofLevel | null;
}

export const DOMAIN_STANDARD_REGISTRY: Record<DomainStandardKey, DomainStandard> = {
  law_irac_standard: {
    key: "law_irac_standard",
    label: "Law IRAC Standard",
    criteria: [
      "issue identified",
      "rule stated accurately",
      "authority used",
      "application to facts",
      "conclusion",
      "counterargument or limitation where relevant",
      "citation precision",
    ],
    requiredEvidence: [
      "issue identified",
      "rule stated accurately",
      "authority used",
      "application to facts",
      "conclusion",
      "counterargument or limitation where relevant",
      "citation precision",
    ],
    missingStandard: "Missing law-answer standard: issue, rule, authority, application, conclusion, and citation precision.",
    eliteVersion: "A precise IRAC answer with authority, fact application, limitation, and a defensible conclusion.",
    nextUpgrade: "Add authority and fact-specific application before polishing style.",
  },
  law_source_bank_standard: {
    key: "law_source_bank_standard",
    label: "Law Source Bank Standard",
    criteria: [
      "source name",
      "jurisdiction",
      "authority level",
      "current version / access checked",
      "key provision/material",
      "key rule",
      "unit relevance",
      "possible assessment use",
      "limitation/counterargument",
      "confidence rating",
    ],
    requiredEvidence: [
      "source name",
      "jurisdiction",
      "authority level",
      "current version checked",
      "key provision/material",
      "key rule",
      "unit relevance",
      "assessment use",
      "limitation/counterargument",
      "confidence rating",
    ],
    missingStandard: "Missing source-bank standard: source, jurisdiction, authority level, current version check, key rule, unit relevance, assessment use, limitation, and confidence rating.",
    eliteVersion: "A verified source-bank entry that can be used directly in an issue matrix or problem answer.",
    nextUpgrade: "Convert verified source-bank entries into one issue matrix before writing IRAC.",
  },
  academic_proof_plan_standard: {
    key: "academic_proof_plan_standard",
    label: "Academic Proof Plan Standard",
    criteria: [
      "unit objective clear",
      "weekly artifact system",
      "authoritative source strategy",
      "proof cadence",
      "feedback loop",
      "assessment relevance",
      "first executable artifact",
    ],
    requiredEvidence: [
      "unit objective clear",
      "weekly artifact system",
      "authoritative source strategy",
      "proof cadence",
      "feedback loop",
      "assessment relevance",
      "first executable artifact",
    ],
    missingStandard: "Missing academic proof-plan standard: unit objective, weekly artifact system, source strategy, proof cadence, feedback loop, assessment relevance, and first executable artifact.",
    eliteVersion: "A study operating system that produces visible assessment-ready artifacts every week.",
    nextUpgrade: "Start the first executable artifact instead of expanding the plan.",
  },
  product_system_review_standard: {
    key: "product_system_review_standard",
    label: "Product System Review Standard",
    criteria: [
      "specific product issue identified",
      "evidence from actual output/screen",
      "corrected logic proposed",
      "implementation path stated",
      "measurable test or acceptance criterion",
      "next upgrade defined",
    ],
    requiredEvidence: [
      "specific product issue identified",
      "evidence from actual output/screen",
      "corrected logic proposed",
      "implementation path stated",
      "measurable test or acceptance criterion",
      "next upgrade defined",
    ],
    missingStandard: "Missing product-system standard: actual output evidence, corrected logic, implementation path, measurable test, and next upgrade.",
    eliteVersion: "A product review that names the flawed behavior, shows the evidence, proposes corrected logic, and defines an implementation test.",
    nextUpgrade: "Implement or test the corrected logic before claiming identity-level progress.",
  },
  eblocki_implementation_standard: {
    key: "eblocki_implementation_standard",
    label: "Eblocki Implementation Standard",
    criteria: [
      "file changes made",
      "logic implemented",
      "UI updated where relevant",
      "tests added",
      "build/test result shown",
      "no new lint debt in touched files",
      "user-facing behaviour improved",
    ],
    requiredEvidence: [
      "file changes made",
      "logic implemented",
      "UI updated where relevant",
      "tests added",
      "build/test result shown",
      "no new lint debt in touched files",
      "user-facing behaviour improved",
    ],
    missingStandard: "Missing implementation standard: file changes, implemented logic, relevant UI, tests, verification result, lint status, and user-facing behaviour improvement.",
    eliteVersion: "A shipped change with exact files, tests, build result, and clear user-facing improvement.",
    nextUpgrade: "Run verification and document the before/after behavior.",
  },
  general_proof_standard: {
    key: "general_proof_standard",
    label: "General Proof Standard",
    criteria: ["visible artifact", "applied detail", "feedback awareness", "next upgrade"],
    requiredEvidence: ["visible artifact", "applied detail", "feedback awareness", "next upgrade"],
    missingStandard: "Missing general proof standard: visible artifact, applied detail, feedback awareness, and next upgrade.",
    eliteVersion: "A visible artifact with applied detail, correction, and a stronger next standard.",
    nextUpgrade: "Make the artifact more concrete and attach a measurable correction.",
  },
};

function normalise(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function hasAny(text: string, markers: string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

export function selectDomainStandard(input: DomainStandardSelectionInput = {}): DomainStandard {
  const domain = normalise(input.domain);
  const intent = normalise(input.intent);
  const artifactType = normalise(input.artifactType);
  const combined = `${domain} ${intent} ${artifactType}`;

  if (hasAny(combined, ["implementation", "code change", "shipped change", "commit reference"])) {
    return DOMAIN_STANDARD_REGISTRY.eblocki_implementation_standard;
  }

  if (hasAny(combined, ["source bank", "authority log", "authority logging", "statute note", "case note", "issue matrix"])) {
    return DOMAIN_STANDARD_REGISTRY.law_source_bank_standard;
  }

  if (hasAny(combined, ["academic proof plan", "study system", "mastery plan", "unit plan", "weekly law proof", "academic workflow", "law academic"])) {
    return DOMAIN_STANDARD_REGISTRY.academic_proof_plan_standard;
  }

  if (hasAny(combined, ["product system", "router", "routing", "ux", "bug", "logic critique", "product review"])) {
    return DOMAIN_STANDARD_REGISTRY.product_system_review_standard;
  }

  if (hasAny(combined, ["irac", "legal reasoning", "legal answer", "problem answer", "law answer"])) {
    return DOMAIN_STANDARD_REGISTRY.law_irac_standard;
  }

  if (domain === "law") return DOMAIN_STANDARD_REGISTRY.law_irac_standard;
  if (domain === "product" || domain === "eblocki") return DOMAIN_STANDARD_REGISTRY.product_system_review_standard;

  return DOMAIN_STANDARD_REGISTRY.general_proof_standard;
}

export function getDomainStandard(key: DomainStandardKey): DomainStandard {
  return DOMAIN_STANDARD_REGISTRY[key];
}

import { buildTwoSourceBankProofTask } from "./law-mastery";
import { selectDomainStandard, type DomainStandardKey } from "./domain-standards";

export type CoachIntent =
  | "legal_reasoning"
  | "academic_proof_plan"
  | "proof_review"
  | "execution_lock"
  | "product_system_review"
  | "law_source_bank"
  | "practice_request"
  | "decision"
  | "diagnosis"
  | "question";

export type CoachMode =
  | "academic_operating_system"
  | "law_reasoning"
  | "law_source_bank"
  | "proof_review"
  | "execution_lock"
  | "product_builder"
  | "study_coach"
  | "psychology_reasoning"
  | "sales_coach"
  | "sport_coach"
  | "life_strategy"
  | "direct_answer"
  | "diagnostic_coaching"
  | "planning"
  | "prompt_builder"
  | "emotional_regulation"
  | "crisis_boundary_safe";

export type CoachDomain =
  | "law"
  | "law_academic"
  | "product"
  | "psychology"
  | "sales"
  | "sport"
  | "language"
  | "finance"
  | "study"
  | "life"
  | "general";

export type CoachState =
  | "strategic_build"
  | "pre_execution"
  | "confused"
  | "avoidant"
  | "overplanning"
  | "overloaded"
  | "low_energy"
  | "urgent"
  | "stuck_loop"
  | "clear";

export type CoachUrgency = "low" | "normal" | "high" | "crisis_boundary";

export type ProofArtifactType =
  | "source_bank_entries"
  | "irac_paragraph"
  | "academic_proof_plan"
  | "product_system_review"
  | "implementation_proof"
  | "visible_artifact";

export interface ProofArtifactRequirement {
  artifactType: ProofArtifactType;
  title: string;
  action: string;
  requiredArtifact: string;
  evidenceStandard: string;
  proofStandardKey: DomainStandardKey;
  timeboxMinutes: number;
}

export interface CoachRouteResult {
  domain: CoachDomain;
  intent: CoachIntent;
  state: CoachState;
  mode: CoachMode;
  urgency: CoachUrgency;
  evidence: string[];
  confidence: number;
  recommendedProofArtifact: ProofArtifactRequirement;
  proofStandardKey: DomainStandardKey;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function lower(value: string): string {
  return clean(value).toLowerCase();
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function requirement(input: {
  artifactType: ProofArtifactType;
  title: string;
  action: string;
  requiredArtifact: string;
  proofStandardKey: DomainStandardKey;
  timeboxMinutes?: number;
}): ProofArtifactRequirement {
  const standard = selectDomainStandard({ artifactType: input.artifactType, intent: input.proofStandardKey });
  return {
    ...input,
    evidenceStandard: standard.criteria.join(" / "),
    timeboxMinutes: input.timeboxMinutes ?? 25,
  };
}

function detectUrgency(text: string): CoachUrgency {
  if (has(text, /\b(kill myself|suicide|self harm|self-harm|hurt myself|end it)\b/)) return "crisis_boundary";
  if (has(text, /\b(due today|tonight|urgent|deadline|exam tomorrow|panic)\b/)) return "high";
  if (text.length < 30) return "low";
  return "normal";
}

function detectState(text: string, intent: CoachIntent): CoachState {
  if (has(text, /\b(urgent|due today|deadline|tonight|exam tomorrow|now)\b/)) return "urgent";
  if (intent === "academic_proof_plan" || intent === "product_system_review") return "strategic_build";
  if (intent === "law_source_bank") return "pre_execution";
  if (has(text, /\b(reorganis|reorganiz|setup|researching more|more planning|perfect plan|template)\b/)) return "overplanning";
  if (has(text, /\b(avoid|procrastinat|can't start|cant start|scrolling|delaying)\b/)) return "avoidant";
  if (has(text, /\b(too much|overwhelmed|drowning|behind|chaos)\b/)) return "overloaded";
  if (has(text, /\b(tired|exhausted|burnt|no energy|flat)\b/)) return "low_energy";
  if (has(text, /\b(confused|don't understand|dont understand|lost|unclear)\b/)) return "confused";
  if (has(text, /\b(again|same problem|still stuck|keep doing this)\b/)) return "stuck_loop";
  if (intent === "execution_lock") return "pre_execution";
  return "clear";
}

export function routeCoachInput(input: string): CoachRouteResult {
  const text = lower(input);
  const evidence: string[] = [];
  const urgency = detectUrgency(text);

  const mentionsLawUnit = has(text, /\b(blaw\d{4}|laws\d{4}|law unit|law study|law mastery)\b/);
  const sourceBank = has(text, /\b(source[- ]?bank|authority log|authority logging|statute note|case note|issue matrix|source preparation)\b/);
  const academicPlan = has(text, /\b(study system|mastery plan|proof plan|unit plan|weekly law proof|academic workflow|unit preparation|source strategy)\b/);
  const legalAnswer = has(text, /\b(irac|legal answer|problem answer|legal reasoning|issue|rule|application|case explanation|statute explanation|legal analysis)\b/);
  const proofReview = has(text, /\b(review|judge|verdict|court of evidence|score|critique|audit|mark my|feedback on)\b/) && has(text, /\b(proof|artifact|answer|paragraph|submission|work)\b/);
  const productReview = has(text, /\b(eblocki|coach router|router|routing|court|proof standard|product system|ux|dashboard|logic|bug|behaviour|behavior)\b/) && has(text, /\b(review|critique|wrong|fix|bug|mismatch|standard|classified|classification|logic)\b/);
  const executionLock = has(text, /\b(overbuild|overbuilding|planning too much|more theory|drifting|avoid|procrastinat|one artifact|required now)\b/);

  if (productReview) {
    evidence.push("product-system behavior or routing critique detected");
    const recommendedProofArtifact = requirement({
      artifactType: "product_system_review",
      title: "Product System Review",
      action: "Submit one product-system review: actual output, corrected logic, implementation path, and measurable acceptance test.",
      requiredArtifact: "One product-system review with actual output evidence, corrected logic, implementation path, and measurable test.",
      proofStandardKey: "product_system_review_standard",
      timeboxMinutes: 25,
    });
    return {
      domain: "product",
      intent: "product_system_review",
      state: detectState(text, "product_system_review"),
      mode: "product_builder",
      urgency,
      evidence,
      confidence: 0.92,
      recommendedProofArtifact,
      proofStandardKey: "product_system_review_standard",
    };
  }

  if (proofReview) {
    evidence.push("artifact judgment request detected");
    const standard = mentionsLawUnit || legalAnswer ? "law_irac_standard" : "general_proof_standard";
    const recommendedProofArtifact = requirement({
      artifactType: standard === "law_irac_standard" ? "irac_paragraph" : "visible_artifact",
      title: "Proof Review Submission",
      action: "Submit the artifact for Court review with the exact standard it should be judged against.",
      requiredArtifact: "One submitted artifact plus the standard it should be judged against.",
      proofStandardKey: standard,
      timeboxMinutes: 15,
    });
    return {
      domain: mentionsLawUnit || legalAnswer ? "law" : "general",
      intent: "proof_review",
      state: detectState(text, "proof_review"),
      mode: "proof_review",
      urgency,
      evidence,
      confidence: 0.86,
      recommendedProofArtifact,
      proofStandardKey: standard,
    };
  }

  if (sourceBank || (mentionsLawUnit && has(text, /\b(authority|statute|case|source|matrix)\b/))) {
    evidence.push("law source-bank preparation detected");
    const recommendedProofArtifact = requirement({
      artifactType: "source_bank_entries",
      title: "Law Source Bank Entries",
      action: buildTwoSourceBankProofTask(),
      requiredArtifact: "Two completed source-bank entries with source, jurisdiction, authority level, current version check, key rule, unit relevance, assessment use, limitation, and confidence rating.",
      proofStandardKey: "law_source_bank_standard",
      timeboxMinutes: 35,
    });
    return {
      domain: "law_academic",
      intent: "law_source_bank",
      state: detectState(text, "law_source_bank"),
      mode: "law_source_bank",
      urgency,
      evidence,
      confidence: 0.94,
      recommendedProofArtifact,
      proofStandardKey: "law_source_bank_standard",
    };
  }

  if ((mentionsLawUnit && academicPlan) || (academicPlan && has(text, /\blaw\b/))) {
    evidence.push("law academic mastery or proof-plan request detected");
    const recommendedProofArtifact = requirement({
      artifactType: "source_bank_entries",
      title: "BLAW1003 + LAWS1004 Source Bank Start",
      action: buildTwoSourceBankProofTask(),
      requiredArtifact: "Two completed source-bank entries: one BLAW1003 authority and one LAWS1004 authority. Do not write IRAC before at least one authority exists.",
      proofStandardKey: "law_source_bank_standard",
      timeboxMinutes: 35,
    });
    return {
      domain: "law_academic",
      intent: "academic_proof_plan",
      state: detectState(text, "academic_proof_plan"),
      mode: "academic_operating_system",
      urgency,
      evidence,
      confidence: 0.95,
      recommendedProofArtifact,
      proofStandardKey: "academic_proof_plan_standard",
    };
  }

  if (legalAnswer) {
    evidence.push("legal reasoning or IRAC answer request detected");
    const recommendedProofArtifact = requirement({
      artifactType: "irac_paragraph",
      title: "IRAC Paragraph",
      action: "Write one IRAC paragraph with issue, rule, authority, application, conclusion, and one limitation if relevant.",
      requiredArtifact: "One 200-400 word IRAC paragraph with issue, rule, authority, application, conclusion, and citation precision.",
      proofStandardKey: "law_irac_standard",
      timeboxMinutes: 30,
    });
    return {
      domain: "law",
      intent: "legal_reasoning",
      state: detectState(text, "legal_reasoning"),
      mode: "law_reasoning",
      urgency,
      evidence,
      confidence: 0.88,
      recommendedProofArtifact,
      proofStandardKey: "law_irac_standard",
    };
  }

  if (executionLock) {
    evidence.push("planning or avoidance pattern detected");
    const recommendedProofArtifact = requirement({
      artifactType: "visible_artifact",
      title: "Execution Lock Artifact",
      action: "Produce one visible artifact in 25 minutes. No second requirement until it exists.",
      requiredArtifact: "One visible artifact with one evidence standard.",
      proofStandardKey: "general_proof_standard",
      timeboxMinutes: 25,
    });
    return {
      domain: "general",
      intent: "execution_lock",
      state: detectState(text, "execution_lock"),
      mode: "execution_lock",
      urgency,
      evidence,
      confidence: 0.82,
      recommendedProofArtifact,
      proofStandardKey: "general_proof_standard",
    };
  }

  const isQuestion = text.endsWith("?") || has(text, /\b(what|why|how|when|which)\b/);
  const recommendedProofArtifact = requirement({
    artifactType: "visible_artifact",
    title: "General Proof Artifact",
    action: "Submit one concrete artifact that proves the action happened and names the next upgrade.",
    requiredArtifact: "One visible artifact with applied detail, feedback awareness, and next upgrade.",
    proofStandardKey: "general_proof_standard",
    timeboxMinutes: 25,
  });

  return {
    domain: "general",
    intent: isQuestion ? "question" : "diagnosis",
    state: detectState(text, isQuestion ? "question" : "diagnosis"),
    mode: isQuestion ? "direct_answer" : "diagnostic_coaching",
    urgency,
    evidence: evidence.length ? evidence : ["general prompt"],
    confidence: isQuestion ? 0.62 : 0.58,
    recommendedProofArtifact,
    proofStandardKey: "general_proof_standard",
  };
}

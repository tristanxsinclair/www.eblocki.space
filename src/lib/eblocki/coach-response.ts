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

  const proofContract =
    typeof data.proofContract === "object" && data.proofContract !== null
      ? data.proofContract
      : {};

  return {
    success: typeof data.success === "boolean" ? data.success : true,
    mode: String(data.mode || "GENERAL_EXECUTION"),
    hybrid: data.hybrid ? String(data.hybrid) : null,
    state: data.state ?? null,
    response: String(
      data.response ||
        data.assistantOutput ||
        data.output ||
        "Coach response generated, but no response text was returned."
    ),
    proofContract: {
      shouldCreate:
        typeof proofContract.shouldCreate === "boolean"
          ? proofContract.shouldCreate
          : false,
      domain: String(proofContract.domain || DEFAULT_PROOF_CONTRACT.domain),
      mode: String(proofContract.mode || data.mode || DEFAULT_PROOF_CONTRACT.mode),
      title: String(proofContract.title || DEFAULT_PROOF_CONTRACT.title),
      requiredArtifact: String(
        proofContract.requiredArtifact ||
          proofContract.required_artifact ||
          DEFAULT_PROOF_CONTRACT.requiredArtifact
      ),
      evidenceStandard: String(
        proofContract.evidenceStandard ||
          proofContract.evidence_standard ||
          DEFAULT_PROOF_CONTRACT.evidenceStandard
      ),
      dueDate: proofContract.dueDate || proofContract.due_date || null,
      seriousnessScore: Number(
        proofContract.seriousnessScore ||
          proofContract.seriousness_score ||
          DEFAULT_PROOF_CONTRACT.seriousnessScore
      ),
      reason: String(proofContract.reason || DEFAULT_PROOF_CONTRACT.reason),
    },
    proofQuestion: String(
      data.proofQuestion || "What proof artifact will confirm completion?"
    ),
    interactionId: data.interactionId || data.interaction_id || null,
    commitmentId: data.commitmentId || data.commitment_id || null,
    usedFallback: !!(data.debug && data.debug.usedFallback),
  };
}

export function isSeriousActionPrompt(message: string): boolean {
  return /\b(write|draft|study|prepare|build|practise|practice|revise|reflect|train|sell|complete|submit|create|produce|fix)\b/i.test(
    message
  );
}

export function getFallbackCoachResponse(message: string): NormalisedCoachResponse {
  const lower = message.toLowerCase();

  let mode: EblockiMode = "GENERAL_EXECUTION";
  let state: EblockiState = "momentum";
  let domain = "general";

  if (
    lower.includes("law") ||
    lower.includes("laws1005") ||
    lower.includes("laws1006") ||
    lower.includes("irac") ||
    lower.includes("statutory")
  ) {
    mode = "LAW_MAX";
    domain = "law";
  } else if (
    lower.includes("psych") ||
    lower.includes("psyc1000") ||
    lower.includes("cognition") ||
    lower.includes("behaviour")
  ) {
    mode = "PSYCH_HD";
    domain = "psychology";
  } else if (
    lower.includes("sales") ||
    lower.includes("good guys") ||
    lower.includes("gse") ||
    lower.includes("customer")
  ) {
    mode = "SALES_CLOSE";
    domain = "sales";
  } else if (
    lower.includes("soccer") ||
    lower.includes("striker") ||
    lower.includes("training") ||
    lower.includes("match")
  ) {
    mode = "SPORT";
    domain = "sport";
  } else if (
    lower.includes("brand") ||
    lower.includes("linkedin") ||
    lower.includes("instagram") ||
    lower.includes("youtube")
  ) {
    mode = "BRAND";
    domain = "brand";
  } else if (
    lower.includes("career") ||
    lower.includes("resume") ||
    lower.includes("cover letter") ||
    lower.includes("money")
  ) {
    mode = "CAREER_MONEY";
    domain = "career_money";
  } else if (
    lower.includes("eblocki") ||
    lower.includes("proof") ||
    lower.includes("discipline") ||
    lower.includes("avoidance")
  ) {
    mode = "EBLOCKI";
    domain = "eblocki";
  }

  if (
    lower.includes("reorganising notes") ||
    lower.includes("reorganizing notes") ||
    lower.includes("instead of writing")
  ) {
    state = "academic_displacement";
  } else if (
    lower.includes("overwhelmed") ||
    lower.includes("too much") ||
    lower.includes("so much")
  ) {
    state = "overloaded";
  } else if (
    lower.includes("avoid") ||
    lower.includes("procrastinate") ||
    lower.includes("stuck")
  ) {
    state = "avoidant";
  } else if (
    lower.includes("tired") ||
    lower.includes("low energy") ||
    lower.includes("exhausted")
  ) {
    state = "low_energy";
  } else if (
    lower.includes("big idea") ||
    lower.includes("massive plan")
  ) {
    state = "hype_drift";
  }

  const serious = isSeriousActionPrompt(message);

  const title =
    mode === "LAW_MAX"
      ? "LAWS1005 Statutory Interpretation Mini-IRAC"
      : mode === "SALES_CLOSE"
      ? "Sales Reflection and Next Close Script"
      : mode === "SPORT"
      ? "Training Proof Log"
      : mode === "PSYCH_HD"
      ? "Psychology CAEE Paragraph"
      : "Eblocki Proof Artifact";

  const requiredArtifact =
    mode === "LAW_MAX"
      ? "One 250–400 word IRAC-style answer using issue, rule/framework, application, counterargument, and conclusion."
      : mode === "SALES_CLOSE"
      ? "One sales reflection identifying customer need, objection, GSE attachment attempt, and next script upgrade."
      : mode === "SPORT"
      ? "One training or match log identifying movement quality, best action, repeated mistake, and next drill."
      : mode === "PSYCH_HD"
      ? "One Concept → Application → Evidence → Evaluation paragraph."
      : "One concrete proof artifact showing the action completed, feedback gained, and next upgrade.";

  return {
    success: true,
    mode,
    hybrid: null,
    state,
    response: `## Bottom Line Up Front

The next move is not more planning. It is one proof artifact.

## Analysis

Your message indicates a need to convert intention into evidence. The useful move is to reduce the task into one measurable output that can be judged.

## Actionable System

1. Set a 25-minute timer.
2. Produce the smallest serious artifact.
3. Submit or save it as proof.
4. Identify one weakness.
5. Define the next upgrade.

## HD/Elite Upgrade

Do not measure whether you felt productive. Measure whether you created evidence that would survive the Court of Evidence.`,
    proofContract: {
      shouldCreate: serious,
      domain,
      mode,
      title,
      requiredArtifact,
      evidenceStandard:
        "Must include a concrete artifact, applied detail, reflection, and one next upgrade.",
      dueDate: null,
      seriousnessScore: serious ? 8 : 0,
      reason: serious
        ? "The prompt contains a serious action request that should produce evidence."
        : "No serious action request was detected.",
    },
    proofQuestion: "What proof artifact will confirm completion?",
    interactionId: null,
    commitmentId: null,
  };
}

import type { TemporalResult } from "./temporal-engine";
import { humaniseModeId } from "./display-labels";

export type PlainVerdictLabel = "Counted" | "Needs upgrade" | "Did not count yet";

export interface ProofResultCopy {
  headline: string;
  countStatus: string;
  todayStatus: string;
  nextCommand: string | null;
  nextCommandReason: string | null;
  primaryLabel: string;
  primaryAction: "improve" | "dashboard";
}

export type ProofResultPresentationStatus = "ready" | "loading" | "error" | "empty";

export interface ImprovementLoopPresentationInput {
  status?: ProofResultPresentationStatus;
  strength?: string | null;
  score?: number | null;
  feedback?: string | null;
  nextUpgrade?: string | null;
  missingStandard?: string | null;
  selectedStandard?: string | null;
  requiredEvidence?: string[] | null;
  artifactType?: string | null;
  modeId?: string | null;
  contractId?: string | null;
  firstProofMode?: boolean;
  contractClosed?: boolean | null;
}

export interface ImprovementLoopPresentation {
  verdict: {
    headline: string;
    classification: string;
    summary: string | null;
  };
  gap: {
    label: string;
    explanation: string | null;
  } | null;
  correction: {
    action: string;
    expectedArtifact: string | null;
  } | null;
  details: {
    standardLabel: string | null;
    confidenceLabel: string | null;
    countStatus: string;
    todayStatus: string;
    requiredEvidence: string[];
  };
  correctedAttemptHref: string;
  primaryLabel: string;
  primaryAction: "corrected_attempt" | "dashboard";
}

export type TodayClosureStatus = "open" | "filed_pending" | "still_open" | "closed";

export interface TodayClosureView {
  status: TodayClosureStatus;
  statusEyebrow: string;
  headline: string;
  subline?: string;
  primaryCta: string;
  secondaryCta?: string;
  verdict: PlainVerdictLabel;
}

const STRENGTH_RANK: Record<string, number> = {
  elite: 4,
  strong: 3,
  moderate: 2,
  useful: 2,
  weak: 1,
  minimum: 1,
};

const INFRASTRUCTURE_TERM_RE = /\b(model|vector|embedding|retrieval|prompt|llm|openai|token)\b/i;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function scrubInternalTokens(value: string): string {
  return value
    .replace(/accepted_strong/gi, "strong proof")
    .replace(/accepted_useful/gi, "useful proof")
    .replace(/accepted_minimum/gi, "minimum proof")
    .replace(/elite_evidence/gi, "elite proof")
    .replace(/\ban strong proof\b/gi, "a strong proof")
    .replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (match) => humaniseModeId(match));
}

function cleanPresentationText(value?: string | null): string | null {
  const text = collapseWhitespace(scrubInternalTokens(value ?? ""));
  if (!text) return null;
  if (INFRASTRUCTURE_TERM_RE.test(text)) return null;
  return text;
}

function sentenceCaseLabel(value: string): string {
  const cleaned = cleanPresentationText(value) ?? "";
  if (!cleaned) return "";
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function buildCorrectedAttemptHref(input: {
  modeId?: string | null;
  contractId?: string | null;
  firstProofMode?: boolean;
  contractClosed?: boolean | null;
}): string {
  const params = new URLSearchParams();
  const mode = collapseWhitespace(input.modeId ?? "");
  const contract = collapseWhitespace(input.contractId ?? "");
  if (input.firstProofMode) params.set("first", "1");
  if (mode) params.set("mode", mode.slice(0, 80));
  if (contract && !input.contractClosed) params.set("contract", contract.slice(0, 120));
  const query = params.toString();
  return query ? `/proof?${query}` : "/proof";
}

function strengthRank(value?: string | null): number {
  return STRENGTH_RANK[(value ?? "").toLowerCase()] ?? 0;
}

export function hasProofOnDate(
  artifacts: { created_at?: string | null }[],
  dateISO: string,
): boolean {
  return artifacts.some((artifact) => artifact.created_at?.slice(0, 10) === dateISO);
}

/**
 * Plain verdict for primary mobile surfaces. Maps internal strength/score
 * without exposing enum language like accepted_strong.
 */
export function plainVerdictLabel(
  strength?: string | null,
  score?: number | null,
): PlainVerdictLabel {
  const rank = strengthRank(strength);
  const numeric = typeof score === "number" && Number.isFinite(score) ? score : null;

  if (!strength && numeric == null) return "Did not count yet";
  if (rank >= 3 || (numeric != null && numeric >= 7)) return "Counted";
  if (rank >= 2 || (numeric != null && numeric >= 5)) return "Needs upgrade";
  return "Did not count yet";
}

export function plainEvidenceStrength(strength?: string | null): string {
  switch ((strength ?? "").toLowerCase()) {
    case "elite":
    case "elite_evidence":
      return "Elite proof";
    case "strong":
    case "accepted_strong":
      return "Strong proof";
    case "moderate":
      return "Moderate proof";
    case "useful":
    case "accepted_useful":
      return "Useful proof";
    case "weak":
    case "minimum":
    case "accepted_minimum":
      return "Weak proof";
    case "rejected":
      return "Did not count";
    default:
      return "Unscored proof";
  }
}

function verdictHeadline(input: {
  strength?: string | null;
  score?: number | null;
  classification: string;
}): string {
  const strength = (input.strength ?? "").toLowerCase();
  const verdict = plainVerdictLabel(input.strength, input.score);
  if (strength === "rejected" || verdict === "Did not count yet") {
    return "This artifact does not count yet.";
  }
  if (verdict === "Needs upgrade") {
    return "This artifact shows a partial proof.";
  }
  return `This artifact supports ${input.classification.toLowerCase()}.`;
}

function verdictSummary(input: ImprovementLoopPresentationInput, standardLabel: string | null): string | null {
  const cleanedFeedback = cleanPresentationText(input.feedback)
    ?.replace(/\b(Weak|Moderate|Strong|Elite) evidence against\b/g, "$1 evidence under")
    ?? null;
  if (cleanedFeedback) return cleanedFeedback;

  const verdict = plainVerdictLabel(input.strength, input.score);
  if (standardLabel && verdict === "Did not count yet") {
    return `This submission does not yet demonstrate ${standardLabel}.`;
  }
  if (standardLabel && verdict === "Needs upgrade") {
    return `This evidence supports an attempt under ${standardLabel}, but the standard is not fully demonstrated yet.`;
  }
  if (standardLabel && verdict === "Counted") {
    return `This evidence supports a counted result under ${standardLabel}.`;
  }
  return null;
}

function parseGap(
  missingStandard: string | null,
  strength?: string | null,
  standardLabel?: string | null,
): ImprovementLoopPresentation["gap"] {
  const text = cleanPresentationText(missingStandard);
  if (!text) return null;
  if ((strength ?? "").toLowerCase() === "elite" && /^none\b/i.test(text)) return null;

  const withoutMissing = text.replace(/^missing\s+/i, "");
  const [rawLabel, ...rest] = withoutMissing.split(":");
  const labelBase = cleanPresentationText(rawLabel) ?? "Main standard gap";
  const explanationBase = cleanPresentationText(rest.join(":")) ?? text;
  const label = /gap$/i.test(labelBase) ? labelBase : `${labelBase} gap`;
  const explanation = standardLabel
    ? `${explanationBase}. This matters because the next attempt has to show ${standardLabel} more clearly.`
    : explanationBase;

  return { label, explanation };
}

function buildExpectedArtifact(input: ImprovementLoopPresentationInput): string | null {
  const artifactLabel = cleanPresentationText(input.artifactType)
    ? sentenceCaseLabel(input.artifactType!)
    : null;
  const firstEvidence = cleanPresentationText(input.requiredEvidence?.[0] ?? null);
  const standardLabel = cleanPresentationText(input.selectedStandard);

  if (artifactLabel && firstEvidence) {
    return `A corrected ${artifactLabel} that shows ${firstEvidence}.`;
  }
  if (artifactLabel) return `A corrected ${artifactLabel}.`;
  if (firstEvidence) return `A corrected artifact that shows ${firstEvidence}.`;
  if (standardLabel) return `A corrected artifact judged against ${standardLabel}.`;
  return null;
}

export function proofResultCopy(input: {
  strength?: string | null;
  score?: number | null;
  nextUpgrade?: string | null;
  contractClosed?: boolean | null;
  firstProofMode?: boolean;
}): ProofResultCopy {
  const verdict = plainVerdictLabel(input.strength, input.score);
  const strength = (input.strength ?? "").toLowerCase();
  const nextUpgrade = input.nextUpgrade?.trim() || null;
  const firstProofMode = Boolean(input.firstProofMode);
  const contractClosed = Boolean(input.contractClosed);

  if (firstProofMode) {
    return {
      headline: `Proof submitted. ${verdict}.`,
      countStatus: verdict,
      todayStatus: "Your first proof is filed. Today can now show the next step.",
      nextCommand: "Open Today and take the next visible command.",
      nextCommandReason: "The first loop is capture first, then correction.",
      primaryLabel: "See my next step",
      primaryAction: "dashboard",
    };
  }

  if (strength === "weak") {
    return {
      headline: "Proof submitted. It does not count yet.",
      countStatus: "Did not count yet",
      todayStatus: "Today stays open until the artifact shows visible evidence.",
      nextCommand: nextUpgrade,
      nextCommandReason: nextUpgrade ? "Upgrade the same artifact before starting another proof." : null,
      primaryLabel: "Upgrade proof",
      primaryAction: "improve",
    };
  }

  if (strength === "rejected") {
    return {
      headline: "Proof submitted. It does not count yet.",
      countStatus: "Did not count yet",
      todayStatus: "Today stays open until the artifact shows visible evidence.",
      nextCommand: nextUpgrade,
      nextCommandReason: nextUpgrade ? "Upgrade the same artifact before starting another proof." : null,
      primaryLabel: "Upgrade proof",
      primaryAction: "improve",
    };
  }

  if (strength === "moderate" || verdict === "Needs upgrade") {
    return {
      headline: "Proof submitted. It needs one upgrade.",
      countStatus: "Needs upgrade",
      todayStatus: "Useful proof was filed, but it is not a full close yet.",
      nextCommand: nextUpgrade,
      nextCommandReason: nextUpgrade ? "One concrete improvement can move this proof toward the standard." : null,
      primaryLabel: "Strengthen proof",
      primaryAction: "improve",
    };
  }

  if (contractClosed) {
    return {
      headline: "Proof submitted. Contract closed.",
      countStatus: verdict,
      todayStatus: "The linked contract is closed by this artifact.",
      nextCommand: "Open Today and take the next command.",
      nextCommandReason: "Do not keep re-judging a closed proof here.",
      primaryLabel: "Back to Today",
      primaryAction: "dashboard",
    };
  }

  if (strength === "elite") {
    return {
      headline: "Proof submitted. Elite proof accepted.",
      countStatus: "Counted",
      todayStatus: "Strong enough to close today.",
      nextCommand: "Apply this standard to the next artifact.",
      nextCommandReason: "Elite proof raises the bar for the next loop.",
      primaryLabel: "Back to Today",
      primaryAction: "dashboard",
    };
  }

  return {
    headline: "Proof submitted. Strong proof accepted.",
    countStatus: "Counted",
    todayStatus: "Strong enough to close today.",
    nextCommand: nextUpgrade ? `Carry this into the next proof: ${nextUpgrade}` : "Open Today and take the next command.",
    nextCommandReason: "The proof counts. The next command should compound the standard.",
    primaryLabel: "Back to Today",
    primaryAction: "dashboard",
  };
}

export function buildImprovementLoopPresentation(
  input: ImprovementLoopPresentationInput,
): ImprovementLoopPresentation | null {
  const status = input.status ?? "ready";
  if (status !== "ready") return null;
  if (!input.strength && (input.score == null || !Number.isFinite(input.score))) return null;

  const copy = proofResultCopy(input);
  const classification = plainEvidenceStrength(input.strength);
  const standardLabel = cleanPresentationText(input.selectedStandard);
  const requiredEvidence = (input.requiredEvidence ?? [])
    .map((item) => cleanPresentationText(item))
    .filter((item): item is string => Boolean(item));
  const nextUpgrade = cleanPresentationText(input.nextUpgrade);
  const gap = parseGap(input.missingStandard ?? null, input.strength, standardLabel);
  const correction = nextUpgrade
    ? {
        action: nextUpgrade,
        expectedArtifact: buildExpectedArtifact({ ...input, selectedStandard: standardLabel, requiredEvidence }),
      }
    : null;
  const primaryAction = copy.primaryAction === "improve" || correction ? "corrected_attempt" : "dashboard";

  return {
    verdict: {
      headline: verdictHeadline({ strength: input.strength, score: input.score, classification }),
      classification,
      summary: verdictSummary({ ...input, selectedStandard: standardLabel }, standardLabel),
    },
    gap,
    correction,
    details: {
      standardLabel,
      confidenceLabel: classification,
      countStatus: copy.countStatus,
      todayStatus: copy.todayStatus,
      requiredEvidence,
    },
    correctedAttemptHref: buildCorrectedAttemptHref(input),
    primaryLabel: primaryAction === "corrected_attempt" ? "Submit corrected attempt" : copy.primaryLabel,
    primaryAction,
  };
}

/** Court / ledger verdict tokens — never show raw enums in primary UI. */
export function plainCourtVerdict(verdict?: string | null): string {
  switch ((verdict ?? "").toLowerCase()) {
    case "accepted_strong":
      return "Strong proof";
    case "accepted_useful":
      return "Useful proof";
    case "accepted_minimum":
      return "Minimum proof";
    case "elite":
    case "elite_evidence":
      return "Elite proof";
    case "rejected":
      return "Did not count";
    default:
      return plainEvidenceStrength(verdict);
  }
}

/** Proof tier labels for operator / ledger surfaces. */
export function plainTierLabel(tier?: number | string | null): string {
  const numeric = typeof tier === "string" ? Number.parseInt(tier, 10) : tier;
  if (numeric == null || !Number.isFinite(numeric)) return "Unscored evidence";
  switch (numeric) {
    case 1:
      return "Basic evidence";
    case 2:
      return "Output evidence";
    case 3:
      return "High-quality evidence";
    case 4:
      return "Pressure evidence";
    case 5:
      return "Transfer evidence";
    case 6:
      return "Identity evidence";
    default:
      return `Tier ${numeric} evidence`;
  }
}

/**
 * Maps today's proof into closure semantics. A day closes only when proof counts.
 */
export function resolveTodayClosure(
  hasProofToday: boolean,
  strength?: string | null,
  score?: number | null,
): TodayClosureView {
  if (!hasProofToday) {
    return {
      status: "open",
      statusEyebrow: "Today open",
      headline: "Today is not closed yet.",
      primaryCta: "Submit proof",
      verdict: "Did not count yet",
    };
  }

  const verdict = plainVerdictLabel(strength, score);
  const pending = !strength && (score == null || !Number.isFinite(score));

  if (pending) {
    return {
      status: "filed_pending",
      statusEyebrow: "Proof filed",
      headline: "You filed proof. Verdict pending.",
      primaryCta: "View proof",
      secondaryCta: "Improve proof",
      verdict,
    };
  }

  if (verdict === "Counted") {
    return {
      status: "closed",
      statusEyebrow: "Today closed",
      headline: "Your proof counted today.",
      subline: "Come back tomorrow with the next visible output.",
      primaryCta: "View proof",
      secondaryCta: "Back tomorrow",
      verdict,
    };
  }

  if (verdict === "Needs upgrade") {
    return {
      status: "still_open",
      statusEyebrow: "Today still open",
      headline: "You filed proof, but it needs upgrade to count fully.",
      primaryCta: "Improve proof",
      secondaryCta: "View proof",
      verdict,
    };
  }

  return {
    status: "still_open",
    statusEyebrow: "Today still open",
    headline: "You filed proof, but it did not count yet.",
    primaryCta: "Improve proof",
    secondaryCta: "View proof",
    verdict,
  };
}

/** Compress internal risk tokens for a one-line mobile summary. */
export function plainRiskLine(risk: string): string {
  const cleaned = risk
    .replace(/accepted_strong/gi, "strong proof")
    .replace(/elite_evidence/gi, "elite proof")
    .replace(/identity escalation/gi, "standard raised")
    .replace(/_/g, " ")
    .trim();
  if (!cleaned) return "Interpretation will replace visible proof.";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Optional compressed forecast line — plain language only. */
export function compressForecastSummary(temporal: TemporalResult | null | undefined): string | null {
  if (!temporal?.hasEvidence) return null;
  const risk = plainRiskLine(temporal.risk.primaryFailureMode);
  const next = temporal.intervention.command.slice(0, 160).trim();
  return `Main risk: ${risk.replace(/\.$/, "")}. Next proof: ${next}`;
}

/** Scrub raw enum tokens from ledger/history summary lines. */
export function plainLedgerText(text: string): string {
  return text
    .replace(/accepted_strong/gi, "strong proof")
    .replace(/accepted_useful/gi, "useful proof")
    .replace(/accepted_minimum/gi, "minimum proof")
    .replace(/elite_evidence/gi, "elite proof")
    .replace(/\btier\s*1\b/gi, "basic evidence")
    .replace(/\btier\s*2\b/gi, "output evidence")
    .replace(/\btier\s*3\b/gi, "high-quality evidence")
    .replace(/\btier\s*4\b/gi, "pressure evidence")
    .replace(/\btier\s*5\b/gi, "transfer evidence")
    .replace(/\btier\s*6\b/gi, "identity evidence")
    .replace(/_/g, " ");
}

export const PROOF_DEFINITION_ONCE =
  "Proof means visible output: a paragraph, solved question, shipped change, sales insight, training reflection, or closed loop.";

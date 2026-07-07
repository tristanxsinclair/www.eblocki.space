/**
 * First-proof activation flow helpers.
 *
 * When a zero-artifact user clicks the Dashboard activation card, they land on
 * `/proof?first=1`. The Proof page uses these helpers to switch into a focused
 * activation experience and to render consistent, student-readable copy.
 *
 * Constraint: first-proof copy must NOT use advanced operator language
 * (Court, identity escalation, temporal, calibration, evidence governance,
 * behavioural operating system). Normal /proof keeps the full pro flow.
 */

export const FIRST_PROOF_QUERY_KEY = "first";
export const FIRST_PROOF_QUERY_VALUE = "1";
export const UGLY_START_QUERY_KEY = "ugly";
export const UGLY_START_QUERY_VALUE = "1";

export const FIRST_PROOF_COPY = {
  title: "Submit your first proof.",
  subtitle:
    "Paste one piece of real work. Eblocki will tell you what counted, what was weak, and what to do next.",
  helperHeader: "What counts?",
  successTitle: "First proof submitted.",
  successCta: "See my next step",
} as const;

export const UGLY_START_COPY = {
  title: "Avoidance detected. Start ugly. Quality comes after existence.",
  subtitle: "2-minute start. One rough sentence or artifact counts. Quality is not judged until artifact exists.",
  support: "One artifact. One standard. One verdict.",
} as const;

export interface FirstProofExample {
  domain: string;
  example: string;
}

export const FIRST_PROOF_EXAMPLES: FirstProofExample[] = [
  { domain: "Essay", example: "essay paragraph" },
  { domain: "Notes", example: "study notes in your own words" },
  { domain: "Past paper", example: "corrected past-paper answer" },
  { domain: "Law", example: "IRAC paragraph" },
  { domain: "Psychology", example: "psychology concept explanation" },
];

export const FIRST_PROOF_STANDARD = {
  whatCounts:
    "A visible piece of work you actually produced, pasted or attached clearly enough to check.",
  stronger:
    "It gets stronger when it includes your own words, a correction, specific detail, or a clear next improvement.",
  whatToPaste:
    "Paste the work itself: an essay paragraph, study notes, a corrected answer, an IRAC paragraph, or a concept explanation.",
} as const;

/**
 * Safe defaults applied when a first-proof submission is sent without the
 * user opening Advanced details. These keep the existing proof-scoring
 * pipeline happy without exposing mode/proof-type concepts above the fold.
 */
export const FIRST_PROOF_DEFAULTS = {
  modeId: "GENERAL_EXECUTION",
  domain: "general_execution",
  artifactType: "written answer",
} as const;

/**
 * Plain-language standard preview used in place of the full advanced
 * ProofStandardPreviewPanel when the user is in first-proof mode.
 */
export const FIRST_PROOF_STANDARD_PREVIEW = {
  whatCounts: "One piece of real work you produced — written, solved, or corrected by you.",
  whatMakesItStronger:
    "Your own words, a concrete example, and one line on what you learned or would fix.",
  whatShouldIPaste:
    "Paste the actual paragraph, answer, or notes. Not a plan, not a summary of intent.",
} as const;

/**
 * Terms that must never appear in first-proof user-facing copy. Tests assert
 * this to keep the surface readable for a first-time student.
 */
export const FIRST_PROOF_FORBIDDEN_TERMS = [
  "Court",
  "identity escalation",
  "temporal",
  "calibration",
  "evidence governance",
  "behavioural operating system",
] as const;

/**
 * Detect first-proof mode from a URLSearchParams-like object.
 * Accepts either a real URLSearchParams or anything with a compatible `.get`.
 */
export function isFirstProofMode(
  params: { get: (key: string) => string | null } | URLSearchParams | null | undefined,
): boolean {
  if (!params) return false;
  return params.get(FIRST_PROOF_QUERY_KEY) === FIRST_PROOF_QUERY_VALUE;
}

export function isUglyStartMode(
  params: { get: (key: string) => string | null } | URLSearchParams | null | undefined,
): boolean {
  if (!params) return false;
  return params.get(UGLY_START_QUERY_KEY) === UGLY_START_QUERY_VALUE;
}

export function buildProofEntryHref({
  firstProof = false,
  uglyStart = false,
}: {
  firstProof?: boolean;
  uglyStart?: boolean;
} = {}): string {
  const params = new URLSearchParams();
  if (firstProof) params.set(FIRST_PROOF_QUERY_KEY, FIRST_PROOF_QUERY_VALUE);
  if (uglyStart) params.set(UGLY_START_QUERY_KEY, UGLY_START_QUERY_VALUE);
  const query = params.toString();
  return query ? `/proof?${query}` : "/proof";
}

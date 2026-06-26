/**
 * First-proof activation flow helpers.
 *
 * When a zero-artifact user clicks the Dashboard activation card, they land on
 * `/proof?first=1`. The Proof page uses these helpers to switch into a focused
 * activation experience and to render consistent copy.
 */

export const FIRST_PROOF_QUERY_KEY = "first";
export const FIRST_PROOF_QUERY_VALUE = "1";

export const FIRST_PROOF_COPY = {
  title: "Submit your first proof.",
  subtitle:
    "Paste one piece of real work. Eblocki will check whether it proves progress and give you the next action.",
  helperHeader: "First proof standard",
  successTitle: "First proof submitted.",
  successCta: "Back to dashboard",
} as const;

export const FIRST_PROOF_DEFAULTS = {
  modeId: "GENERAL_EXECUTION",
  domain: "general_execution",
  artifactType: "written answer",
} as const;

export interface FirstProofExample {
  domain: string;
  example: string;
}

export const FIRST_PROOF_EXAMPLES: FirstProofExample[] = [
  { domain: "Essay", example: "essay paragraph" },
  { domain: "Study", example: "study notes in your own words" },
  { domain: "Past paper", example: "corrected past-paper answer" },
  { domain: "Law", example: "IRAC paragraph" },
  { domain: "Psychology", example: "psychology concept explanation" },
];

export const FIRST_PROOF_STANDARD = {
  whatCounts: "A visible piece of work you actually produced, pasted or attached clearly enough to check.",
  stronger: "It gets stronger when it includes your own words, a correction, specific detail, or a clear next improvement.",
  whatToPaste:
    "Paste the work itself: an essay paragraph, study notes, a corrected answer, an IRAC paragraph, or a concept explanation.",
} as const;

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

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
  title: "Activate Eblocki with one proof artifact.",
  subtitle:
    "Eblocki does not start from motivation. It starts from evidence. Submit one measurable artifact so the system can judge your first signal.",
  helperHeader: "What counts as proof?",
  successTitle: "First proof submitted. Dashboard intelligence is now active.",
  successCta: "Back to dashboard",
} as const;

export interface FirstProofExample {
  domain: string;
  example: string;
}

export const FIRST_PROOF_EXAMPLES: FirstProofExample[] = [
  { domain: "Study", example: "one paragraph written from memory" },
  { domain: "Work", example: "one customer insight or objection handled" },
  { domain: "Build", example: "one shipped fix, prompt, test, or decision" },
  { domain: "Training", example: "one drill completed with correction note" },
  { domain: "Life", example: "one closed loop or recovery action" },
];

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

/**
 * Pure helpers for mobile progressive disclosure.
 *
 * Mobile = viewport width < md (Tailwind md breakpoint).
 * These helpers are framework-agnostic so they can be unit-tested
 * without rendering React.
 *
 * Doctrine: collapse advanced intelligence, never the core loop.
 */

export const MOBILE_RECENT_PROOF_DEFAULT = 2;
export const MOBILE_LEDGER_DEFAULT = 5;
export const MOBILE_ARTIFACT_SUMMARY_CHARS = 220;

export function mobileRecentProofLimit(total: number, expanded: boolean): number {
  if (expanded) return total;
  return Math.min(total, MOBILE_RECENT_PROOF_DEFAULT);
}

export function mobileLedgerLimit(total: number, expanded: boolean): number {
  if (expanded) return total;
  return Math.min(total, MOBILE_LEDGER_DEFAULT);
}

/**
 * Returns a short summary suitable for the collapsed completed-artifact card.
 * The full text is preserved separately for the expanded view.
 */
export function summariseArtifactContent(
  content: string | null | undefined,
  max: number = MOBILE_ARTIFACT_SUMMARY_CHARS,
): string {
  if (!content) return "";
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

/**
 * The advanced sections that should default-collapse on phone widths.
 * Used by Dashboard so behaviour is testable from a single source.
 */
export const ADVANCED_DASHBOARD_SECTIONS = [
  "forecast_map",
  "calibration",
  "model_health",
  "diagnostics",
  "product_match",
  "evidence_details",
  "recent_proof_full",
  "identity_ledger_details",
] as const;

export type AdvancedDashboardSection = (typeof ADVANCED_DASHBOARD_SECTIONS)[number];

/** True if a section should be collapsed by default on a given viewport. */
export function isCollapsedByDefault(
  section: AdvancedDashboardSection,
  isMobile: boolean,
): boolean {
  return isMobile;
}
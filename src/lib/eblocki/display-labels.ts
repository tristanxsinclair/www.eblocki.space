/**
 * Display-name helpers.
 *
 * Rule: cold users must never see raw enum strings like
 * `EBLOCKI_PRODUCT_REVIEW`, `SALES_RETAIL_TGG`, or
 * `AUSTRALIAN_TECH_LAW_AI_GOVERNANCE` in normal UI.
 *
 * `humaniseModeId` converts any internal id (built-in or custom) into a
 * readable label. Prefer explicit maps (MODE_LABELS, custom mode
 * display_name) first — this is the fallback.
 */

import { MODE_LABELS } from "./modes";

const EXTRA_LABELS: Record<string, string> = {
  EBLOCKI_PRODUCT_REVIEW: "Eblocki Product Review",
  SALES_RETAIL_TGG: "Sales",
  AUSTRALIAN_TECH_LAW_AI_GOVERNANCE: "Australian Tech Law",
  GENERAL_EXECUTION: "General Execution",
};

export function humaniseModeId(
  id: string | null | undefined,
  fallbackDisplayName?: string | null,
): string {
  if (!id) return fallbackDisplayName ?? "";
  if (fallbackDisplayName && fallbackDisplayName.trim()) return fallbackDisplayName;
  const upper = id.toUpperCase();
  if (upper in EXTRA_LABELS) return EXTRA_LABELS[upper];
  if (upper in MODE_LABELS) return (MODE_LABELS as Record<string, string>)[upper];
  // Fallback: SNAKE_CASE / snake_case → Title Case
  return id
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Study-shaped domains where the Fake Study Detector produces meaningful
 * feedback. Everything else (product, sales, life, sport, brand, career,
 * general execution) should NOT show study-specific hints — those domains
 * need their own detectors, and mislabelled study feedback destroys trust.
 */
const STUDY_DOMAIN_TOKENS = [
  "study",
  "law",
  "psych",
  "academic",
  "learning",
  "exam",
  "revision",
];

export function isStudyDomain(
  ...values: Array<string | null | undefined>
): boolean {
  for (const v of values) {
    if (!v) continue;
    const lower = v.toLowerCase();
    for (const token of STUDY_DOMAIN_TOKENS) {
      if (lower.includes(token)) return true;
    }
  }
  return false;
}

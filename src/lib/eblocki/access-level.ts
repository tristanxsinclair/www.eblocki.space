/**
 * Commercial access model. Deterministic, client-readable.
 *
 * Source of truth for paid access remains the backend (Stripe webhook /
 * trusted profile flag). This helper only interprets a flag that the app
 * already holds — it never grants access on its own.
 */

export type AccessLevel = "free" | "pro" | "founder";

export const ACCESS_FEATURES: Record<AccessLevel, string[]> = {
  free: [
    "onboarding",
    "daily_check_in",
    "basic_proof",
    "basic_streak",
    "basic_stats",
    "limited_product_matches",
  ],
  pro: [
    "sentinel_risk",
    "cortex_paths",
    "advanced_proof_analytics",
    "court_of_evidence",
    "adversarial_review",
    "identity_ledger",
    "personalised_quests",
    "advanced_product_matching",
    "weekly_executive_review",
    "adaptive_coaching",
  ],
  founder: [
    "experimental_intelligence",
    "deeper_personalisation",
    "early_features",
    "priority_feedback",
  ],
};

export function hasFeature(level: AccessLevel, feature: string): boolean {
  if (level === "founder") return true;
  if (level === "pro") {
    return ACCESS_FEATURES.free.includes(feature) || ACCESS_FEATURES.pro.includes(feature);
  }
  return ACCESS_FEATURES.free.includes(feature);
}

export function normaliseAccessLevel(value: unknown): AccessLevel {
  if (value === "pro" || value === "founder") return value;
  return "free";
}
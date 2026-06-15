/**
 * Privacy-safe behavioural event logger.
 *
 * Writes to `analytics_events`. Only stable event names + minimal
 * non-PII properties. Reflection content, free-text coach inputs, and
 * user identifiers beyond the auth-derived user_id are NOT stored.
 */

import { supabase } from "@/integrations/supabase/client";

export type EngineEvent =
  | "objective_created"
  | "objective_completed"
  | "objective_skipped"
  | "coach_called"
  | "notification_evaluated"
  | "notification_sent"
  | "notification_suppressed"
  | "retro_generated"
  | "fixture_seeded"
  | "proof_capture_opened"
  | "proof_capture_completed"
  | "proof_capture_rejected"
  | "proof_capture_abandoned"
  | "welcome_started"
  | "welcome_step_viewed"
  | "welcome_completed"
  | "welcome_skipped"
  | "why_viewed"
  | "feedback_submitted"
  | "temporal_snapshot_created"
  | "temporal_loop_audit_status"
  | "temporal_calibration_completed"
  | "dashboard_section_opened"
  | "gameforge_pack_generated"
  | "gameforge_round_completed"
  | "gameforge_boss_battle_completed"
  | "gameforge_mastery_result"
  | "coach_prompt_submitted"
  | "coach_mode_detected"
  | "coach_proof_action_generated"
  | "coach_gameforge_suggested"
  | "product_need_detected"
  | "product_match_shown"
  | "product_match_clicked"
  | "product_match_dismissed"
  | "upgrade_cta_shown"
  | "upgrade_clicked"
  | "recommendation_outcome_logged";

/** Whitelist of property keys - anything else is dropped. */
const ALLOWED_KEYS = new Set([
  "kind", "mode", "state", "score", "streak", "resistance", "depth",
  "result", "reason", "dedup_key", "escalation_level", "count", "fixture",
  "quality", "proof_len", "has_upgrade", "has_hard",
  "step", "route",
  "modelVersion", "confidenceLevel", "loopStatus", "riskKind", "recommendedPath",
  "accuracyBucket", "intelligenceLevel", "sectionName",
  "domain", "intensity", "style", "scoreBucket", "responseMode", "proofActionType",
  "accuracy", "bossCompleted", "correct", "difficulty", "suggested", "roundStyle",
  "needSource", "needUrgency", "matchCategory", "monetisationType", "fitScore", "accessLevel", "outcome",
]);

function sanitise(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (typeof v === "string" && v.length > 64) out[k] = v.slice(0, 64);
    else out[k] = v;
  }
  return out;
}

export async function logEvent(event: EngineEvent, props: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event,
      // Cast to satisfy generated Json typing; content is already sanitised.
      properties: sanitise(props) as unknown as Record<string, never>,
      platform: "web",
    });
  } catch {
    // Never let analytics break user flow.
  }
}

/**
 * Privacy-safe behavioural event logger.
 *
 * Writes to `analytics_events`. Only stable event names + minimal
 * non-PII properties. Reflection content, free-text coach inputs, and
 * user identifiers beyond the auth-derived user_id are NOT stored.
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type EngineEvent =
  | "correction_attempt_submitted"
  | "activation_landing_primary_cta_clicked"
  | "activation_auth_completed"
  | "activation_dashboard_zero_state_seen"
  | "activation_first_proof_entered"
  | "activation_first_proof_submitted"
  | "activation_artifact_submission_started"
  | "activation_artifact_submitted"
  | "activation_verdict_shown"
  | "activation_verdict_cta_clicked"
  | "activation_correction_started"
  | "activation_second_attempt_submitted"
  | "proof_verdict_viewed"
  | "proof_verdict_cta_clicked"
  | "activation_proof_week_join_clicked"
  | "activation_day_2_return_seen"
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
  | "coach_prompt_submitted"
  | "coach_mode_detected"
  | "coach_proof_action_generated"
  | "coach_task_created"
  | "product_need_detected"
  | "product_match_shown"
  | "product_match_clicked"
  | "product_match_dismissed"
  | "upgrade_cta_shown"
  | "upgrade_clicked"
  | "recommendation_outcome_logged"
  | "profile_viewed"
  | "proof_action_filed";

/** Whitelist of property keys - anything else is dropped. */
const ALLOWED_KEYS = new Set([
  "parent_artifact_id", "parent_score", "corrected_score", "score_delta", "correction_status", "standard_key",
  "kind", "mode", "state", "score", "streak", "resistance", "depth",
  "result", "reason", "dedup_key", "escalation_level", "count", "fixture",
  "quality", "proof_len", "has_upgrade", "has_hard",
  "step", "route", "ctaName", "source", "destination", "verdictStrength", "challengeState",
  "modelVersion", "confidenceLevel", "loopStatus", "riskKind", "recommendedPath",
  "accuracyBucket", "calibrationStatus", "sectionName",
  "domain", "intensity", "style", "scoreBucket", "responseMode", "proofActionType",
  "accuracy", "bossCompleted", "correct", "difficulty", "suggested", "roundStyle",
  "needSource", "needUrgency", "matchCategory", "monetisationType", "fitScore", "accessLevel", "outcome",
  "panel", "statKey", "taskKind", "evidenceStrength", "verdict", "syncState", "fallback",
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

export async function logEvent(
  event: EngineEvent,
  props: Record<string, unknown> = {},
  userIdOverride?: string | null,
  accessTokenOverride?: string | null,
) {
  try {
    if (userIdOverride && accessTokenOverride) {
      await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessTokenOverride}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify([{
          user_id: userIdOverride,
          event,
          properties: sanitise(props),
          platform: "web",
        }]),
      });
      return;
    }

    const userId = userIdOverride ?? (await supabase.auth.getUser()).data.user?.id ?? null;
    await supabase.from("analytics_events").insert({
      user_id: userId,
      event,
      // Cast to satisfy generated Json typing; content is already sanitised.
      properties: sanitise(props) as unknown as Record<string, never>,
      platform: "web",
    });
  } catch {
    // Never let analytics break user flow.
  }
}

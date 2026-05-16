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
  | "feedback_submitted";

/** Whitelist of property keys — anything else is dropped. */
const ALLOWED_KEYS = new Set([
  "kind", "mode", "state", "score", "streak", "resistance", "depth",
  "result", "reason", "dedup_key", "escalation_level", "count", "fixture",
  "quality", "proof_len", "has_upgrade", "has_hard",
  "step", "route",
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
      // Cast to satisfy generated Json typing — content is already sanitised.
      properties: sanitise(props) as unknown as Record<string, never>,
      platform: "web",
    });
  } catch {
    // Never let analytics break user flow.
  }
}
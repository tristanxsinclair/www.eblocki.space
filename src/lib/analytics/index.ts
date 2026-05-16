import posthog from "posthog-js";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import type { EventName } from "./events";

/**
 * Analytics abstraction.
 *
 * Primary sink: PostHog (set VITE_POSTHOG_KEY + VITE_POSTHOG_HOST in env).
 * Always-on sink: Supabase `analytics_events` table — owned by the user,
 * useful for in-app dashboards and as a backup.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

let initialised = false;
let sessionId: string | null = null;

function ensureSession() {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem("eb_session") || crypto.randomUUID();
    sessionStorage.setItem("eb_session", sessionId);
  } catch {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

export function initAnalytics() {
  if (initialised) return;
  initialised = true;
  ensureSession();

  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      persistence: "localStorage",
      person_profiles: "identified_only",
    });
  } else if (import.meta.env.DEV) {
    console.info("[analytics] PostHog key not set — events will only land in Supabase.");
  }
}

export function identify(userId: string, traits: Record<string, unknown> = {}) {
  if (POSTHOG_KEY) posthog.identify(userId, traits);
}

export function reset() {
  if (POSTHOG_KEY) posthog.reset();
  try { sessionStorage.removeItem("eb_session"); } catch {}
  sessionId = null;
}

export async function track(event: EventName, properties: Record<string, unknown> = {}) {
  const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web";
  const enriched = { ...properties, platform, session_id: ensureSession() };

  if (POSTHOG_KEY) {
    try { posthog.capture(event, enriched); } catch (e) { console.warn("[analytics] posthog", e); }
  }

  // Best-effort persistence to Supabase. Never blocks UI.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    void supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event,
      properties: enriched as never,
      session_id: enriched.session_id,
      platform,
    });
  } catch (e) {
    // swallow
  }
}

export { EVENTS } from "./events";
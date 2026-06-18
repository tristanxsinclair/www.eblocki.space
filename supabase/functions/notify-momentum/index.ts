/**
 * notify-momentum — scheduled scanner that emits behavioural push
 * notifications when (and only when) data justifies it.
 *
 * Designed to be called by pg_cron every 30 minutes. Each invocation:
 *  1. Loads recent momentum snapshots + today's objectives for every user
 *     that has at least one push token registered.
 *  2. Walks a small rule pipeline that emits at most one notification per
 *     user per call.
 *  3. Enforces hard caps: <= 2 notifications/user/day, no duplicate dedup
 *     keys, respects the user's stored timezone window (default UTC).
 *  4. Persists each emission to `notification_log` BEFORE calling
 *     `send-push`, so failures don't trigger spam on retry.
 *
 * Rules are intentionally conservative. No generic motivation, no fake
 * urgency, no streaks-of-streaks puff. Every notification body cites a
 * concrete behavioural signal.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}

// -------------------- helpers --------------------
function localHour(now: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", hour12: false,
    }).formatToParts(now);
    const h = parts.find((p) => p.type === "hour")?.value ?? "0";
    return parseInt(h, 10);
  } catch {
    return now.getUTCHours();
  }
}

function localDateKey(now: Date, tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    });
    return fmt.format(now); // YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

type Notif = { kind: string; title: string; body: string; dedupKey: string };

/**
 * Mirror of src/lib/eblocki/integrity-rules.ts.
 * Keep these constants in sync — they are the contract between product and user.
 */
const INTEGRITY = {
  MAX_NUDGES_PER_DAY: 3,
  MIN_HOURS_BETWEEN_NUDGES: 4,
  DEFAULT_QUIET_START: 22, // hour ≥ this → quiet
  DEFAULT_QUIET_END: 9,    // hour < this → quiet
};

function inQuietHours(hour: number, quietStart: number, quietEnd: number): boolean {
  // Window wraps midnight when start > end (e.g. 22→9).
  return quietStart > quietEnd
    ? (hour >= quietStart || hour < quietEnd)
    : (hour >= quietStart && hour < quietEnd);
}

/**
 * Rule pipeline — first matching rule wins. Each rule must produce a body
 * that references actual state, not generic copy.
 */
function pickNotification(args: {
  hour: number;
  dateKey: string;
  momentum: {
    state: string | null;
    streak_days: number | null;
    proofs_today: number | null;
    avg_quality: number | null;
    freeze_tokens_earned_total: number | null;
    last_proof_at: string | null;
  } | null;
  prevFreezeTotal: number | null;
}): Notif | null {
  const m = args.momentum;
  if (!m) return null;

  const streak = m.streak_days ?? 0;
  const proofsToday = m.proofs_today ?? 0;
  const quality = m.avg_quality ?? 0;

  // Default quiet hours; user prefs may tighten this further upstream.
  if (args.hour < INTEGRITY.DEFAULT_QUIET_END || args.hour >= INTEGRITY.DEFAULT_QUIET_START) return null;

  // Rule 1: streak at risk → fire after 19:00 if no proof today.
  if (m.state === "at_risk" && proofsToday === 0 && streak >= 2 && args.hour >= 19) {
    return {
      kind: "streak_at_risk",
      title: "Momentum is at risk",
      body: `One valid proof artifact preserves your ${streak}-day streak.`,
      dedupKey: `streak_at_risk:${args.dateKey}`,
    };
  }

  // Rule 2: freeze-token milestone earned today (compares to prior total).
  const currentEarned = m.freeze_tokens_earned_total ?? 0;
  const prevEarned = args.prevFreezeTotal ?? 0;
  if (currentEarned > prevEarned) {
    return {
      kind: "freeze_milestone",
      title: "Freeze token earned",
      body: "Consistency is compounding. Defend the pattern with one early proof tomorrow.",
      dedupKey: `freeze_milestone:${args.dateKey}:${currentEarned}`,
    };
  }

  // Rule 3: strong consistency but shallow quality — depth nudge (midday window).
  if (m.state === "momentum" && quality > 0 && quality < 5 && args.hour >= 13 && args.hour < 17) {
    return {
      kind: "depth_nudge",
      title: "Consistency is stable",
      body: `Avg quality ${quality.toFixed(1)}/10. Convert today into one deeper proof.`,
      dedupKey: `depth_nudge:${args.dateKey}`,
    };
  }

  // Rule 4: recovery state — reduce scope, preserve identity (morning window).
  if (m.state === "recovery" && args.hour >= 9 && args.hour < 12) {
    return {
      kind: "recovery",
      title: "Recovery day",
      body: "Reduce scope. One real proof preserves behavioural continuity.",
      dedupKey: `recovery:${args.dateKey}`,
    };
  }

  return null;
}

// -------------------- main --------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Restrict to service-role callers (pg_cron / trusted backends). Without
  // this any unauthenticated caller could trigger the notification pipeline.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const claims = parseJwtClaims(authHeader.slice("Bearer ".length).trim());
  if (claims?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();

  // Candidate set = distinct users with at least one registered push token.
  const { data: tokenUsers, error: tuErr } = await supabase
    .from("push_tokens")
    .select("user_id")
    .eq("is_active", true)
    .limit(5000);
  if (tuErr) {
    return new Response(JSON.stringify({ error: tuErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userIds = Array.from(new Set((tokenUsers ?? []).map((t) => t.user_id))).filter(Boolean);

  const results: Record<string, unknown> = { scanned: userIds.length, sent: 0, skipped: 0 };

  for (const userId of userIds) {
    try {
      // Read timezone, recent two momentum rows (for delta detection), and today's notif count.
      const [tzRes, momRes, logRes] = await Promise.all([
        supabase
          .from("user_onboarding_profiles")
          .select("timezone")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("momentum_state")
          .select("state, streak_days, proofs_today, avg_quality, freeze_tokens_earned_total, last_proof_at, state_date")
          .eq("user_id", userId)
          .order("state_date", { ascending: false })
          .limit(2),
        supabase
          .from("notification_log")
          .select("id, dedup_key, sent_at, last_attempt_at")
          .eq("user_id", userId)
          .gte("sent_at", new Date(now.getTime() - 24 * 3600 * 1000).toISOString()),
      ]);

      const tz = tzRes.data?.timezone ?? "UTC";
      const todayMomentum = momRes.data?.[0] ?? null;
      const yesterdayMomentum = momRes.data?.[1] ?? null;
      const dailyCount = logRes.data?.length ?? 0;
      const existingKeys = new Set((logRes.data ?? []).map((r) => r.dedup_key));

      // Hard cap (integrity-rules.ts): MAX_NUDGES_PER_DAY.
      if (dailyCount >= INTEGRITY.MAX_NUDGES_PER_DAY) { results.skipped = (results.skipped as number) + 1; continue; }

      // Min spacing between nudges.
      const lastSentAt = (logRes.data ?? [])
        .map((r) => new Date((r as any).last_attempt_at ?? r.sent_at).getTime())
        .reduce((max, t) => (Number.isFinite(t) && t > max ? t : max), 0);
      if (lastSentAt) {
        const hoursSince = (now.getTime() - lastSentAt) / 3_600_000;
        if (hoursSince < INTEGRITY.MIN_HOURS_BETWEEN_NUDGES) {
          results.skipped = (results.skipped as number) + 1;
          continue;
        }
      }

      // Pull preferences (may be missing → defaults).
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("notifications_enabled, streak_rescue, depth_nudge, recovery_reminder, milestone, coach_prompt, quiet_hours_start, quiet_hours_end")
        .eq("user_id", userId)
        .maybeSingle();
      if (prefs && prefs.notifications_enabled === false) {
        results.skipped = (results.skipped as number) + 1;
        continue;
      }

      const hour = localHour(now, tz);
      const dateKey = localDateKey(now, tz);

      // User-overridden quiet hours take precedence over defaults.
      const quietStart = prefs?.quiet_hours_start ?? INTEGRITY.DEFAULT_QUIET_START;
      const quietEnd = prefs?.quiet_hours_end ?? INTEGRITY.DEFAULT_QUIET_END;
      if (inQuietHours(hour, quietStart, quietEnd)) {
        results.skipped = (results.skipped as number) + 1;
        continue;
      }

      const notif = pickNotification({
        hour, dateKey,
        momentum: todayMomentum,
        prevFreezeTotal: yesterdayMomentum?.freeze_tokens_earned_total ?? 0,
      });
      if (!notif) { results.skipped = (results.skipped as number) + 1; continue; }
      if (existingKeys.has(notif.dedupKey)) { results.skipped = (results.skipped as number) + 1; continue; }

      // Per-kind preference gate.
      const kindToPref: Record<string, keyof NonNullable<typeof prefs>> = {
        streak_at_risk: "streak_rescue",
        depth_nudge: "depth_nudge",
        recovery: "recovery_reminder",
        freeze_milestone: "milestone",
      };
      const prefKey = kindToPref[notif.kind];
      if (prefs && prefKey && prefs[prefKey] === false) {
        results.skipped = (results.skipped as number) + 1;
        continue;
      }

      // Persist FIRST so a downstream failure doesn't allow respamming.
      const { data: logInsert, error: logErr } = await supabase.from("notification_log").insert({
        user_id: userId,
        kind: notif.kind,
        dedup_key: notif.dedupKey,
        payload: { title: notif.title, body: notif.body, hour, tz },
      }).select("id").maybeSingle();
      if (logErr) {
        // Unique constraint hit means we already logged — treat as dedup skip.
        results.skipped = (results.skipped as number) + 1;
        continue;
      }

      // Fire-and-log via send-push. Errors are tolerated; the log row is the source of truth.
      const pushRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          user_id: userId,
          title: notif.title,
          body: notif.body,
          kind: notif.kind,
          notification_log_id: logInsert?.id,
          data: { kind: notif.kind, dedup_key: notif.dedupKey },
        }),
      });
      let delivered = 0, total = 0;
      try {
        const j = await pushRes.json();
        delivered = j?.delivered ?? 0;
        total = j?.total ?? 0;
      } catch { /* tolerate */ }
      await supabase
        .from("notification_log")
        .update({ delivered, total_targets: total })
        .eq("user_id", userId)
        .eq("dedup_key", notif.dedupKey);

      results.sent = (results.sent as number) + 1;
    } catch (e) {
      console.warn("notify-momentum: user failed", userId, e);
      results.skipped = (results.skipped as number) + 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
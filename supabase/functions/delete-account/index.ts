import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

/**
 * Deletes the calling user and every row they own.
 *
 * Order of operations (WP-004):
 *   1. Cancel any active Stripe subscriptions the user still has (per env)
 *      — a deleted account must never continue to be billed.
 *   2. Purge all `proof-attachments/<uid>/...` storage objects (paginated,
 *      no silent truncation).
 *   3. Delete the auth user. `ON DELETE CASCADE` on every user-scoped
 *      public table drops the rest automatically (proof_artifacts,
 *      proof_commitments, coach_interactions, daily_control_sheets,
 *      performance_os_config, user_modes, user_onboarding_profiles,
 *      user_research_profiles, push_tokens, analytics_events, user_roles,
 *      profiles, subscriptions, custom_systems, system_reps,
 *      momentum_state, xp_events, domain_levels, operator_level,
 *      identity_ledger, court_verdicts, notification_preferences, etc.).
 *
 * Stripe/storage errors are logged but never abort the auth-user delete —
 * the user's right to be deleted takes precedence over cleanup completeness.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "invalid session" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const uid = user.id;

    // 1. Cancel any active Stripe subscription. Grouped per environment
    //    because sandbox and live rows coexist in the same table.
    try {
      const { data: subs, error: subsErr } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status, environment, cancel_at_period_end")
        .eq("user_id", uid)
        .in("status", ["active", "trialing", "past_due"]);
      if (subsErr) {
        console.warn("[delete-account] subscription lookup", subsErr.message);
      } else if (subs && subs.length) {
        for (const row of subs) {
          const subId = row.stripe_subscription_id as string | null;
          const env = row.environment as StripeEnv | null;
          if (!subId || !env) continue;
          // One-time (Founder) purchases have no cancellable subscription.
          if (subId.startsWith("onetime_")) continue;
          if (env !== "sandbox" && env !== "live") continue;
          try {
            const stripe = createStripeClient(env);
            await stripe.subscriptions.cancel(subId);
            console.log(`[delete-account] cancelled ${env} subscription ${subId}`);
          } catch (e) {
            console.warn(
              `[delete-account] stripe cancel failed for ${subId} (${env}):`,
              (e as Error).message,
            );
          }
        }
      }
    } catch (e) {
      console.warn("[delete-account] subscription cancellation phase", (e as Error).message);
    }

    // 2. Purge attachments (paginated so users with >1000 files aren't truncated).
    try {
      const PAGE = 1000;
      // Keep listing from offset 0: once we .remove() the returned page, the
      // next list at offset 0 either returns the next batch or is empty.
      // Bounded to 100 iterations (100k files) as a safety cap.
      for (let i = 0; i < 100; i++) {
        const { data: page, error: listErr } = await admin.storage
          .from("proof-attachments")
          .list(uid, { limit: PAGE, offset: 0 });
        if (listErr) {
          console.warn("[delete-account] storage list", listErr.message);
          break;
        }
        if (!page || page.length === 0) break;
        const paths = page.map((f) => `${uid}/${f.name}`);
        const { error: rmErr } = await admin.storage
          .from("proof-attachments")
          .remove(paths);
        if (rmErr) {
          console.warn("[delete-account] storage remove", rmErr.message);
          break;
        }
        if (page.length < PAGE) break;
      }
    } catch (e) {
      console.warn("[delete-account] storage purge", (e as Error).message);
    }

    // 3. Delete the auth user. Every user-scoped public table has
    //    `ON DELETE CASCADE REFERENCES auth.users(id)`, so this single
    //    call drops profiles, proof_artifacts, proof_commitments,
    //    coach_interactions, daily_control_sheets, performance_os_config,
    //    user_modes, user_onboarding_profiles, user_research_profiles,
    //    push_tokens, analytics_events, user_roles, subscriptions,
    //    custom_systems, system_reps, momentum_state, xp_events,
    //    domain_levels, operator_level, identity_ledger, court_verdicts,
    //    notification_preferences, and any future user-scoped table that
    //    keeps that CASCADE contract. Do NOT reintroduce a manual delete
    //    loop — it will drift as new tables are added.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Deletes the calling user and every row they own.
 * Storage objects under `proof-attachments/<uid>/...` are purged.
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

    // 1. Purge attachments
    try {
      const { data: list } = await admin.storage.from("proof-attachments").list(uid, { limit: 1000 });
      if (list && list.length) {
        await admin.storage
          .from("proof-attachments")
          .remove(list.map((f) => `${uid}/${f.name}`));
      }
    } catch (e) {
      console.warn("[delete-account] storage purge", e);
    }

    // 2. Delete owned rows (RLS-safe: service role bypasses, scope by user_id).
    const tables = [
      "proof_artifacts",
      "proof_commitments",
      "coach_interactions",
      "daily_control_sheets",
      "performance_os_config",
      "user_modes",
      "user_onboarding_profiles",
      "user_research_profiles",
      "push_tokens",
      "analytics_events",
      "user_roles",
      "profiles",
    ];
    for (const t of tables) {
      const key = t === "profiles" ? "id" : "user_id";
      const { error } = await admin.from(t).delete().eq(key, uid);
      if (error) console.warn(`[delete-account] ${t}`, error.message);
    }

    // 3. Delete the auth user
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
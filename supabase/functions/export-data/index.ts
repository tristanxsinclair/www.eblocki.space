import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Returns a JSON archive of every row owned by the caller.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing auth" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) return json({ error: "invalid session" }, 401);

  const tables = [
    "profiles",
    "performance_os_config",
    "user_onboarding_profiles",
    "user_modes",
    "user_research_profiles",
    "daily_control_sheets",
    "proof_artifacts",
    "proof_commitments",
    "coach_interactions",
  ];

  const archive: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
  };

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) {
      archive[t] = { _error: error.message };
      continue;
    }
    // Strip server-controlled AI infrastructure identifiers from the export.
    // These columns may exist historically on performance_os_config rows but
    // are never user-configurable and must not leak to the exported archive.
    if (t === "performance_os_config" && Array.isArray(data)) {
      archive[t] = data.map((row: Record<string, unknown>) => {
        const { model: _m, vector_store_id: _v, ...safe } = row ?? {};
        return safe;
      });
    } else {
      archive[t] = data;
    }
  }

  return new Response(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="eblocki-export-${user.id}.json"`,
    },
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
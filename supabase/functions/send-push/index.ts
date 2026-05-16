import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Sends a push notification to one user's registered devices.
 *
 * MANUAL SETUP REQUIRED before this works in production:
 *   - iOS: APNs key from Apple Developer + bundle id configured in Firebase OR a direct APNs sender.
 *   - Android: Firebase project + FCM server key.
 *   - Add FCM_SERVER_KEY (or service-account JSON) as a Supabase secret.
 *
 * This handler is wired so the rest of the app can call it. Until credentials
 * are added, it short-circuits with a 501 and explains what's missing.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) return json({ error: "user_id and title required" }, 400);

    const fcmKey = Deno.env.get("FCM_SERVER_KEY");
    if (!fcmKey) {
      return json({
        error: "push transport not configured",
        action_required: "Add FCM_SERVER_KEY (Firebase) and/or APNs credentials to Cloud secrets.",
      }, 501);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await admin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);
    if (error) return json({ error: error.message }, 500);
    if (!tokens?.length) return json({ ok: true, delivered: 0 });

    const results = await Promise.allSettled(
      tokens.map((t) =>
        fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${fcmKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: t.token,
            notification: { title, body: body ?? "" },
            data: data ?? {},
          }),
        }),
      ),
    );

    const delivered = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length;
    return json({ ok: true, delivered, total: tokens.length });
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
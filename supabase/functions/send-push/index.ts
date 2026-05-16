import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";

/**
 * send-push — Firebase Cloud Messaging HTTP v1 sender.
 *
 * Requires the FCM_SERVICE_ACCOUNT_JSON secret (the contents of a service
 * account key JSON from Firebase Console → Project Settings → Service
 * Accounts → Generate new private key).
 *
 * Pipeline per request:
 *   1. Honour notification_preferences (notifications_enabled).
 *   2. Resolve active push tokens for the user.
 *   3. Mint a short-lived OAuth access token via signed JWT.
 *   4. POST a message per token to projects/{id}/messages:send.
 *   5. Log every attempt to push_delivery_log; deactivate tokens that come
 *      back as UNREGISTERED / INVALID_ARGUMENT so we never spam dead devices.
 *   6. Mirror final status to notification_log.delivery_status.
 */

type Body = {
  user_id: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
  notification_log_id?: string;
  /** caller-asserted kind ("streak_rescue" etc.) — used to honour per-kind prefs */
  kind?: string;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const pkcs8 = sa.private_key.replace(/\\n/g, "\n");
  const key = await importPKCS8(pkcs8, "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri ?? "https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`oauth token failed: ${res.status} ${text}`);
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const raw = await req.json() as Body;
    if (!raw?.user_id || !raw?.title) return jsonResponse({ error: "user_id and title required" }, 400);

    const saJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!saJson) {
      return jsonResponse({
        error: "push transport not configured",
        action_required: "Add FCM_SERVICE_ACCOUNT_JSON (Firebase HTTP v1) to Cloud secrets.",
      }, 501);
    }
    let sa: ServiceAccount;
    try { sa = JSON.parse(saJson); }
    catch { return jsonResponse({ error: "FCM_SERVICE_ACCOUNT_JSON is not valid JSON" }, 500); }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Honour the user's notification preferences.
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("notifications_enabled, streak_rescue, depth_nudge, recovery_reminder, milestone, coach_prompt")
      .eq("user_id", raw.user_id)
      .maybeSingle();

    if (prefs && prefs.notifications_enabled === false) {
      await admin.from("push_delivery_log").insert({
        user_id: raw.user_id,
        notification_log_id: raw.notification_log_id ?? null,
        status: "disabled",
        failure_reason: "user_disabled_all_notifications",
      });
      if (raw.notification_log_id) {
        await admin.from("notification_log")
          .update({ delivery_status: "disabled", failure_reason: "user_disabled", last_attempt_at: new Date().toISOString() })
          .eq("id", raw.notification_log_id);
      }
      return jsonResponse({ ok: true, delivered: 0, suppressed: "disabled" });
    }

    const kindMap: Record<string, keyof typeof prefs | undefined> = {
      streak_rescue: "streak_rescue",
      depth_nudge: "depth_nudge",
      recovery_reminder: "recovery_reminder",
      milestone: "milestone",
      coach_prompt: "coach_prompt",
    };
    if (raw.kind && prefs && kindMap[raw.kind] && prefs[kindMap[raw.kind]!] === false) {
      await admin.from("push_delivery_log").insert({
        user_id: raw.user_id,
        notification_log_id: raw.notification_log_id ?? null,
        status: "suppressed",
        failure_reason: `kind_disabled:${raw.kind}`,
      });
      if (raw.notification_log_id) {
        await admin.from("notification_log")
          .update({ delivery_status: "suppressed", failure_reason: `kind_disabled:${raw.kind}`, last_attempt_at: new Date().toISOString() })
          .eq("id", raw.notification_log_id);
      }
      return jsonResponse({ ok: true, delivered: 0, suppressed: `kind_disabled:${raw.kind}` });
    }

    // 2. Active tokens.
    const { data: tokens, error: tokensErr } = await admin
      .from("push_tokens")
      .select("id, token, platform")
      .eq("user_id", raw.user_id)
      .eq("is_active", true);
    if (tokensErr) return jsonResponse({ error: tokensErr.message }, 500);
    if (!tokens?.length) {
      if (raw.notification_log_id) {
        await admin.from("notification_log")
          .update({ delivery_status: "no_tokens", last_attempt_at: new Date().toISOString() })
          .eq("id", raw.notification_log_id);
      }
      return jsonResponse({ ok: true, delivered: 0, reason: "no_active_tokens" });
    }

    // 3. OAuth.
    const accessToken = await getAccessToken(sa);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

    // 4. Send + log per token.
    let delivered = 0;
    let failed = 0;
    const nowIso = new Date().toISOString();
    const logRows: any[] = [];
    const tokenDeactivations: string[] = [];
    const tokenSuccesses: string[] = [];

    for (const t of tokens) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title: raw.title, body: raw.body ?? "" },
              data: raw.data ?? {},
            },
          }),
        });
        const text = await res.text();
        if (res.ok) {
          delivered++;
          tokenSuccesses.push(t.id);
          logRows.push({
            user_id: raw.user_id, notification_log_id: raw.notification_log_id ?? null,
            push_token_id: t.id, platform: t.platform, status: "sent",
          });
        } else {
          failed++;
          let reason = `${res.status}`;
          try {
            const errBody = JSON.parse(text);
            const code = errBody?.error?.status ?? errBody?.error?.message ?? `${res.status}`;
            reason = String(code);
            if (code === "UNREGISTERED" || code === "INVALID_ARGUMENT" || code === "NOT_FOUND") {
              tokenDeactivations.push(t.id);
            }
          } catch { /* keep raw */ }
          logRows.push({
            user_id: raw.user_id, notification_log_id: raw.notification_log_id ?? null,
            push_token_id: t.id, platform: t.platform, status: "failed", failure_reason: reason,
          });
        }
      } catch (e) {
        failed++;
        logRows.push({
          user_id: raw.user_id, notification_log_id: raw.notification_log_id ?? null,
          push_token_id: t.id, platform: t.platform, status: "failed",
          failure_reason: `transport: ${(e as Error).message}`,
        });
      }
    }

    if (logRows.length) await admin.from("push_delivery_log").insert(logRows);

    if (tokenDeactivations.length) {
      await admin.from("push_tokens")
        .update({ is_active: false, last_failure_at: nowIso, last_failure_reason: "fcm_rejected" })
        .in("id", tokenDeactivations);
    }
    if (tokenSuccesses.length) {
      await admin.from("push_tokens")
        .update({ last_success_at: nowIso })
        .in("id", tokenSuccesses);
    }

    if (raw.notification_log_id) {
      const status = delivered > 0 ? "delivered" : failed > 0 ? "failed" : "no_tokens";
      await admin.from("notification_log").update({
        delivery_status: status,
        failure_reason: failed > 0 && delivered === 0 ? "all_targets_failed" : null,
        last_attempt_at: nowIso,
        delivered,
      }).eq("id", raw.notification_log_id);
    }

    return jsonResponse({ ok: true, delivered, failed, total: tokens.length });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
## Status of the 14 findings

**Already fixed in the previous build turn** (scanner snapshot is stale — these will clear on next scan):
- `coach_debug_leakage` — raw DB/AI errors removed from coach response
- `coach_no_auth_before_ai` — coach now returns 401 before calling AI
- `ocr_extract_no_auth` — ocr-extract requires authenticated user
- `notify_momentum_no_auth` — restricted to service_role JWT
- `send_push_no_auth` — restricted to service_role JWT

**Verified safe / accepted posture, no code change needed** (will be re-noted in security memory):
- `email_unsubscribe_tokens_public_read` — confirmed: only service_role can SELECT/UPDATE; no client/edge-function code touches this table outside server context.
- `email_send_log_recipient_email_exposure` — confirmed: service_role-only policies; only `process-email-queue` writes to it.
- `suppressed_emails_no_user_access` — service_role-only by design; GDPR self-service is out of scope for beta and would require a new "request my data" flow.
- `SUPA_extension_in_public` — only `pg_net` lives in public, used by pg_cron HTTP calls; moving it risks breaking scheduled jobs. Documented as accepted; revisit post-beta.

## What this plan actually changes

### 1. Migration — tighten RLS, function search paths, and SECURITY DEFINER exposure

One additive migration covering five issues:

**a. `analytics_events` INSERT policy** (`analytics_events_null_user_select`)
Replace the current `((auth.uid() = user_id) OR (user_id IS NULL))` check with one that only allows NULL `user_id` when the caller is also unauthenticated, so logged-in users cannot insert orphaned rows:
```sql
DROP POLICY "analytics insert own" ON public.analytics_events;
CREATE POLICY "analytics insert own"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );
```

**b. `user_roles` defense-in-depth write lock** (`user_roles_no_insert_policy`)
Today there is no INSERT/UPDATE/DELETE policy, so RLS already denies non-service-role writes. Add explicit restrictive policies so the intent is visible in schema and any future permissive policy cannot accidentally open it:
```sql
CREATE POLICY "user_roles no client insert" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "user_roles no client update" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "user_roles no client delete" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);
```

**c. Fixed `search_path` on the remaining SECURITY DEFINER queue helpers** (`SUPA_function_search_path_mutable`)
The four pgmq wrappers lack a pinned search_path. Recreate each with `SET search_path = public, pgmq`:
- `public.enqueue_email(text, jsonb)`
- `public.read_email_batch(text, int, int)`
- `public.delete_email(text, bigint)`
- `public.move_to_dlq(text, text, bigint, jsonb)`

Bodies stay identical; only the function signature gains `SET search_path = public, pgmq` and we re-declare `SECURITY DEFINER`.

**d. Revoke public EXECUTE on SECURITY DEFINER functions that must never be called from the client** (`SUPA_anon_security_definer_function_executable`, `SUPA_authenticated_security_definer_function_executable`)
These are trigger-only or service-role-only and have no business being callable via PostgREST:
```sql
REVOKE EXECUTE ON FUNCTION public.cle_after_proof_insert()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, int, int)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
```
`public.has_role(uuid, app_role)` keeps EXECUTE for `authenticated` — RLS policies that call it must be able to execute it.

### 2. Update security memory

Re-state which warnings are intentionally accepted (pg_net in public, email PII tables service_role-only, has_role exposed to authenticated) so future scans don't re-flag them as actionable.

### 3. Verification after migration runs

- `npm run test` (expect 174/174).
- Spot-check via `supabase--read_query` that the new policies and `proconfig` values exist.
- Mark all addressable findings via `manage_security_finding`.

## Technical notes

- No app/UI code changes. All edits live in one Supabase migration plus the security memory.
- The migration is additive and reversible; no data is touched.
- `pg_net` is left in `public` deliberately — moving it requires updating every `cron.schedule` call site and risks breaking notify-momentum/email cron.
- The 5 agent_security edge-function findings are already fixed in code; this plan does not re-touch those functions.

## Out of scope

- GDPR self-service for `suppressed_emails`.
- Moving `pg_net` out of the public schema.
- Repo-wide lint cleanup.

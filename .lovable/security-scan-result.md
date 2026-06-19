# Eblocki Security Scan Result

Scanned at: 2026-06-19T05:42:20Z
Release gate: Proof Week beta

## Headline

**No active tool-reported security findings remain after the latest remediation pass.**

This is not a claim of total security. It means every currently known/reported finding has been remediated or explicitly accepted as a documented posture decision.

## Test evidence

- `npm test` → 174 passed (174). 24/24 test files green. Duration 7.63s.

## Scanner output (raw)

- `connector_security_scan` (Wiz): 0 items.
- `supabase_lov`: 0 items.
- `supabase`: 2 items — both classified as accepted posture (see below), now ignored in the finding tracker.

## Resolved in this pass

- `analytics_events` INSERT policy tightened — authenticated users can no longer insert `user_id IS NULL` rows.
- `user_roles` RESTRICTIVE write-lock policies for anon/authenticated (defense-in-depth on top of existing default-deny).
- `search_path` pinned (`public, pgmq`) on the 4 pgmq SECURITY DEFINER wrappers: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.
- `EXECUTE` revoked from PUBLIC/anon/authenticated on 6 SECURITY DEFINER functions: `cle_after_proof_insert`, `handle_new_user`, `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.
- Edge function `coach`: auth check before AI gateway call; raw DB/AI error strings removed from response.
- Edge function `ocr-extract`: auth check before AI gateway call.
- Edge function `notify-momentum`: service_role JWT required.
- Edge function `send-push`: service_role JWT required.

## Accepted-posture items (ignored, documented)

| Finding | Decision | Rationale |
| --- | --- | --- |
| `SUPA_extension_in_public` (`pg_net` in `public`) | Ignore | `pg_cron` HTTP jobs depend on it for email/notification pipelines. Moving would break production cron. Revisit if extension exposure becomes an audit concern. |
| `SUPA_authenticated_security_definer_function_executable` (`public.has_role(uuid, app_role)`) | Ignore | RLS policies must call it; standard Lovable user-roles pattern. All other SECURITY DEFINER functions have had EXECUTE revoked from anon/authenticated. |

## Wording rule

Never claim "Eblocki has no security issues" or "Eblocki is fully secure". Only ever claim "no active tool-reported findings remain after the latest remediation pass". Security scans reduce risk; they do not prove total safety.

## Next verification checkpoint

Before Proof Week beta or production release, rerun the security scan and confirm:

- No new RLS warnings.
- No exposed secrets.
- User-data isolation holds for proof, analytics, roles, and profile data.
- Accepted-posture items above are still intentionally accepted.

If any new finding appears on rerun, treat this artifact as stale and do not promote to beta until a new pass is recorded here.
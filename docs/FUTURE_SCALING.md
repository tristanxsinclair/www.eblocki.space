# Future Scaling Plan

This is not a roadmap of features that exist today — it's the
architectural seams that have been left open so each system can be added
without a rewrite.

## Subscriptions / premium tiers

- `profiles` table is the place to add a `tier` enum column
  (`free | pro | elite`). Don't store entitlement on the auth user.
- Use the Stripe (web) + StoreKit 2 (iOS) + Play Billing (Android)
  combination. RevenueCat is the recommended abstraction if you don't
  want to maintain three IAP code paths.
- Server source of truth: a `subscriptions` table with `(user_id, tier,
  provider, current_period_end, status)`. Provider webhooks update it.
- Gate features in `src/lib/entitlements.ts` (does not exist yet — add
  with single `useEntitlement('pro_modes')` hook).

## AI coaching upgrades

- Today: stateless prompt per turn, model picked per user in
  `performance_os_config.model`.
- Next: per-user vector store (`performance_os_config.vector_store_id`
  already exists) — chunk past proofs, embed once, retrieve at coach
  turn. Add an `embeddings_jobs` table + edge function worker.
- Long memory: a `coach_memory` table with `(user_id, kind, summary,
  embedding, decayed_weight)`.

## Teams / accountability circles

- Add `organisations` + `org_members` tables.
- Add `org_id` (nullable) to `proof_artifacts`, `daily_control_sheets`,
  `proof_commitments`.
- Extend RLS: row visible if owner OR (org_id IS NOT NULL AND user is
  org member with role >= viewer).
- Never reuse the existing `user_roles` table — that's app-level admin,
  not org-level.

## Mentor dashboards

- Read-only view over an `org_members` mentor role.
- Aggregations should be materialised, not computed at read time. Use
  Postgres `MATERIALIZED VIEW` refreshed nightly + on commit.

## Advanced analytics

- `analytics_events` is already RLS-protected and indexed on
  `(user_id, event, created_at desc)`.
- Build a `daily_user_aggregates` materialised view for cohort math.
- For session replay, enable PostHog session recording behind a feature
  flag — not by default (privacy + bandwidth).

## Wearable integrations

- HealthKit (iOS): use `@capacitor-community/health` — read steps, sleep,
  HRV.
- Health Connect (Android): same plugin.
- Map signals to `behavioural_states` — low HRV + missed sleep → bias
  toward `low_energy` / `recovery` detection.

## Push notifications

- Infrastructure is wired (`push_tokens` table + `send-push` edge
  function). To activate:
  1. Create a Firebase project, add iOS + Android apps.
  2. Upload APNs key in Firebase → Cloud Messaging.
  3. Add `FCM_SERVER_KEY` (or service account JSON) to Cloud secrets.
  4. Schedule sends from a cron edge function — e.g. "streak at risk"
     at 18:00 local for users with no proof today.

## Calendar integrations

- Google Calendar + Apple Calendar via web OAuth → store `(user_id,
  provider, access_token, refresh_token)` in `calendar_connections`
  table (encrypt at rest).
- Pull events daily into `external_events`; feed into Coach prompt as
  context.

## Gamification

- Already partially modelled — `streak`, `momentum`. Future:
  `achievements` table with deterministic unlock rules, surfaced in
  Dashboard.

## Desktop app

- Wrap the same web bundle in Tauri (preferred over Electron — 10MB vs
  120MB binary). No code changes required; reuse the Capacitor-style
  bootstrap.

## Multi-tenant / SaaS

- The current schema is single-tenant per user. Org support (above) is
  the path to multi-tenant. Do NOT introduce a `tenant_id` column
  shotgunned across tables — use the org pattern.
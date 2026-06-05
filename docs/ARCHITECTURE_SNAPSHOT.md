# Eblocki — Architecture Snapshot

_Last updated: 2026-06-05. Update whenever a route, table, or major module changes._

## Stack

- React 18, Vite 5, TypeScript 5
- React Router v6 (client-side only)
- Tailwind v3 + shadcn/ui, semantic tokens in `src/index.css` + `tailwind.config.ts`
- TanStack Query
- Supabase: Postgres + Auth + Edge Functions (Deno) + Storage
- PostHog / privacy-safe analytics helpers if already wired
- Capacitor (`capacitor.config.ts`) for iOS/Android wrappers
- Vitest for unit tests (`src/test/`, `src/lib/eblocki/__tests__/`)

## Top-level Routes (`src/App.tsx`)

Public: `/`, `/auth`, `/install`, `/why`, `/legal/*`
Protected (`<Protected>` wrapper, requires Supabase session):
`/onboarding`, `/welcome`, `/dashboard`, `/operator`, `/gameforge`, `/coach`,
`/sheet`, `/start`, `/start-today`, `/proof`, `/modes`, `/modes/:modeId`, `/settings`,
`/dev/engine`, `/dev/beta`.

## Supabase

### Edge Functions (`supabase/functions/`)
- `coach` — AI coaching (Lovable AI Gateway)
- `delete-account`, `export-data` — user data lifecycle
- `notify-momentum`, `send-push` — push/notify
- `ocr-extract` — proof attachment OCR
- `process-email-queue` — pgmq email worker (auth + transactional)

### Storage Buckets
- `proof-attachments` (private)

### Core Tables (non-exhaustive)
- `profiles`, `user_roles` (with `app_role` enum + `has_role` SECURITY DEFINER)
- `proof_artifacts` — user-submitted proof (CLE trigger fires on insert), includes nullable `temporal_snapshot` JSONB
- `xp_events` — XP ledger per proof
- `court_verdicts` — Court of Evidence verdict per proof
- `identity_ledger` — narrative event log
- `operator_level`, `domain_levels` — level/rank state
- `momentum_state` — daily streak + state
- `performance_os_config` — per-user OS config
- email infra: `email_send_log`, `email_send_state` + pgmq queues

### Key DB Functions (see `cle_*`)
`cle_after_proof_insert` (trigger), `cle_classify_tier`, `cle_court`,
`cle_base_xp`, `cle_verdict_mult`, `cle_streak_mult`, `cle_rank_for`,
`cle_operator_title`, `cle_canon_domain`, `cle_level_threshold`,
`has_role`, `handle_new_user`.

## Eblocki Behavioural Systems

- **Proof loop** — `src/pages/Proof.tsx` → `proof_artifacts` insert → DB trigger writes `xp_events`, `court_verdicts`, `identity_ledger`, updates `operator_level` + `domain_levels`. Temporal snapshot persistence is secondary and best-effort.
- **Temporal loop** — `temporal-engine.ts` → `temporal-snapshot.ts` → later proof → `temporal-calibration.ts` → `intervention-memory.ts` → `temporal-intelligence-score.ts` → dashboard command.
- **Temporal audit** — `temporal-loop-audit.ts` + `TemporalModelAuditPanel.tsx` expose `inactive | partial | operational | degraded` status.
- **Court of Evidence** — `src/components/eblocki/CourtVerdictBadge.tsx`, verdict surfaces on `/proof`, `/operator`, and dashboard evidence summaries.
- **Identity ledger / prestige** — `src/components/eblocki/IdentityLedger.tsx`.
- **Pressure + State engine** — `src/lib/eblocki/states.ts`, `InterventionCard.tsx`.
- **Level engine** — `src/lib/eblocki/level-engine.ts` (mirrors `cle_level_threshold`).
- **GameForge** — `src/lib/gameforge/*` + `src/components/gameforge/GameForgeShell.tsx`, page `/gameforge`.
- **Coach** — `supabase/functions/coach` + `src/pages/Coach.tsx`.

## Dashboard Command Centre

`src/pages/Dashboard.tsx` is organised into progressive-disclosure zones:

- Zone 1: `Command` — one primary hero card with next action, proof required, and highest risk.
- Zone 2: `Forecast` — TemporalMap, calibration feedback, intelligence score, model audit behind tabs.
- Zone 3: `Evidence` — proof/court/identity summaries plus weekly/momentum detail collapsed by default.

`src/lib/eblocki/dashboard-view-model.ts` shapes raw Supabase/app data into safe dashboard summaries for new users, legacy proof rows, missing snapshots, missing Court data, and failed queries.

## Temporal Snapshot Safety

All snapshot reads/writes must pass through `src/lib/eblocki/temporal-snapshot.ts`. Generated Supabase types are not hand-edited. The helper validates runtime shape, normalises legacy data, strips sensitive fields, and keeps output JSONB-safe.

## Mobile / Capacitor

`capacitor.config.ts` present. Push registration in `src/hooks/usePushRegistration.ts`, native helpers in `src/lib/mobile/native.ts`. Build with `npm run build` then `npx cap sync`.

## Files That Must Not Be Hand-edited

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- existing files under `supabase/migrations/` (add a new timestamped file instead)

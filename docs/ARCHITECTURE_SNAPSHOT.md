# Eblocki — Architecture Snapshot

_Last updated: 2026-06-04. Update whenever a route, table, or major module changes._

## Stack

- React 18, Vite 5, TypeScript 5
- React Router v6 (client-side only)
- Tailwind v3 + shadcn/ui, semantic tokens in `src/index.css` + `tailwind.config.ts`
- TanStack Query
- Supabase: Postgres + Auth + Edge Functions (Deno) + Storage
- PostHog analytics (`src/lib/analytics/`)
- Capacitor (`capacitor.config.ts`) for iOS/Android wrappers
- Vitest for unit tests (`src/test/`, `src/lib/eblocki/__tests__/`)

## Top-level routes (`src/App.tsx`)

Public: `/`, `/auth`, `/install`, `/why`, `/legal/*`
Protected (`<Protected>` wrapper, requires Supabase session):
`/onboarding`, `/welcome`, `/dashboard`, `/operator`, `/gameforge`, `/coach`,
`/sheet`, `/start`, `/proof`, `/modes`, `/modes/:modeId`, `/settings`,
`/dev/engine`, `/dev/beta`.

## Supabase

### Edge functions (`supabase/functions/`)
- `coach` — AI coaching (Lovable AI Gateway)
- `delete-account`, `export-data` — user data lifecycle
- `notify-momentum`, `send-push` — push/notify
- `ocr-extract` — proof attachment OCR
- `process-email-queue` — pgmq email worker (auth + transactional)

### Storage buckets
- `proof-attachments` (private)

### Core tables (non-exhaustive)
- `profiles`, `user_roles` (with `app_role` enum + `has_role` SECURITY DEFINER)
- `proof_artifacts` — user-submitted proof (CLE trigger fires on insert)
- `xp_events` — XP ledger per proof
- `court_verdicts` — Court of Evidence verdict per proof
- `identity_ledger` — narrative event log
- `operator_level`, `domain_levels` — level/rank state
- `momentum_state` — daily streak + state
- `performance_os_config` — per-user OS config
- email infra: `email_send_log`, `email_send_state` + pgmq queues

### Key DB functions (see `cle_*`)
`cle_after_proof_insert` (trigger), `cle_classify_tier`, `cle_court`,
`cle_base_xp`, `cle_verdict_mult`, `cle_streak_mult`, `cle_rank_for`,
`cle_operator_title`, `cle_canon_domain`, `cle_level_threshold`,
`has_role`, `handle_new_user`.

## Eblocki behavioural systems

- **Proof loop** — `src/components/eblocki/ProofCapture.tsx`, `src/pages/Proof.tsx` → `proof_artifacts` insert → DB trigger writes `xp_events`, `court_verdicts`, `identity_ledger`, updates `operator_level` + `domain_levels`.
- **Court of Evidence** — `src/components/eblocki/CourtVerdictBadge.tsx`, verdict feed on `/operator`.
- **Identity ledger / prestige** — `src/components/eblocki/IdentityLedger.tsx`.
- **Pressure + State engine** — `src/lib/eblocki/states.ts`, `InterventionCard.tsx`.
- **Level engine** — `src/lib/eblocki/level-engine.ts` (mirrors `cle_level_threshold`).
- **GameForge** — `src/lib/gameforge/*` (types, packGenerator, gameEngine, scoring, mistakes, adaptiveRules, modeProfiles, packValidator, proofArtifact) + `src/components/gameforge/GameForgeShell.tsx`, page `src/pages/GameForge.tsx`.
- **Coach** — `supabase/functions/coach` + `src/pages/Coach.tsx`.

## Mobile / Capacitor

`capacitor.config.ts` present. Push registration in `src/hooks/usePushRegistration.ts`, native helpers in `src/lib/mobile/native.ts`. Build with `npm run build` then `npx cap sync`.

## Files that must not be hand-edited

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- existing files under `supabase/migrations/` (add a new timestamped file instead)
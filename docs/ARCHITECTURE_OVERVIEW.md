# Architecture Overview

## Stack

- React 18 + Vite 5 + TypeScript 5
- Tailwind v3 + shadcn/ui (Radix)
- React Router 6 (BrowserRouter)
- Supabase (Postgres + RLS + Auth + Storage + Edge Functions) via Lovable Cloud
- Lovable AI Gateway (Gemini + GPT-5 family) for coach + verdict + OCR
- Capacitor 6 for iOS / Android native shells
- PostHog for product analytics

## Why Capacitor (not React Native / Expo)

The product is React-DOM and uses ~50 shadcn components, framer-motion,
react-helmet-async, etc. Migrating to React Native would be a
full rewrite of the UI layer. Capacitor preserves the entire web codebase
(one source of truth for web + mobile), is acceptable for App Store review,
and gives native access to push / haptics / file system through plugins.

## Folders

```
src/
  pages/                       route components
    legal/                     Privacy, Terms, Data, AI disclosure
  components/
    eblocki/                   product-specific composites (AppShell, ProofContractCard…)
    ui/                        shadcn primitives
  hooks/                       useAuth, useHaptics, usePushRegistration
  lib/
    eblocki/                   behavioural engine (states, modes, proof scoring)
    mobile/                    Capacitor bootstrap + native helpers
    analytics/                 provider-agnostic analytics layer
  integrations/supabase/       auto-generated client + types (do not edit)

supabase/
  functions/
    coach/                     coach LLM call
    ocr-extract/               OCR for proof attachments
    delete-account/            account purge
    export-data/               JSON archive
    send-push/                 FCM/APNs sender (stub until creds added)
  migrations/                  declarative schema

docs/                          this folder
```

## Behavioural engine (the IP)

Lives in `src/lib/eblocki/`. Pure functions, fully unit-testable, never
touch the network. The mobile shell, analytics, push, and legal layers
wrap it without modifying it — this was an explicit design constraint
from the Round 1 brief.

- `states.ts` — 10 behavioural states + detector.
- `modes.ts` + `default-modes.ts` — mode catalogue.
- `proof-scoring.ts` — verdict heuristics.
- `proof-contract.ts` — commitment lifecycle.
- `coach-response.ts` — system-prompt assembly.

## Data model (Postgres)

All user-owned tables enforce RLS with the pattern
`(auth.uid() = user_id)`. Owner-only reads and writes. No role table
except `user_roles` + the `has_role()` security-definer function.

New in Round 1:

- `push_tokens` — one row per (user_id, device_token).
- `analytics_events` — append-only event log, user-scoped.

## Auth

Supabase Auth, email/password + (recommended next) Google + Apple Sign In.
`AuthProvider` (`src/hooks/useAuth.tsx`) wires the listener and identifies
the user in PostHog on every session change.

## Native shell lifecycle

`src/main.tsx` → `bootstrapNative()` (`src/lib/mobile/native.ts`) →
sets status bar, hides splash, wires keyboard listeners, app
resume/pause/back-button, and deep links. All operations are no-ops on
web.

## Analytics flow

`track(EVENTS.x, { … })` fans out to:

1. PostHog (if `VITE_POSTHOG_KEY` is set).
2. Supabase `analytics_events` table (always, RLS-owned by user).

Identity is set on auth changes via `identify(userId)` and cleared on
sign-out. See `ANALYTICS_SYSTEM.md` for the full event taxonomy.

## Push notifications

`usePushRegistration` (called from `AppShell`) requests permission on
first authenticated session, registers with APNs/FCM, and upserts the
token into `push_tokens`. The `send-push` edge function reads from that
table and POSTs to FCM. It returns 501 until you add `FCM_SERVER_KEY` to
Cloud secrets.

## Routing & deep links

`BrowserRouter` everywhere. On Android hardware back, we fall back to
`history.back()` and exit if at root. iOS swipe-back is native and not
touched.

## Styling & theming

All colours are HSL semantic tokens in `src/index.css`. Components never
hardcode colours. The dark theme is the canonical theme; there is no
light-mode toggle (deliberate — operator/command-center identity).
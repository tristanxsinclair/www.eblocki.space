# Phase 7.5 v1.5 Activation Proof

Real activation evidence for the v1.5 first-user spine.

Date: 2026-07-03  
Workspace: `/Users/tristansinclair/Desktop/www.eblocki.space`

## Beta status

Eblocki v1.5 activation is ready for a 5–10 person Proof Week beta with minor risks. The first-user activation spine has been live-verified with a confirmed account and real proof submission. Remaining risk is limited to day-2 analytics live confirmation, backend-failure-path testing, and two pre-existing hook dependency warnings.

## BLUF

Accepted strong. Status: Ready for 5–10 person Proof Week beta with minor risks.

## What was verified live

- Landing -> Auth -> intended route preservation.
- Welcome -> Dashboard zero state.
- `/proof?first=1` minimal first-proof flow.
- Real account creation with email confirmation.
- Real first-proof submission.
- Real verdict rendered.
- Verdict CTA returned to `/dashboard`.
- Signed-in direct dashboard access.
- Mobile layouts at `375x812`, `390x844`, `768x1024`, `1024x768`, and desktop `1280x900`.

## Release gate verdict

Known:

- `npm test`: PASS, 252 tests.
- `npm run build`: PASS.
- Route smoke: PASS for `/`, `/auth`, `/welcome`, `/dashboard`, `/proof`, `/proof?first=1`, `/proof-week`, `/start-today`.
- Live QA: PASS for landing -> auth -> first proof -> verdict -> dashboard.
- Analytics: 8/9 activation events live-observed.
- Privacy: no raw proof text stored in analytics payloads.
- Mobile: no horizontal overflow across tested sizes.

Assumed:

- The real QA account and proof row remain available as release evidence.
- The regression fixes did not create edge-case issues for older users with partial onboarding/proof history.

Needs verification:

- `activation_day_2_return_seen` live event.
- Backend rejection/failure path for Supabase insert failure.
- The two existing `react-hooks/exhaustive-deps` warnings remain non-blocking.

## Route smoke

Preview route smoke returned `200` for:

- `/`
- `/auth`
- `/welcome`
- `/dashboard`
- `/proof`
- `/proof?first=1`
- `/proof-week`
- `/start-today`

## Auth behaviour

- Signed-out landing CTA reached `/auth`.
- Signed-out `/proof?first=1` returned to `/proof?first=1` after confirmation + sign-in.
- Signed-out `/proof-week` returned to `/proof-week` after sign-in.
- Signed-in user reached `/dashboard` directly.

## First-proof behaviour

- `/proof?first=1` showed simplified first-proof UI.
- First-proof copy matched `FIRST_PROOF_COPY`.
- No advanced terminology appeared in the verified first-proof surface.
- The "What counts?" path was visible.
- Empty submission was blocked honestly until required fields were present.
- Real submission succeeded and rendered a verdict.
- Verdict CTA returned to `/dashboard`.

## Dashboard return

- Zero-state showed one primary action and one supporting action.
- After first proof, dashboard acknowledged the proof and showed one next command.
- Advanced diagnostics were not forced before first proof.

## Analytics observed

Live-observed in `analytics_events`:

- `activation_landing_primary_cta_clicked`
- `activation_auth_completed`
- `activation_dashboard_zero_state_seen`
- `activation_first_proof_entered`
- `activation_first_proof_submitted`
- `activation_verdict_shown`
- `activation_verdict_cta_clicked`
- `activation_proof_week_join_clicked`

Not yet live-observed:

- `activation_day_2_return_seen`

Privacy check:

- No raw proof text was present in analytics payloads.

## Commands run

- `npm test`
- `npm run build`
- `npx eslint src/lib/eblocki/analytics.ts src/pages/Auth.tsx src/pages/Landing.tsx src/pages/Dashboard.tsx src/pages/Proof.tsx src/pages/ProofWeek.tsx scripts/route-smoke.mjs`
- `ROUTE_SMOKE_BASE_URL=http://127.0.0.1:4173 npm run smoke:routes`
- Live browser verification against `http://127.0.0.1:8080`

## Non-blocking warnings

Targeted lint still reports two pre-existing warnings in `src/pages/Proof.tsx`:

- line 264: missing `reload` dependency
- line 321: missing `artifactType`, `selectedModeId`, and `title` dependencies

## Next action

1. Run next-day return or safely seed older proof to confirm `activation_day_2_return_seen`.
2. Keep the hook warnings documented unless they become behavioural.
3. Start the 5–10 tester Proof Week beta.

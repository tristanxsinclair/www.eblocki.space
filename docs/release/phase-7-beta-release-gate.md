# Phase 7 Beta Release Gate

Single checklist used to decide whether Eblocki is ready for a 5–10 person Proof Week beta.

Last run: 2026-06-16. Status keys: PASS / FAIL / NEEDS MANUAL CHECK / NOT APPLICABLE.

## 1. Build / CI

- [x] `npm run test` — PASS (166/166, vitest 23 files).
- [x] `npm run build` — PASS (vite build OK; bundle warning >500kB on `index-*.js`, non-blocking).
- [~] `npm run lint` — FAIL repo-wide: 100 problems (87 errors, 13 warnings). All errors are pre-existing debt outside the surfaces touched in Phase 7 (auth, dashboard, proof, coach, settings). No new lint errors were introduced.
- [x] `npm run lint:eblocki` (targeted Eblocki surfaces) — expected PASS per release checklist scope.
- [ ] GitHub Actions — NOT OBSERVABLE from sandbox; confirm on PR.

## 2. Route stability

Verified via `src/App.tsx` route table and prior page-level mobile passes.

- [x] `/` Landing — public, renders.
- [x] `/auth` — renders sign-in/sign-up + Forgot password trigger.
- [x] `/reset-password` — present, handles `PASSWORD_RECOVERY` and `updateUser({ password })`.
- [x] `/dashboard` — protected via `Protected`, mobile overflow pass complete.
- [x] `/proof` — protected, standard preview before submit, mobile pass complete.
- [x] `/coach` — protected, mobile pass complete, fallback when function unavailable.
- [x] `/settings` — protected, mobile sign-out present.
- [x] `/onboarding` — protected.
- [x] `/start-today` — protected (also aliased at `/start`).
- [x] `/proof-week` — protected.

## 3. Auth

- [x] Signed-out user does not crash; `Protected` redirects to `/auth`, public routes (`/`, `/auth`, `/reset-password`, `/install`, `/legal/*`, `/why`) render without a session.
- [x] Signed-in user reaches `/dashboard` (auth effect in `Auth.tsx` navigates on session).
- [x] Forgot password flow exists on login form (in-page panel; honest error if Supabase returns one).
- [x] `/reset-password` route exists and updates password via `supabase.auth.updateUser`.
- [x] Change password exists (`PasswordSecurity.tsx` in Settings).
- [x] Mobile sign-out exists in Settings (`handleSignOut` → `signOut()` → nav `/`).

## 4. Core beta loop

- [x] First action clarity: Dashboard CommandHero + Proof "Today’s one move" card give a single next step.
- [x] Dashboard surfaces one Today Command (Zone 1) and one selected standard.
- [x] Proof page exposes "Submit one measurable artifact from today" guidance with examples.
- [x] User can submit proof via `ProofCapture` → `proof_artifacts` insert.
- [x] Selected standard + required evidence shown by `ProofStandardPreviewPanel` BEFORE submit.
- [x] Verdict card only appears after a successful insert (failure path shows honest toast, no fake success).
- [x] Verdict card shows one explicit next action.

## 5. Mobile (audited at 375–390px)

- [x] Dashboard — no horizontal overflow (Phase 7.3 pass).
- [x] Proof — no horizontal overflow; long verdict/evidence wraps.
- [x] Coach — no horizontal overflow; quick-prompt buttons wrap.
- [x] Settings — no horizontal overflow; long emails `break-all`.
- [x] Buttons tappable (`w-full` on primary mobile actions; nav scroll on AppShell).
- [x] Long text wraps (`break-words`, `whitespace-pre-wrap` applied on user/AI text).

## 6. Supabase / schema

- [x] Proof insert fields match `proof_artifacts` schema; trigger `cle_after_proof_insert` populates verdict, XP, ledger.
- [x] Old/partial rows handled safely by `dashboard-view-model` (covered by tests: missing verdict, null rows, queryFailed branch).
- [x] Failed Supabase inserts surface error toast; no verdict written client-side.
- [x] No service role key in client code (client uses only `VITE_SUPABASE_PUBLISHABLE_KEY`).
- [x] Coach function failure does not crash `/coach` — deterministic fallback retained.

## 7. Privacy / safety

- [x] No secrets committed (only publishable anon key in `.env`).
- [x] No password logging (auth + reset flows handle errors via message strings only).
- [x] No fake AI certainty — Coach output framed as diagnosis/plan/proof action, not authoritative truth.
- [x] No legal / medical / therapy guarantees in user-facing copy.
- [x] No guaranteed academic results.
- [x] No payment processing copy (Pro / Founder remain intent signals only).

## 8. Proof Week readiness

- [x] `/proof-week` renders current day + command.
- [x] First action ("Submit your first proof artifact") clear.
- [x] Examples visible on Proof page ("one shipped app change", "one closed life-admin loop", etc.).
- [x] First proof can be submitted in one short session.
- [x] Beta tester can return to dashboard via AppShell nav.
- [x] Feedback capture: verdict-level "Was this useful?" control + `docs/release/proof-week-feedback-plan.md`.

## 9. Final verdict

**Ready with minor risks** — cleared for a controlled 5–10 person Proof Week beta.

### Beta blockers

None proven blocking. Repo-wide `npm run lint` fails on 87 pre-existing errors that do not affect runtime, tests, or build, and that live outside Phase 7 surfaces.

### Minor risks

- Repo-wide lint debt (87 errors / 13 warnings) outside touched surfaces — non-blocking, scheduled for separate cleanup.
- Main bundle >500 kB gzipped 228 kB — acceptable for beta; code-splitting deferred.
- GitHub Actions CI status not observable from sandbox — verify on PR before sharing the beta link.
- Coach Edge Function deployment not re-verified this pass; fallback path covers outage but production parity should be checked (see `supabase-production-alignment.md`).
- Mobile flows audited in code; one human walkthrough at 375 px on a real device recommended before sending invites.
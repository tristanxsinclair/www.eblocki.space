# Phase 7 Beta Release Gate

Single checklist used to decide whether Eblocki is ready for a 5–10 person Proof Week beta.

Status keys: PASS / FAIL / NEEDS MANUAL CHECK / NOT APPLICABLE.

## Build / CI

- [ ] `npm run test` PASS
- [ ] `npm run build` PASS (executed by Lovable harness)
- [ ] `npm run lint:eblocki` PASS
- [ ] GitHub Actions: NOT OBSERVABLE from sandbox — verify in the repo PR after push.

## Route stability

Signed-out and signed-in.

- [ ] `/` Landing — PASS
- [ ] `/auth` — NEEDS MANUAL CHECK
- [ ] `/proof-week` (new) — protected, redirects to `/auth` when signed out
- [ ] `/dashboard` — protected
- [ ] `/proof` — protected
- [ ] `/coach` — protected
- [ ] `/operator` — protected
- [ ] `/gameforge` — protected
- [ ] `/onboarding` — protected
- [ ] `/start-today` — protected

## Auth

- [ ] Signed-out user does not crash any public route.
- [ ] New user is routed to `/welcome` then `/onboarding`.
- [ ] Returning user lands on `/dashboard`.

## Proof flow (`/proof`)

- [ ] Selecting domain/artifact type shows `ProofStandardPreviewPanel` BEFORE submit.
- [ ] Required evidence is listed.
- [ ] Elite version is shown.
- [ ] Contract alignment status is shown (aligned / fallback / no contract).
- [ ] Identity escalation rule is shown.
- [ ] Supabase insert success: honest toast + verdict card.
- [ ] Supabase insert failure: honest error toast — no fake success.
- [ ] Verdict uses the correct standard for the chosen domain (covered by `proof-standard-preview` tests).
- [ ] Verdict card shows one explicit next action.
- [ ] "Was this judgment useful?" control writes a `verdict_feedback` row.

## Dashboard (`/dashboard`)

- [ ] One Today Command (Zone 1 CommandHero).
- [ ] One Proof Contract / Selected Standard / Required Evidence (via `dashboard-view-model.commandLayer`).
- [ ] Latest Court Signal visible.
- [ ] Empty state: "No proof yet. Submit one measurable artifact to activate the command layer."
- [ ] No crash for: signed-out (handled by `Protected`), missing profile, no proof, legacy/null rows, missing verdict, missing identity ledger, failed Supabase query (`queryFailed` branch).

## Supabase

- [ ] No new migrations required for Phase 7 (verified — `interest_signals` already accepts free-text `signal_type`).
- [ ] No service role key in client code.
- [ ] Coach function deployment: NOT EXECUTED in this pass — see `supabase-production-alignment.md`.

## Mobile (target 375px width)

- [ ] Dashboard usable — NEEDS MANUAL CHECK on real device.
- [ ] Proof form usable — NEEDS MANUAL CHECK.
- [ ] Proof Week page usable — NEEDS MANUAL CHECK.
- [ ] No horizontal overflow on primary surfaces.

## Privacy / safety

- [ ] No secrets committed.
- [ ] No therapy / medical / legal / guaranteed-grade claims in user-facing copy.
- [ ] No payment processing copy (Pro / Founder are intent-only signals).

## Proof Week readiness

- [ ] `/proof-week` page renders with current day, command, what counts / what doesn't.
- [ ] Day 1 command: "Submit your first proof artifact."
- [ ] Feedback capture path: verdict-level control + `docs/release/proof-week-feedback-plan.md` template.
- [ ] Beta tester can complete: land → understand → join → submit proof → see verdict → know next action.

## Final verdict

Recorded after each gate run. Default: NEEDS MANUAL CHECK until a human walks the full flow.

## Blockers

List only items proven blocked by code or by a failed run. Hypothetical issues do not belong here.
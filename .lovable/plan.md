# Phase 7 — Eblocki Beta Completion Plan

Goal: make the existing app beta-ready for 5–10 Proof Week testers. No new architecture, no Stripe, no Cortex. Smallest real changes that prove the loop: land → understand → onboard → submit one proof → see verdict → know next action.

## 1. Inspect (read-only, before any edit)

Read to confirm current behavior and avoid duplicate logic:

- `src/App.tsx`, `src/pages/{Landing,StartToday,Onboarding,Dashboard,Proof,Coach}.tsx`
- `src/components/eblocki/{ProofWeekPanel,ProofStandardPreviewPanel,ProofContractCard,ProofCapture,CourtVerdictBadge,BetaFeedback,InterestSignalCard}.tsx`
- `src/lib/eblocki/{proof-week,proof-standard-preview,proof-contract-alignment,proof-scoring,domain-standards,coach-router,dashboard-view-model,analytics}.ts`
- `src/integrations/supabase/types.ts` (proof_artifacts, court_verdicts, interest_signals, beta_feedback columns)
- `supabase/functions/coach/index.ts`
- existing tests in `src/lib/eblocki/__tests__/`
- `docs/release/*`

No schema changes unless inspection proves a real mismatch — current direction is additive-only or none.

## 2. Release gate doc

Create `docs/release/phase-7-beta-release-gate.md` covering: build/CI, route checks (`/`, `/dashboard`, `/proof`, `/coach`, `/operator`, `/onboarding`, `/start-today`), auth states, proof flow, dashboard, Supabase, mobile, privacy, Proof Week readiness, final go/no-go. Marked pass only against verified evidence; everything else "needs manual check".

## 3. Proof Week clarity (no duplicate engine)

`src/lib/eblocki/proof-week.ts` already drives a 7-day loop and `ProofWeekPanel` renders it on the dashboard. Changes:

- Align the 7-day mission copy in `proof-week.ts` with the canonical Day 1–7 list in the brief (artifact / expose fake productivity / avoided task / apply / upgrade / transfer / weekly review), keeping the existing data shape.
- Add a dedicated `/proof-week` route + page that explains the challenge, shows the current day's command, required artifact, what counts / what doesn't, and a primary CTA to `/proof` (and "Join Proof Week" if not joined). Reuses `computeProofWeek` and the same join signal as the dashboard panel — no duplicate state.
- Landing + StartToday CTAs route here; dashboard panel links here for the full explanation.

## 4. New-user clarity copy

- `Landing.tsx`: hero line "Stop fake productivity. Turn effort into proof." Primary CTA "Start Proof Week", secondary "Submit first proof". Trim founder/OS jargon above the fold.
- `Onboarding.tsx` final step: "Your first goal is to submit one honest proof artifact."
- Dashboard empty state: "No proof yet. Submit one measurable artifact to activate the command layer."

## 5. Proof page hardening (`src/pages/Proof.tsx`)

End-to-end loop using existing helpers:

1. Domain/artifact selection drives `buildProofStandardPreview(...)` → render `ProofStandardPreviewPanel` BEFORE the submit button (selected standard, required evidence, elite version, contract alignment, identity escalation rule).
2. On submit: honest success/error toast tied to actual Supabase insert result (no fake success on error).
3. After insert: show verdict from `court_verdicts` (or computed via `proof-scoring`) using the correct standard, plus one explicit next action and a lightweight "Was this judgment useful? Yes / Kind of / No" control.
4. Guard against mismatch via `validateProofContractAlignment` — show warning + fallback contract when not aligned.

No duplication of `domain-standards` or scoring logic.

## 6. Dashboard command centre hardening (`src/pages/Dashboard.tsx`)

Reduce to a single command stack using existing view-model:

- One Today Command, one Proof Contract (artifact + standard + timebox), Selected Standard + Required Evidence, Risk if Ignored, Next Checkpoint, Latest Court Signal.
- Null-safe for: signed-out, no profile, no proof, legacy rows, missing verdict/ledger.
- Suppress competing panels when artifacts < 1 (replace with the empty-state line above).
- Keep ProofWeekPanel, ProductMatchPanel (trust-gated), Sentinel as secondary — never as a second "today command".

## 7. Supabase safety + production alignment doc

- Inspect-only on schema. If columns referenced by Proof.tsx/Dashboard already exist, no migration.
- Create `docs/release/supabase-production-alignment.md`: migrations status (likely none required), coach deploy status (NOT deployed by this pass), Smoke Prompt A/B expected outputs, rollback note, manual verification steps.
- Do not deploy the coach function in this pass; document the command and expected outputs only.

## 8. Lightweight feedback capture

- Reuse existing `beta_feedback` table + `BetaFeedback` component if compatible. Otherwise add an inline "Was this verdict useful?" control on Proof verdict that writes to `interest_signals` with `signal_type='verdict_feedback'` (already-allowed table, no migration).
- Create `docs/release/proof-week-feedback-plan.md` with tester template (name, day, proof y/n, confusion, most/least useful, return tomorrow, would pay, price, quote).

## 9. /start-today routing

Verify `StartToday.tsx` routes:
- signed-out → `/auth`
- signed-in + no onboarding → `/onboarding`
- onboarded + no proof today → `/proof-week`
- proof today → `/dashboard`

Fix only if currently broken.

## 10. Tests (vitest, in `src/lib/eblocki/__tests__/`)

Add focused unit tests on helpers (no React component tests to keep scope tight):

- `proof-standard-preview.test.ts` (extend): product-system input → `product_system_review_standard`, excludes IRAC vocabulary; law source-bank input → `law_source_bank_standard`, no IRAC required; IRAC input → `law_irac_standard`; empty input → neutral; contract mismatch → fallback message.
- `proof-week.test.ts` (extend): every day 1–7 has exactly one command + one artifact standard; Day 1 command matches canonical copy.
- `dashboard-view-model.test.ts` (extend): no-proof user gets exactly one Today Command and safe empty state; legacy null rows don't throw.

## 11. Verification

Run in build mode:
- `npm run test`
- `npm run build` (auto via harness)
- `npm run lint:eblocki` (scoped, per existing CI)
Report exact pass/fail. Do not claim success without evidence. GitHub Actions: not observable from sandbox — say so.

## 12. Release safety final pass

Re-check: no secrets, no service role in client, no fake AI/legal/medical claims, no new deps, no schema break, mobile widths still clean on Proof + Dashboard at 375px (visual check via `browser--view_preview`).

---

## Files to be created
- `docs/release/phase-7-beta-release-gate.md`
- `docs/release/supabase-production-alignment.md`
- `docs/release/proof-week-feedback-plan.md`
- `src/pages/ProofWeek.tsx`

## Files to be modified
- `src/App.tsx` (route for `/proof-week`)
- `src/pages/Landing.tsx` (hero copy + CTA)
- `src/pages/StartToday.tsx` (routing guard)
- `src/pages/Onboarding.tsx` (final-step copy only)
- `src/pages/Proof.tsx` (preview before submit, honest result, verdict + next action + feedback control)
- `src/pages/Dashboard.tsx` (single command stack, empty state copy, null safety)
- `src/lib/eblocki/proof-week.ts` (align Day 1–7 copy to canonical list)
- `src/lib/eblocki/__tests__/proof-standard-preview.test.ts`
- `src/lib/eblocki/__tests__/proof-week.test.ts`
- `src/lib/eblocki/__tests__/dashboard-view-model.test.ts`

## Out of scope (explicitly)
- Stripe / payments
- Cortex / new intelligence layers
- Schema migrations (unless inspection in build mode proves a real mismatch — will surface before writing)
- Coach function deploy (documented only)
- Repo-wide lint cleanup

## Risks
- Inspection in build mode may reveal Proof.tsx already integrates preview/verdict — in that case the change shrinks to copy + feedback control only.
- If `beta_feedback` schema isn't usable, fallback to `interest_signals` to avoid a migration.

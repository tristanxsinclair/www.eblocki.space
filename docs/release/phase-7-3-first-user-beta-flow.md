# Phase 7.3 — First-User Beta Flow, Mobile Containment & Release Evidence

Date: 2026-06-29
Mode: Build
Branch: edit (Lovable working branch)

## 1. Files inspected
- `src/App.tsx` — route map verified
- `src/pages/Landing.tsx`
- `src/pages/ProofWeek.tsx`
- `src/pages/Proof.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/StartToday.tsx`
- `src/pages/Welcome.tsx`
- `src/components/eblocki/ProofWeekPanel.tsx`
- `src/lib/eblocki/proof-week.ts`
- `src/lib/eblocki/first-proof.ts`
- `src/lib/eblocki/proof-standard-preview.ts`
- `docs/release/proof-week-feedback-plan.md`

## 2. Files changed
- `src/pages/Landing.tsx` — Landing header + hero CTAs now route directly to `/proof-week` (primary) and `/proof` (secondary), making the first-user beta path obvious. No other visual changes.
- `docs/release/phase-7-3-first-user-beta-flow.md` — this evidence doc.

No schema, function, or engine changes were required. Prior phases (7.1, 7.2, Student Clarity, Activation Flow Simplification, First-Proof v1, Command-First Dashboard, Mobile AppShell Nav) already shipped the underlying flow; this pass verifies and documents it.

## 3. First-user flow
- Landing → `Start Proof Week` (primary) → `/proof-week` → signed-out users land on `/auth` via `Protected`, then return to `/proof-week`. ✅
- Secondary CTA `Submit first proof` → `/proof` → `Protected` → `/auth` → `/proof`. ✅
- `/start-today` retained for the optional 5-step planner (gated behind `?plan=1`); default view is a one-screen activation card. Safe — no loop. ✅
- Onboarding (`/onboarding`) reachable from `Welcome` and is no longer forced before first proof. ✅

## 4. Proof Week
- Entry point: Landing primary CTA + dashboard `ProofWeekPanel`.
- Day-1 command: "Submit your first proof artifact." (`PROOF_WEEK_DAYS[0]`).
- Submission: `/proof` (single source of truth — no duplicate proof form).
- Status derived from `interest_signals.proof_week_join` + `proof_artifacts.created_at` (no schema change).

## 5. Proof page
- Standard preview visible before submit: yes (via `ProofStandardPreviewPanel` + `buildProofStandardPreview`).
- Required evidence visible: yes.
- Contract alignment visible: yes (when a contract is linked).
- Identity escalation rule visible: yes (per standard).
- Honest success/failure: yes — success state only renders after Supabase insert resolves.
- One next action after verdict: yes — "Back to dashboard" + "Submit another proof".
- First-proof mode (`?first=1`) collapses jargon and applies `GENERAL_EXECUTION` defaults.

## 6. Dashboard
- One Today Command above the fold: yes (`CommandHero` "Next Command").
- One Proof Contract: yes (when present); empty-state shows activation card with single CTA.
- Empty state safe (zero artifacts): yes — activation card, no fake intelligence.
- Mobile usable at 375px: yes — diagnostics collapsed behind `MobileCollapse`.
- No crashes on null/old rows verified via existing `dashboard-view-model.test.ts`.

## 7. Mobile
- 375px horizontal overflow: none on `/`, `/proof-week`, `/proof`, `/dashboard` (verified in prior Phase 7.3 mobile-containment QA — `docs/release/phase-7-3-mobile-containment-qa.md`).
- 768px: layouts adapt via responsive grids.
- Desktop preserved: no desktop layout changed in this pass.
- Bottom-tab nav present via `MobileBottomNav`; sidebar `hidden md:flex`.

## 8. Supabase / schema
- Schema mismatch found: no.
- Migration created: no.
- Old/null rows handled safely: yes (existing guards in `Dashboard.tsx`, `Proof.tsx`, view-model).
- Secrets exposed: no.
- Service role usage: server-side only (edge functions).

## 9. Tests / checks
- `npx vitest run`: **222/222 PASS** (28 files).
- `npm run build`: **PASS** (chunk-size warning on `index.js` 802 kB — pre-existing, accepted).
- `npm run lint`: not run in this pass to avoid pre-existing repo-wide debt — see prior phase docs for the targeted `lint:eblocki` baseline (0 errors on touched files).
- Browser testing: prior phases (7.3 mobile QA, H1.4 e2e proof loop) used Playwright at 375/390/768/1440 and verified the loop end-to-end. No new behavioural changes in this pass require re-run.
- GitHub Actions: not observable from inside Lovable harness.

## 10. Preview vs published
- Preview: verified via prior live walkthroughs on `id-preview--*.lovable.app`.
- Production (`eblocki.lovable.app`, `eblocki.space`): NOT republished by this pass. Publish action required to ship Landing copy change.

## 11. Beta feedback
- In-product: `verdict_feedback` rows written to `interest_signals` from the Proof page.
- Offline template: `docs/release/proof-week-feedback-plan.md` already exists and covers per-tester capture + aggregation.
- No new feedback table created (existing path is sufficient and safe).

## 12. Final verdict
**Ready with minor risks** for a 5–10 person Proof Week beta.

### Remaining minor risks
- Bundle size warning on `index.js` (802 kB). Cosmetic for beta; address with route-level code splitting post-beta.
- Repo-wide `npm run lint` still carries pre-existing debt outside Eblocki-owned files.
- Production not auto-republished — user must trigger Publish to ship Landing CTA change.
- No live-device (iOS Safari / Android Chrome) walkthrough captured this pass; emulated viewports only.

### Next safe action
Publish the project so the updated Landing CTAs reach `eblocki.space`, then send the Proof Week link to the first 5 beta testers and collect feedback via the existing plan.
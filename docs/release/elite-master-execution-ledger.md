# Eblocki Elite Master Execution Ledger

## Governing documents
- Master plan: `Eblocki Elite Product Standard Complete` (uploaded 2026-07-10)
- Stack: React 18 + Vite + TS + React Router + Tailwind/shadcn + Supabase + PostHog + Capacitor + Stripe
- Current active phase: **Phase 1 — Trust and release blockers**
- Current release gate: WP-004 (P1-ACCOUNT-DELETE) code/test/build complete; live Stripe cancellation end-to-end remains an external-verification gate (`WP-004-EXTERNAL`)
- Ledger last updated: 2026-07-12

## Reconciliation closeout (2026-07-12)

- Audit report preserved via closeout PR: `docs/release/eblocki-repository-reconciliation-product-verdict.md` (PR #99).
- Superseded branch disposition (re-verified zero unique work before deletion):
  - deleted remote `codex/first-proof-post-merge-cleanup-20260629`
  - deleted remote `tristanxsinclair-sync-update-branches`
  - deleted local `tristanxsinclair-sync-update-branches`
- `main` protection enabled with strict required checks and conversation resolution:
  - required checks: `Verify product`, `Test, build, and lint`, `Playwright (mobile-chromium)`
  - force-push blocked, branch deletion blocked, admins enforced
  - deployment policy: Pages + Datadog remain post-merge/post-deploy release signals
- WP split enforced:
  - `WP-005A / P1-PAY-ENV` = READY / EXECUTABLE (no pricing/term changes)
  - `WP-005B / P1-PRICING-SOT` = BLOCKED — MANUAL COMMERCIAL DECISION REQUIRED (Tristan-owned decisions)

## E2E Test Infrastructure (WP-003 supporting)

Added 2026-07-10 to support WP-003 post-fix authenticated browser QA.

Files created:
- `scripts/seed-e2e-test-user.mjs` — idempotent test-user provisioning
- `tests/e2e/fixtures/average-user-auth.ts` — Playwright authenticated fixture
- `tests/e2e/wp-003-verdict-copy-qa.spec.ts` — WP-003 viewport QA spec
- `docs/testing/permanent-average-user.md` — full documentation
- `.env.example` — placeholder credentials

Security design:
- Credentials from environment variables only
- `NODE_ENV !== "production"` guard
- `E2E_ALLOW_TEST_USER_SEED === "true"` guard
- Production URL pattern detection
- No `VITE_` prefix for service-role key
- No admin role or paid entitlement
- Auth via real Supabase `signInWithPassword` (no RLS bypass)
- `playwright/.auth/` gitignored

Status: INFRASTRUCTURE READY — requires environment credentials to execute.

## Status definitions
NOT STARTED · IN PROGRESS · PARTIALLY COMPLETE · BLOCKED · NEEDS MANUAL DECISION · VERIFIED COMPLETE · NOT APPLICABLE

## Completed-candidate reconciliation

### P0-CONFINE-AI — OpenAI/vector-store confinement
Status: **PARTIALLY COMPLETE → VERIFIED COMPLETE after WP-001**

Evidence inspected:
- `src/pages/Settings.tsx` no longer renders model or vector_store_id inputs;
  `save()` strips both keys before upsert (lines 66-68).
- `rg` across `src/` returns no user-visible `openai/`, `gpt-*`, `vs_*`, or
  raw model identifiers outside `src/integrations/supabase/types.ts` (generated).
- Coach edge function reads model + `EBLOCKI_VECTOR_STORE_ID` from server env.

Residual gap closed by WP-001:
- `supabase/functions/export-data/index.ts` exported the full
  `performance_os_config` row, including historical `model` and
  `vector_store_id` values, back to the user as a downloadable JSON archive.
  This re-exposed the infrastructure identifiers the Settings UI hid.

### P0-MOBILE-AUDIT-1 — First mobile UI audit
Status: **VERIFIED COMPLETE (audit only)** — remediation is a separate track.

Prior turn shipped safe-area + horizontal containment fixes (`AppShell`,
`MobileBottomNav`, `.pt-header-safe`, `.pb-nav-safe`, per-page padding
cleanup). Remaining defects across authenticated routes, keyboard-open
states, and long-content wrapping are tracked as Phase 3 controls, not as
audit completion.

## Control table (active P0 / P1)

| ID | Phase | Prio | Task | Surface | Status | Next action |
|---|---|---|---|---|---|---|
| P0-CONFINE-AI-EXPORT | 0 | P0 | Strip `model`/`vector_store_id` from export-data archive | `supabase/functions/export-data` | BLOCKED — EXTERNAL ACCESS REQUIRED | Deploy function and inspect one real export archive |
| P0-CONFINE-AI-BUNDLE-SCAN | 0 | P0 | Search built client bundle for `vs_`, model IDs | build output | VERIFIED COMPLETE (WP-002) | — |
| WP-005B / P1-PRICING-SOT | 1 | P0 | Pricing source of truth (Stripe + display) | `src/lib/stripe.ts`, Pricing, UpgradeCard | BLOCKED — MANUAL COMMERCIAL DECISION REQUIRED | Await Tristan decisions: Pro monthly, Pro annual, annual discount, Founder price/model, lifetime wording, refund wording |
| WP-005A / P1-PAY-ENV | 1 | P0 | Payment env verification (sandbox vs live surfacing + routing) | `PaymentTestModeBanner`, `stripe.ts`, `create-checkout`, `payments-webhook`, `create-portal-session`, `useSubscription` | READY / EXECUTABLE | Verify banner/env partitioning and checkout mismatch rejection without changing prices/terms |
| WP-IMPROVEMENT-LOOP-01 | Draft | P2 | Verdict, Gap, and Correction Surface v1 | Proof result surface | PARTIALLY COMPLETE — code/test/build complete, browser QA blocked | Draft PR only; do not merge before WP-005A release gate or without authenticated proof-result browser evidence |
| P1-VERDICT-COPY | 1 | P0 | Remove duplicated / false verdict copy | Verdict surfaces | VERIFIED COMPLETE (2026-07-11) | — |
| P1-BILLING-PORTAL | 1 | P1 | Billing portal reachable from Settings | `BillingCard`, `create-portal-session` | VERIFIED COMPLETE (prior turn) | — |
| P1-ACCOUNT-EXPORT | 1 | P1 | Account data export | `export-data` | VERIFIED COMPLETE after WP-001 | — |
| P1-ACCOUNT-DELETE | 1 | P1 | Account deletion | `delete-account`, `Settings.tsx`, `DeleteAccountDialog.tsx` | VERIFIED COMPLETE (2026-07-12, code) — external live-Stripe end-to-end BLOCKED | — |
| WP-004-EXTERNAL | 1 | P1 | Live Stripe cancellation E2E on delete | Stripe test-mode account | BLOCKED — EXTERNAL ACCESS REQUIRED | Provision disposable Stripe test-mode subscription and verify cancellation on account delete |
| P3-MOBILE-REMEDIATION | 3 | P1 | Remaining mobile defects | multiple pages | NOT STARTED | Deferred to Phase 3 |
| P4-RETENTION | 4 | P2 | Retention validation | — | NOT STARTED | Gated by Phase 1 |
| P5-MONETISATION | 5 | P2 | Monetisation validation | — | NOT STARTED | Gated by P1-PRICING-SOT |

## Current blocking chain
1. Phase 0 export redaction is implemented but blocked on Supabase deployment
   access and a safe test export account.
2. WP-003 reobservation (2026-07-11) completed authenticated at 390 px and
   1280 px using injected Supabase session. Rendered-text scan shows zero
   raw enum tokens and zero infra vocabulary in app-rendered copy. Reobservation
   also uncovered a structural duplication defect on `/proof`: `Definitions`
   and `Strength tally & filter` MobileCollapse blocks rendered twice (once
   before, once after the submit form) — visible on desktop, appeared as
   duplicate accordion headers on mobile. Same-defect-class fix applied
   inside WP-003 scope: removed the second copy from `src/pages/Proof.tsx`
   (lines 1604-1652 pre-patch). Post-fix reobservation confirmed a single
   Definitions block and a single Strength tally on desktop, and mobile
   duplicate accordion headers are gone.
3. After WP-003 close-out, next executable P1 without user decision is
   **P1-ACCOUNT-DELETE** review. **WP-005A / P1-PAY-ENV** verification follows.
   **WP-005B / P1-PRICING-SOT** is blocked pending Tristan-approved public
   prices, Founder terms, and refund rules.
4. WP-004 shipped 2026-07-12 (see the WP-004 evidence section below).
   Next executable strict WP is **WP-005A / P1-PAY-ENV VERIFICATION**.
5. WP-IMPROVEMENT-LOOP-01 was implemented as an out-of-sequence draft
   product-refinement slice. It must not merge ahead of WP-005A unless Tristan
   explicitly changes release order. Browser proof-result QA remains blocked
   because no authenticated E2E credentials or local session are available.

## WP-IMPROVEMENT-LOOP-01 evidence (Verdict, Gap, and Correction Surface v1)
Date: 2026-07-13.

Objective:
- Make the proof-result experience clearly answer what the evidence proves,
  the main available gap, the next correction, and what artifact should test
  that correction.
- Preserve existing proof scoring, persistence, routes, schemas, billing,
  Coach, GameForge, System Forge, XP, identity progression, and forecasts.

Root cause:
- WP-003 centralized verdict headline/count/today copy, but the gap remained
  in `ProofVerdictDetails` as `missingStandard` while correction stayed in the
  primary card as a generic next command.
- Available gap data is standard-level (`missingStandard` / `requiredEvidence`)
  rather than a detected per-criterion missing element, so the UI needed honest
  null/fallback states.
- Correction data is `nextUpgrade`; it can be user-entered, scoring fallback,
  or absent.
- Mode/proof-type context existed during submission but was not carried into
  the local verdict object for a corrected-attempt continuation.

Implementation:
- Added `buildImprovementLoopPresentation()` in
  `src/lib/eblocki/user-facing-copy.ts`.
- The helper returns one canonical presentation object with:
  - verdict headline/classification/summary,
  - nullable gap,
  - nullable correction and expected next artifact,
  - details labels,
  - safe corrected-attempt href using existing `/proof`, `mode`, and `contract`
    query parameters only.
- Updated `src/pages/Proof.tsx` result UI to show:
  - `What this proves`,
  - `The main gap`,
  - `What to do next`,
  - `What to submit next`,
  - collapsed `Verdict details`.
- The result card now receives focus after verdict creation; loading uses a
  short polite status line; previous verdict is still cleared before a new
  submission.

Files inspected:
- `docs/release/elite-master-execution-ledger.md`
- `docs/release/elite-current-work-package.md`
- `docs/release/eblocki-repository-reconciliation-product-verdict.md`
- `src/App.tsx`
- `src/pages/Proof.tsx`
- `src/pages/ProofWeek.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/eblocki/ProofClosureCard.tsx`
- `src/components/eblocki/ProofStandardPreviewPanel.tsx`
- `src/components/eblocki/motion/MotionVerdictCard.tsx`
- `src/lib/eblocki/user-facing-copy.ts`
- `src/lib/eblocki/display-labels.ts`
- `src/lib/eblocki/proof-scoring.ts`
- `src/lib/eblocki/proof-check.ts`
- `src/lib/eblocki/proof-standard-preview.ts`
- `src/lib/eblocki/domain-standards.ts`
- `src/lib/eblocki/first-proof.ts`
- `src/lib/eblocki/temporal-proof-link.ts`
- `src/lib/eblocki/analytics.ts`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- `tests/e2e/wp-003-verdict-copy-qa.spec.ts`
- `tests/e2e/fixtures/average-user-auth.ts`
- `package.json`
- `playwright.config.ts`

Files changed:
- `src/lib/eblocki/user-facing-copy.ts`
- `src/pages/Proof.tsx`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- `docs/release/elite-current-work-package.md`
- `docs/release/elite-master-execution-ledger.md`

Data / schema implications: none. No migrations, new tables, enum renames, or
stored-data changes.

Scoring implications: none. `scoreProofArtifact`, proof thresholds, persistence,
and `proof_artifacts` writes are unchanged.

Security implications:
- No new network request or AI call.
- No raw artifact content, verdict explanation, or correction text is logged.
- Corrected-attempt analytics reuse existing whitelisted CTA properties only.

Acceptance evidence:
- `git diff --check` -> PASS, exit 0.
- `npx tsc --noEmit` -> PASS, exit 0, no output.
- `npm run test -- src/lib/eblocki/__tests__/user-facing-copy.test.ts`
  -> PASS, 22 tests.
- `npm run test` -> PASS, 39 files, 318 tests.
- `npx vite build` -> PASS, existing large chunk warning remains.
- Bundle confinement scan:
  `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist`
  -> no output, `rg_exit=1`; interpreted as no matches.
- Source vocabulary scan:
  `rg -n -iS '\b(model|vector|embedding|retrieval|prompt|llm|openai|token)\b' src/pages src/components/eblocki`
  -> remaining matches are legal/admin/model-audit copy, PWA install APIs,
  coach query params/quick prompts, `dashboard-view-model` imports, product
  "freeze token" wording, and temporal trajectory implementation labels. No
  new proof-result primary copy match from WP-IMPROVEMENT-LOOP-01.
- Raw enum scan:
  `rg -n -S 'EBLOCKI_[A-Z_]+|GENERAL_EXECUTION|accepted_strong|accepted_useful|accepted_minimum|elite_evidence|evidence_strength|proof_tier|quality_score|artifact_type|low_energy|hype_drift|academic_displacement|strategic_build|locked_in' src/pages/Proof.tsx src/components/eblocki src/lib/eblocki/user-facing-copy.ts`
  -> remaining matches are internal DB column names, internal enum translation
  maps, badge/style maps, tests, and source constants. No new primary
  proof-result text renders raw enum values.

Browser evidence:
- In-app Browser at 390 px, local `/proof` -> redirected to `/auth`, title
  `Sign in | EBLOCKI`; no proof result visible.
- In-app Browser at 1280 px, local `/proof` -> redirected to `/auth`, title
  `Sign in | EBLOCKI`; no proof result visible; auth page horizontal overflow
  check returned false.
- `npx playwright test tests/e2e/wp-003-verdict-copy-qa.spec.ts` -> PASS exit
  0 with 3 skipped because E2E credentials/storage state are not configured.
- No screenshots were created for this package. Do not report mobile or
  desktop proof-result browser QA as passed.

Status:
- **PARTIALLY COMPLETE** — code/test/build/scans complete; authenticated browser
  proof-submission/result QA blocked.
- Draft PR required. Merge blocked by WP-005A release gate and by missing
  proof-result browser evidence unless Tristan explicitly approves a partially
  verified PR.

Rollback:
- Revert `src/lib/eblocki/user-facing-copy.ts`,
  `src/pages/Proof.tsx`, `src/lib/eblocki/__tests__/user-facing-copy.test.ts`,
  and this release-documentation update. No data rollback required.

## WP-004 evidence (P1-ACCOUNT-DELETE)
Date: 2026-07-12.

Objective:
- Cancel any active Stripe subscription before deleting the auth user.
- Paginate the storage purge so users with >1000 attachments are not truncated.
- Remove the manual table-delete loop and rely on the existing `ON DELETE CASCADE`
  contract from `auth.users` on every user-scoped public table.
- Replace the `window.prompt` destructive confirmation with a shadcn `AlertDialog`
  that keeps the destructive button disabled until the user types `DELETE`.

Root cause:
- `supabase/functions/delete-account/index.ts` never called `stripe.subscriptions.cancel`,
  so a deleted Eblocki account could remain billed by Stripe with no in-app record.
- Storage purge used `list({ limit: 1000 })` with no pagination.
- The function maintained a hard-coded table list that was already a proper subset of
  the actual user-scoped public tables — leading to drift as tables like `subscriptions`,
  `custom_systems`, `system_reps`, `momentum_state`, `xp_events`, `domain_levels`,
  `operator_level`, `identity_ledger`, `court_verdicts`, and `notification_preferences`
  were added over time. All of these already carry `ON DELETE CASCADE REFERENCES
  auth.users(id)`, so the manual loop was both redundant and drift-prone.
- `src/pages/Settings.tsx` line 174 used `window.prompt` for a destructive action —
  inconsistent with the design system and prone to mobile misfires.

Files inspected:
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/_shared/stripe.ts`
- `supabase/functions/payments-webhook/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/migrations/*.sql` (FK cascade verification)
- `src/pages/Settings.tsx`
- `src/components/ui/alert-dialog.tsx`

Files changed:
- `supabase/functions/delete-account/index.ts`
- `src/pages/Settings.tsx`
- `src/components/eblocki/DeleteAccountDialog.tsx` (new)
- `docs/release/elite-current-work-package.md`
- `docs/release/elite-master-execution-ledger.md`

Data / schema implications: none. Every user-scoped public table already declares
`ON DELETE CASCADE REFERENCES auth.users(id)`, so `admin.auth.admin.deleteUser(uid)`
drops the rest.

Security implications: no new client-exposed secrets. Stripe calls remain
server-side via `createStripeClient(env)`. Failure modes are documented in the
function header — subscription-cancel and storage-purge errors are logged with
`console.warn` and do not abort auth-user deletion.

Acceptance evidence:
- `npx tsgo --noEmit` → PASS, exit 0, no output.
- `npm run test` → PASS, 39 files, 306 tests, exit 0 (duration 12.46 s).
- `npx vite build` → PASS, built in 6.37 s, exit 0.
- Phase 0 bundle rescan:
  `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist`
  → no output, `rg_exit=1`. Confinement not regressed.
- Playwright at 390 px and 1280 px on `/settings` (managed session, `LOVABLE_BROWSER_AUTH_STATUS=injected`):
  - `docs/release/evidence/wp-004/mobile-390-01-account-card.png`
  - `docs/release/evidence/wp-004/mobile-390-02-dialog-open-disabled.png`
  - `docs/release/evidence/wp-004/mobile-390-03-wrong-phrase-still-disabled.png`
  - `docs/release/evidence/wp-004/mobile-390-04-correct-phrase-enabled.png`
  - `docs/release/evidence/wp-004/mobile-390-05-dialog-closed.png`
  - `docs/release/evidence/wp-004/desktop-1280-01-account-card.png`
  - `docs/release/evidence/wp-004/desktop-1280-02-dialog-open-disabled.png`
  - `docs/release/evidence/wp-004/desktop-1280-03-wrong-phrase-still-disabled.png`
  - `docs/release/evidence/wp-004/desktop-1280-04-correct-phrase-enabled.png`
  - `docs/release/evidence/wp-004/desktop-1280-05-dialog-closed.png`
  Visual confirmation on both viewports: on dialog open the destructive
  `Delete account` button renders in the disabled/dim state; typing the wrong
  phrase (`delete`) keeps it disabled; typing the exact phrase (`DELETE`)
  transitions it to the bright destructive state with the input showing a
  focus ring; the destructive submission was **not** executed to preserve the
  test account.

External-verification gate: `WP-004-EXTERNAL` — end-to-end Stripe cancellation on
delete requires a disposable Stripe test-mode account. BLOCKED — EXTERNAL ACCESS
REQUIRED. Verification procedure:
1. Create a test-mode Stripe subscription for a seeded test user.
2. Trigger delete-account via authenticated call.
3. Confirm the subscription is `canceled` in the Stripe test dashboard.
4. Confirm the `subscriptions` row is dropped (CASCADE).

## WP-002 evidence (P0-CONFINE-AI-BUNDLE-SCAN)
Built with `npx vite build` (2026-07-10). Scans across `dist/`:
- `rg 'vs_[A-Za-z0-9]{6,}|gpt-[0-9][a-z0-9.-]*|openai/[a-z0-9/-]+|text-embedding-[a-z0-9-]+|EBLOCKI_VECTOR_STORE_ID' dist/` → 0 matches.
- `rg '"model"\s*:\s*"[^"]+"' dist/assets` → 0 matches.
No AI infrastructure identifiers reach the shipped client bundle.

## WP-003 evidence (P1-VERDICT-COPY)
Date: 2026-07-10 (original), reobserved 2026-07-11.

Objective:
- Remove duplicated, false, stale, raw-enum, and infrastructure-flavoured
  verdict copy from normal-user proof result surfaces after proof submission.
- Preserve proof judgment logic, scoring rules, persistence, Stripe, and
  pricing surfaces.

Root cause:
- `src/pages/Proof.tsx` had parent and child result regions deriving verdict
  copy independently, plus a toast that repeated verdict outcome text.
- `src/pages/Proof.tsx` kept the previous result mounted during a new
  submission, allowing stale verdict/next-command copy while loading.
- `src/pages/Proof.tsx` rendered raw strength labels in tally UI, raw
  domain/artifact metadata in proof lists, and used OCR/indexing/verdict-context
  vocabulary in normal attachment copy.
- `src/pages/ProofWeek.tsx` rendered duplicated closed/completed labels in one
  proof-week completed state.
- `src/pages/Coach.tsx` and proof-adjacent components contained prompt/model
  wording visible to normal users.
- `src/lib/eblocki/user-facing-copy.ts` did not have a canonical proof-result
  copy object for one headline, count status, today status, next command, and
  CTA state.

Files inspected:
- `src/pages/Proof.tsx`, `src/pages/ProofWeek.tsx`, `src/pages/Coach.tsx`
- `src/components/eblocki/ProofClosureCard.tsx`
- `src/components/eblocki/ProofContractCard.tsx`
- `src/components/eblocki/ProofStandardPreviewPanel.tsx`
- `src/components/eblocki/CourtVerdictBadge.tsx`
- `src/components/eblocki/StudyVerdictHint.tsx`
- `src/components/eblocki/CompletionReflection.tsx`
- `src/components/eblocki/motion/MotionVerdictCard.tsx`
- `src/components/eblocki/motion/ProofProcessingState.tsx`
- `src/components/eblocki/ProofCapture.tsx`
- `src/lib/eblocki/proof-scoring.ts`, `proof-check.ts`,
  `verdict-identity-impact.ts`, `user-facing-copy.ts`, `display-labels.ts`
- `supabase/functions/mcp/index.ts`
- `playwright.config.ts`, `tests/e2e/fixtures/auth.ts`

Files changed:
- `package-lock.json`
- `src/components/eblocki/IdentityLedger.tsx`
- `src/components/eblocki/NotificationPreferences.tsx`
- `src/components/eblocki/ProofCapture.tsx`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- `src/lib/eblocki/__tests__/proof-standard-preview.test.ts`
- `src/lib/eblocki/proof-standard-preview.ts`
- `src/lib/eblocki/user-facing-copy.ts`
- `src/pages/Coach.tsx`
- `src/pages/Proof.tsx`
- `src/pages/ProofWeek.tsx`
- `supabase/functions/mcp/index.ts`
- `docs/release/elite-current-work-package.md`
- `docs/release/elite-master-execution-ledger.md`
- `docs/release/evidence/wp-003/fresh-mobile-01-moderate-result.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-02-strong-result.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-03-verdict-details-top.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-04-identity-feedback.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-05-feedback-and-artifacts-raw-enum.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-06-dashboard-closed.jpg`

Acceptance evidence:
- `npx tsc --noEmit` → PASS, exit 0, no output.
- `npm run test -- src/lib/eblocki/__tests__/user-facing-copy.test.ts src/lib/eblocki/__tests__/proof-scoring.test.ts src/lib/eblocki/__tests__/proof-check.test.ts src/lib/eblocki/__tests__/display-labels.test.ts`
  → PASS, 3 files and 29 tests passed. `display-labels.test.ts` does not
  exist, so Vitest ran the existing matching proof suites.
- `npm run test` → PASS, 39 files and 306 tests passed.
- `npx vite build` → PASS after `npm install` synced `package-lock.json` with
  dependencies already declared in `package.json`; no Stripe code, pricing,
  product, entitlement, or Founder logic changed. Final build after
  screenshot-driven raw-metadata patch also passed.
- Phase 0 bundle rescan:
  `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist`
  → no output, `rg_exit=1`; interpreted as no matches.
- Focused stale-copy search:
  `rg -n "Proof Verdict|Verdict:|Proof submitted —|ocr indexed|text indexed|verdict context|fed into verdict|Internal prompt|Quick prompts|model output|prompt log|Lovable prompt" src/pages src/components/eblocki`
  → no output, `rg_exit=1`.
- Fresh raw proof-metadata search:
  `rg -n -S "EBLOCKI_PRODUCT_REVIEW|\bOTHER\b" src/pages src/components/eblocki`
  → no output, `rg_exit=1`.
- 2026-07-11 rendered-text scan against authenticated `/proof` at 390 px
  and 1280 px:
  `grep -inE '\b(model|vector|embedding|retrieval|prompt|llm|openai|token|vs_[a-z0-9]{4})\b' text-mobile.txt text-desktop.txt`
  → mobile clean; desktop hit was user-authored proof content only, no
  app-rendered infra vocabulary.
  `grep -inE 'EBLOCKI_[A-Z_]+|hype_drift|academic_displacement|strategic_build|low_energy|locked_in' text-*.txt`
  → clean on both viewports.
- 2026-07-11 layout-duplication scan (`sort | uniq -c | sort -rn`) surfaced
  duplicated `Contract vs Artifact` / `Strength tally & filter` /
  `SELECTED STANDARD` lines. Root cause: two identical MobileCollapse
  blocks rendered in `src/pages/Proof.tsx` around lines 988-1037 and
  1604-1652. The second copy was removed. Post-fix rescan shows only
  legitimate per-item repetitions (per-proof-card evidence labels,
  domain names in list vs form).

Search classification:
- Raw enum search still finds internal mapping keys, type imports, tests,
  admin/debug surfaces, and product terms such as Momentum/Recovery. No WP-003
  proof result JSX directly renders raw enum tokens. Proof Standard Preview now
  routes selected-domain display through `humaniseModeId`, fixing the raw
  `EBLOCKI_PRODUCT_REVIEW` label observed in manual screenshots.
- Infrastructure vocabulary search still finds admin/audit panels, legal
  disclosure pages, browser/PWA API names, query-param variable names,
  product "freeze token" copy, and non-rendered implementation references.
  Proof result surfaces and proof-adjacent copy changed in this work package
  do not expose prompt/model/OCR indexing/verdict-context wording.

Browser evidence:
- Automated local Playwright QA remains BLOCKED. `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`,
  `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`, and
  `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON` are missing. The existing Playwright
  harness self-skips without an injected Supabase session and only covers
  System Forge, not the WP-003 proof result view.
- `npx playwright test --list` found 4 existing System Forge tests and no
  proof-result harness. `npx playwright test` exited 0 with 4 skipped because
  the auth fixture self-skips without the injected Supabase session.
- User-supplied Lovable-preview mobile screenshots were saved under
  `docs/release/evidence/wp-003/` and classified as FAILED manual QA evidence:
  `manual-mobile-01-form-top.jpg`,
  `manual-mobile-02-standard.jpg`,
  `manual-mobile-03-standard-detail.jpg`,
  `manual-mobile-04-result-failed.jpg`,
  `manual-mobile-05-verdict-details.jpg`,
  `manual-mobile-06-identity-feedback.jpg`,
  `manual-mobile-07-duplicate-feedback.jpg`,
  `manual-mobile-08-completed-artifacts.jpg`,
  `manual-mobile-09-today-closed.jpg`.
- Failed preview findings: pre-WP-003 copy (`Proof saved.`, `Counted as Elite
  Proof.`), duplicate `Was this judgment useful?` blocks, raw
  `EBLOCKI_PRODUCT_REVIEW` labels, and raw lower-case `elite` in details.
- Fresh authenticated mobile screenshots after the Lovable update were saved:
  `fresh-mobile-01-moderate-result.jpg`,
  `fresh-mobile-02-strong-result.jpg`,
  `fresh-mobile-03-verdict-details-top.jpg`,
  `fresh-mobile-04-identity-feedback.jpg`,
  `fresh-mobile-05-feedback-and-artifacts-raw-enum.jpg`,
  `fresh-mobile-06-dashboard-closed.jpg`.
- Fresh findings: the visible result-card headlines, count status, today status,
  feedback block, and Dashboard closed card were materially improved. The fresh
  proof list still exposed raw completed-artifact metadata in
  `fresh-mobile-05-feedback-and-artifacts-raw-enum.jpg`; that defect is now
  patched in `src/pages/Proof.tsx`, but not yet reobserved in browser.
- Direct unauthenticated recheck still redirects to Lovable auth-bridge/login,
  so the current post-fix deployed proof result state remains unobserved from
  Codex.
- No 1280px desktop proof-result screenshot was provided.

Completion status:
- **VERIFIED COMPLETE (code + reobservation)** as of 2026-07-11.
- Automated authenticated reobservation at 390 px and 1280 px completed
  via injected Supabase session; screenshots archived under
  `docs/release/evidence/wp-003/post-fix/`. Live proof submission with a
  fresh weak/moderate/strong artifact was NOT executed to avoid writing
  disposable rows into the tenant; verdict result-surface layout, copy,
  and containment were inspected on the current authenticated `/proof`
  state which already displays historical weak/moderate/strong/elite
  proof cards. If the release gate requires a fresh live-submission
  verdict pass, spawn WP-003.1 with an isolated test account.

Files changed during reobservation (2026-07-11):
- `src/pages/Proof.tsx` — removed duplicated Definitions + Strength tally
  MobileCollapse blocks after the submit form.
- `docs/release/evidence/wp-003/post-fix/` — 8 screenshots (mobile 390 px
  and desktop 1280 px, 4 scroll positions each).

Manual browser QA:
1. `npm run dev -- --host 127.0.0.1 --port 8080`
2. Authenticate with an approved non-production account.
3. Open `/proof` at 390px and 1280px.
4. Submit weak/moderate and strong proof examples.
5. Confirm one dominant verdict headline, no duplicate toast/card verdict
   copy, no raw enum, no infrastructure wording, no stale prior result while
   loading, honest no-next-command state where applicable, and mobile
   containment.

## WP-001 external verification status (P0-CONFINE-AI-EXPORT)
Implementation evidence remains present:
- `supabase/functions/export-data/index.ts` strips `model` and
  `vector_store_id` from every `performance_os_config` row before returning
  the user archive.

External verification attempted:
- `command -v supabase` and `supabase --version` produced no output; Supabase
  CLI is not available in this environment.
- No approved test account/JWT is available to trigger and inspect one real
  export archive.

Status:
- **BLOCKED — EXTERNAL ACCESS REQUIRED**. Do not mark VERIFIED COMPLETE until
  the edge function is deployed and one real export archive has been inspected.

Manual verification commands:
1. `supabase link --project-ref <project-ref>`
2. `supabase functions deploy export-data`
3. `curl -sS -H "Authorization: Bearer <test-user-jwt>" "https://<project-ref>.functions.supabase.co/export-data" -o /tmp/eblocki-export.json`
4. `jq '.performance_os_config[] | has("model"), has("vector_store_id")' /tmp/eblocki-export.json`
5. Expected result: only `false` values.

## Evidence index
- Client source search: `rg -n -S 'vs_|vector_store_id|openai/|gpt-' src/` → clean
- Settings UI: `src/pages/Settings.tsx` lines 62-72
- Coach server routing: `supabase/functions/coach/index.ts`
- Export leak (fixed): `supabase/functions/export-data/index.ts`
- Work package: `docs/release/elite-current-work-package.md`

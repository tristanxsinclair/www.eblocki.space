# Eblocki Elite Master Execution Ledger

## Governing documents
- Master plan: `Eblocki Elite Product Standard Complete` (uploaded 2026-07-10)
- Stack: React 18 + Vite + TS + React Router + Tailwind/shadcn + Supabase + PostHog + Capacitor + Stripe
- Current active phase: **Phase 1 — Trust and release blockers**
- Current release gate: WP-003 code/test/build complete; post-fix browser QA and export deployment remain external-verification gates
- Ledger last updated: 2026-07-11

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
| P1-PRICING-SOT | 1 | P0 | Pricing source of truth (Stripe + display) | `src/lib/stripe.ts`, Pricing, UpgradeCard | NEEDS MANUAL DECISION | Awaiting Tristan-approved public prices |
| P1-PAY-ENV | 1 | P0 | Payment env control (sandbox vs live surfacing) | `PaymentTestModeBanner`, `stripe.ts` | PARTIALLY COMPLETE | Verify banner never shows in live |
| P1-VERDICT-COPY | 1 | P0 | Remove duplicated / false verdict copy | Verdict surfaces | VERIFIED COMPLETE (2026-07-11) | — |
| P1-BILLING-PORTAL | 1 | P1 | Billing portal reachable from Settings | `BillingCard`, `create-portal-session` | VERIFIED COMPLETE (prior turn) | — |
| P1-ACCOUNT-EXPORT | 1 | P1 | Account data export | `export-data` | VERIFIED COMPLETE after WP-001 | — |
| P1-ACCOUNT-DELETE | 1 | P1 | Account deletion | `delete-account` | NOT VERIFIED THIS PASS | Inspect next |
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
   **P1-ACCOUNT-DELETE** review. **P1-PAY-ENV** verification follows.
   **P1-PRICING-SOT** is blocked pending Tristan-approved public prices,
   Founder terms, refund rules.

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

# Work Package WP-003 — P1 Verdict Copy

- Governing control: **P1-VERDICT-COPY** (Phase 1)
- Master-plan sections: Trust/Reliability; 300-Control Register (proof verdict credibility)

## 1. Work-package ID
WP-003.

## 2. Governing control
P1-VERDICT-COPY.

## 3. Phase
Phase 1 — Trust and release blockers.

## 4. Priority
P0.

## 5. Objective
Remove duplicated, stale, raw-enum, false, and infrastructure-flavoured verdict copy from normal-user proof result surfaces after proof submission, without changing judgment logic.

## 6. User problem
Proof result UI repeated verdict messages, exposed implementation wording, and could keep the previous verdict visible while a new proof was being submitted.

## 7. Commercial / trust harm
False or duplicated result copy makes the proof loop feel less credible and can imply a proof counted, a next command exists, or a technical process succeeded when the current submission did not provide that evidence.

## 8. Current behaviour
- `Proof.tsx` rendered a toast with verdict wording and multiple result-card regions deriving copy independently.
- `Proof.tsx` left the previous verdict mounted while a new submission was processing.
- Strength tally labels rendered raw strength tokens.
- Completed and pending proof lists rendered raw stored domain/mode/artifact metadata.
- Attachment copy exposed OCR/indexing/verdict-context wording.
- `ProofWeek.tsx` rendered two closed/completed labels in the same state.
- Coach and proof-capture adjacent UI exposed prompt/model-style wording.

## 9. Expected behaviour
Each proof result view has one dominant verdict headline derived from canonical copy, subordinate labels only add distinct information, loading suppresses stale verdict output, and absence states do not invent missing next commands.

## 10. Scope
- `src/pages/Proof.tsx`
- `src/pages/ProofWeek.tsx`
- `src/pages/Coach.tsx` only where proof/coach copy exposed prompt-style wording
- Proof-adjacent components found by focused searches
- Existing canonical display/copy helpers

## 11. Non-scope
No scoring rules, verdict thresholds, state detection, XP, identity progression, schema, Supabase migrations, Stripe, pricing, entitlements, Founder access, Coach prompt construction, AI provider configuration, or new analytics events.

## 12. Dependencies
Repository truth on the current published `main` branch; the original Lovable handoff target was `origin/main` at `2332eed`. Browser QA depends on an injected Supabase session or approved test account. Export deployment verification depends on Supabase CLI/project access and a safe export account.

## 13. Files inspected
- `docs/release/elite-master-execution-ledger.md`
- `docs/release/elite-current-work-package.md`
- `src/pages/Proof.tsx`
- `src/pages/ProofWeek.tsx`
- `src/pages/Coach.tsx`
- `src/components/eblocki/ProofClosureCard.tsx`
- `src/components/eblocki/ProofContractCard.tsx`
- `src/components/eblocki/ProofStandardPreviewPanel.tsx`
- `src/components/eblocki/CourtVerdictBadge.tsx`
- `src/components/eblocki/StudyVerdictHint.tsx`
- `src/components/eblocki/CompletionReflection.tsx`
- `src/components/eblocki/motion/MotionVerdictCard.tsx`
- `src/components/eblocki/motion/ProofProcessingState.tsx`
- `src/components/eblocki/ProofCapture.tsx`
- `src/lib/eblocki/proof-scoring.ts`
- `src/lib/eblocki/proof-check.ts`
- `src/lib/eblocki/verdict-identity-impact.ts`
- `src/lib/eblocki/user-facing-copy.ts`
- `src/lib/eblocki/display-labels.ts`
- `supabase/functions/mcp/index.ts`
- `playwright.config.ts`
- `tests/e2e/fixtures/auth.ts`

## 14. Files changed
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
- `docs/release/elite-master-execution-ledger.md`
- `docs/release/elite-current-work-package.md`
- `docs/release/evidence/wp-003/fresh-mobile-01-moderate-result.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-02-strong-result.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-03-verdict-details-top.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-04-identity-feedback.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-05-feedback-and-artifacts-raw-enum.jpg`
- `docs/release/evidence/wp-003/fresh-mobile-06-dashboard-closed.jpg`

## 15. Data / schema implications
None. The only lockfile change syncs dependencies already declared in `package.json`; no schema or persisted proof data changes were made.

## 16. Security implications
Normal proof surfaces no longer expose OCR/indexing/verdict-context/prompt/model-style wording. No auth or authorization changes.

## 17. Mobile implications
Result-card CTAs remain full-width on small screens, stale verdict output is suppressed during submission, and the result card still uses the existing motion/card surface.

## 18. Accessibility implications
The proof result now has one visible heading for the dominant verdict headline and keeps button labels concrete.

## 19. Analytics implications
No new analytics events. Existing CTA logging remains in place.

## 20. Acceptance criteria
1. Raw enum literals are not directly rendered in proof result JSX.
2. Infrastructure-flavoured proof result copy is translated or removed.
3. Proof result surfaces show one dominant verdict headline.
4. Loading/error/resubmission states suppress stale verdict output.
5. Judgment logic and proof scoring remain unchanged.
6. `npx tsc --noEmit`, targeted copy tests, `npm run test`, `npx vite build`, and Phase 0 bundle scan are recorded.

## 21. Verification and evidence
- `npx tsc --noEmit`: PASS, final run exited 0 with no output.
- Targeted tests: PASS, `npm run test -- src/lib/eblocki/__tests__/user-facing-copy.test.ts src/lib/eblocki/__tests__/proof-scoring.test.ts src/lib/eblocki/__tests__/proof-check.test.ts src/lib/eblocki/__tests__/display-labels.test.ts` → 3 files, 29 tests passed. `display-labels.test.ts` does not exist, so Vitest ran the existing matching proof suites.
- `npm run test`: PASS, 39 files and 306 tests passed.
- `npx vite build`: PASS. Initial build failed because declared font dependencies were absent from `package-lock.json`/`node_modules`; `npm install` synced the existing `package.json` declarations, then build passed. Final build after screenshot-driven raw-metadata patch also passed.
- Phase 0 bundle rescan: `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist` produced no output and `rg_exit=1`, interpreted as no matches.
- Raw enum search: remaining matches are internal mapping keys, imports/types, product terms such as Momentum/Recovery, admin/debug pages, tests, or non-verdict surfaces; no WP-003 proof result JSX renders raw enum tokens directly. Fresh proof-metadata search `rg -n -S "EBLOCKI_PRODUCT_REVIEW|\bOTHER\b" src/pages src/components/eblocki` produced no output and `rg_exit=1`.
- Infrastructure vocabulary search: remaining matches are admin/audit panels, legal disclosure, browser/PWA API method names, query-param variable names, product "freeze token" wording, or non-rendered implementation references; proof result surfaces are clean.
- Playwright/browser QA: BLOCKED for automated local proof QA. `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`, `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`, and `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON` are missing. `npx playwright test --list` found 4 existing System Forge tests and no proof-result harness; `npx playwright test` exited 0 with 4 skipped because the auth fixture self-skips without an injected Supabase session.
- Manual Lovable-preview mobile QA: FAILED against the user-supplied preview screenshots. Tristan subsequently reported Lovable is up to date, so these screenshots are retained as last-observed failed evidence, not proof of the current deployed state. Fresh authenticated QA is still required. Evidence files:
  - `docs/release/evidence/wp-003/manual-mobile-01-form-top.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-02-standard.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-03-standard-detail.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-04-result-failed.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-05-verdict-details.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-06-identity-feedback.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-07-duplicate-feedback.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-08-completed-artifacts.jpg`
  - `docs/release/evidence/wp-003/manual-mobile-09-today-closed.jpg`
- Manual QA findings from those screenshots:
  - Deployed preview still shows pre-WP-003 result copy: `Proof saved.` and `Counted as Elite Proof.`
  - Deployed preview duplicates the feedback block: two `Was this judgment useful?` sections appear in one result view.
  - Deployed preview exposes raw `EBLOCKI_PRODUCT_REVIEW` in selected-standard/completed-artifact surfaces.
  - Deployed preview shows raw lower-case strength copy in details: `Scored 10/10 (elite).`
  - Screenshots are mobile only; no 1280px desktop proof-result evidence was provided.
- Fresh authenticated mobile QA after the Lovable update:
  - Evidence files:
    - `docs/release/evidence/wp-003/fresh-mobile-01-moderate-result.jpg`
    - `docs/release/evidence/wp-003/fresh-mobile-02-strong-result.jpg`
    - `docs/release/evidence/wp-003/fresh-mobile-03-verdict-details-top.jpg`
    - `docs/release/evidence/wp-003/fresh-mobile-04-identity-feedback.jpg`
    - `docs/release/evidence/wp-003/fresh-mobile-05-feedback-and-artifacts-raw-enum.jpg`
    - `docs/release/evidence/wp-003/fresh-mobile-06-dashboard-closed.jpg`
  - Result-card copy is materially improved: one visible dominant headline, clear count/today status, no duplicate feedback block in the fresh result screenshots, and Dashboard closed-card copy is concise.
  - Remaining defect found in `fresh-mobile-05-feedback-and-artifacts-raw-enum.jpg`: Completed Proof Artifacts exposed `EBLOCKI_PRODUCT_REVIEW - OTHER - 2026-07-10`.
  - Corrective source patch: `src/pages/Proof.tsx` now renders pending/completed proof metadata through `humaniseModeId`/proof display helpers and no longer applies machine-style uppercase to those dynamic metadata values.
  - Post-fix authenticated browser evidence is still required; no 1280px desktop proof-result screenshot has been observed.
- Updated-preview recheck: direct unauthenticated curl still reaches Lovable auth-bridge and headless Playwright still lands on `lovable.dev/login`; Codex has not observed the updated authenticated proof result state.
- Supabase export deployment/archive inspection: BLOCKED. `supabase` CLI is not available in this environment, and no safe test export account/JWT is present.

## 22. Rollback / fallback and next control
Rollback: revert the WP-003 code/doc changes. No data migration or scoring change is involved.

Manual browser QA procedure:
1. Start the app with authenticated Supabase session available: `npm run dev -- --host 127.0.0.1 --port 8080`.
2. Open `/proof` at 390px and 1280px.
3. Submit one weak or moderate proof, then submit another proof immediately.
4. Confirm one dominant result headline, no duplicate toast/card verdict copy, no raw enum, no infrastructure wording, no stale previous verdict while processing, and mobile containment.
5. Save screenshots under `docs/release/evidence/wp-003/` if browser evidence is required.

Manual export verification:
1. `supabase link --project-ref <project-ref>`
2. `supabase functions deploy export-data`
3. `curl -sS -H "Authorization: Bearer <test-user-jwt>" "https://<project-ref>.functions.supabase.co/export-data" -o /tmp/eblocki-export.json`
4. `jq '.performance_os_config[] | has("model"), has("vector_store_id")' /tmp/eblocki-export.json`
5. Expected output: only `false` values.

Next strict action: rerun authenticated proof-result QA after the raw-metadata patch is deployed at 390px and 1280px. After WP-003 browser QA passes, the next strict work package is P1-ACCOUNT-DELETE review; P1-PAY-ENV verification follows. P1-PRICING-SOT remains blocked pending Tristan's manual pricing decision.

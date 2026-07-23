# Work Package WP-IMPROVEMENT-LOOP-01 — Verdict, Gap, and Correction Surface v1

- Governing control: **out-of-sequence product refinement draft**
- Release-sequence dependency: **WP-005A / P1-PAY-ENV VERIFICATION** remains the next strict executable release gate.
- Merge policy: draft PR only; do not merge ahead of WP-005A and unresolved external gates.

## 1. Work-package ID
WP-IMPROVEMENT-LOOP-01.

## 2. Governing control
Product-refinement slice for proof-result clarity. This is not a replacement for the active Phase 1 trust/commercial release gate.

## 3. Phase
Out-of-sequence draft refinement, built on `origin/main` after WP-004.

## 4. Priority
P2 product clarity, blocked from merge by P1 release sequencing.

## 5. Objective
Make the proof-result experience answer, without changing scoring or persistence:
- what this evidence proves,
- the smallest important gap currently available from existing data,
- what the user should do differently next,
- what artifact should be submitted to test that correction.

## 6. User problem
The previous proof result showed a verdict and next command, but the gap was buried in details and the correction artifact was not presented as a clear improvement loop. Users had to infer the sequence from `Count status`, `Today status`, `One next command`, and collapsed standard details.

## 7. Trust harm
If result copy implies a precise weakness or next correction that the existing scoring data does not actually identify, verdict trust degrades. The product must distinguish known standard-level gaps from absent gap/correction data.

## 8. Current behaviour (pre-WP-IMPROVEMENT-LOOP-01)
- `src/pages/Proof.tsx` built a local `Verdict` object after persistence.
- `proofResultCopy()` supplied headline/count/today/next-command copy.
- `ProofVerdictDetails` separately rendered `missingStandard`, required evidence, selected standard, and identity impact.
- The result hierarchy did not make `verdict -> named gap -> targeted correction` the primary visible sequence.
- The corrected-attempt action cleared the result but did not preserve mode/proof-type/correction context.

## 9. Expected behaviour
- Primary result hierarchy is:
  1. What this proves
  2. The main gap
  3. What to do next
  4. What to submit next
  5. Verdict details behind disclosure
- Gap and correction are null/honest when the existing verdict data does not support them.
- The corrected-attempt action uses the existing `/proof` route and supported `mode` / `contract` query params only.
- No database schema, scoring thresholds, proof engine, route, Stripe, XP, Coach, forecast, identity, or System Forge mechanics change.

## 10. Scope
- `src/lib/eblocki/user-facing-copy.ts`
- `src/pages/Proof.tsx`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- Release documentation only.

## 11. Non-scope
No scoring changes, Supabase schema changes, migrations, new routes, AI calls, network requests, broad landing-page redesign, XP/identity redesign, Coach/GameForge/System Forge changes, billing changes, or forecast deletion.

## 12. Dependencies
- Active release dependency: `WP-005A / P1-PAY-ENV VERIFICATION`.
- Browser proof-submission QA dependency: authenticated E2E credentials or an approved local browser session. Current environment has neither.

## 13. Root cause
- Verdict copy was canonicalized for WP-003, but gap and correction presentation remained split between the primary result card and collapsed details.
- Available gap data is standard-level (`missingStandard` / `requiredEvidence`), not an exact missing criterion from a per-criterion detector.
- Correction data is `nextUpgrade`, either user-entered or scoring fallback, and may be absent.
- Mode/proof-type context existed at submit time but was not carried into the local verdict object for the corrected-attempt action.

## 14. Files inspected
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

## 15. Files changed
- `src/lib/eblocki/user-facing-copy.ts`
- `src/pages/Proof.tsx`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- `docs/release/elite-current-work-package.md`
- `docs/release/elite-master-execution-ledger.md`

## 16. Data / schema implications
None. No migrations, table changes, enum renames, stored data removals, or new relationships.

## 17. Security implications
No new secrets, network calls, AI calls, or raw artifact logging. Corrected-attempt analytics reuse the existing event name and whitelist, logging only route/source/CTA/destination.

## 18. Mobile implications
The primary result card keeps full-width mobile actions, `break-words` text wrapping, and existing safe-area layout. Browser screenshots could not be captured because `/proof` redirects to `/auth` without credentials.

## 19. Accessibility implications
The result card receives focus after a fresh verdict. Loading uses a short polite status line. The result card has `aria-labelledby="proof-result-heading"`. Details remain behind native `<details>` disclosure with an accessible summary.

## 20. Analytics implications
No new analytics taxonomy. Existing `proof_verdict_viewed`, `activation_verdict_shown`, `proof_verdict_cta_clicked`, and `activation_verdict_cta_clicked` are reused. No raw artifact, verdict explanation, or correction body is logged.

## 21. Acceptance criteria
1. Deterministic presentation helper covers strong, moderate, weak/rejected, absent gap, absent correction, empty, loading, and error states.
2. Internal enum values are humanised in visible fields.
3. Infrastructure terms are suppressed from visible presentation fields.
4. Primary result shows one dominant verdict headline, one gap region, one correction region, and one expected next artifact where available.
5. Corrected-attempt action uses existing `/proof` route and supported query parameters only.
6. No scoring, persistence, schema, route, or billing change.

## 22. Verification and evidence
- `git diff --check` -> PASS, exit 0.
- `npx tsc --noEmit` -> PASS, exit 0, no output.
- Targeted tests: `npm run test -- src/lib/eblocki/__tests__/user-facing-copy.test.ts` -> PASS, 22 tests.
- Full tests: `npm run test` -> PASS, 39 files, 318 tests.
- Build: `npx vite build` -> PASS, existing large chunk warning remains.
- Bundle confinement scan:
  `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist`
  -> no output, `rg_exit=1`, interpreted as no matches.
- Source vocabulary scan:
  `rg -n -iS '\b(model|vector|embedding|retrieval|prompt|llm|openai|token)\b' src/pages src/components/eblocki`
  -> matches classified as legal/admin/model-audit copy, PWA install API, coach query-param/quick-prompt labels, `dashboard-view-model` imports, product "freeze token" wording, and temporal trajectory implementation labels. No new proof-result primary copy match from this package.
- Enum scan:
  `rg -n -S 'EBLOCKI_[A-Z_]+|GENERAL_EXECUTION|accepted_strong|accepted_useful|accepted_minimum|elite_evidence|evidence_strength|proof_tier|quality_score|artifact_type|low_energy|hype_drift|academic_displacement|strategic_build|locked_in' src/pages/Proof.tsx src/components/eblocki src/lib/eblocki/user-facing-copy.ts`
  -> matches classified as internal DB column names, internal enum mapping keys, badge/style maps, tests, and safe translation helpers. No new primary proof-result text renders raw enum values.
- Browser plugin QA:
  - 390px `/proof` -> redirected to `/auth`, title `Sign in | EBLOCKI`, no proof result visible.
  - 1280px `/proof` -> redirected to `/auth`, title `Sign in | EBLOCKI`, no proof result visible, auth page horizontal overflow false.
  - Existing authenticated Playwright spec: `npx playwright test tests/e2e/wp-003-verdict-copy-qa.spec.ts` -> 3 skipped because E2E credentials/storage state are not configured.

## 23. Browser evidence
No proof-result screenshots were created for this package. The browser requirement remains BLOCKED by missing authenticated E2E credentials or local session. Do not report mobile/desktop proof-result visual QA as passed.

## 24. Rollback
Revert:
- `src/lib/eblocki/user-facing-copy.ts`
- `src/pages/Proof.tsx`
- `src/lib/eblocki/__tests__/user-facing-copy.test.ts`
- this work-package doc update
- the ledger section for `WP-IMPROVEMENT-LOOP-01`

No data rollback is required.

## 25. Status
**PARTIALLY COMPLETE**.

Code, tests, build, and scans are complete. Authenticated browser proof-submission/result QA is blocked. Merge is blocked by active release sequencing (`WP-005A / P1-PAY-ENV VERIFICATION`) and by missing browser evidence unless explicitly approved as partially verified.

## 26. Next strict work package
Per the release ledger, the next strict release package remains **WP-005A — P1-PAY-ENV VERIFICATION**. `WP-IMPROVEMENT-LOOP-01` must remain draft/out-of-sequence until that gate is handled or Tristan explicitly changes release order.

---

# Historical Work Package Record Retained Below

# Work Package WP-004 — P1 Account Delete hardening

- Governing control: **P1-ACCOUNT-DELETE** (Phase 1)
- Master-plan sections: Trust/Reliability, Commercial integrity, Data-lifecycle
- Supersedes WP-003 as the active current work package (WP-003 flipped to VERIFIED COMPLETE 2026-07-11).

## 1. Work-package ID
WP-004.

## 2. Governing control
P1-ACCOUNT-DELETE.

## 3. Phase
Phase 1 — Trust and release blockers.

## 4. Priority
P1.

## 5. Objective
Make account deletion complete, safe, and trust-preserving:
- Cancel any active Stripe subscription before deleting the auth user, so a deleted account can never continue to be billed.
- Paginate the storage purge so users with >1000 proof attachments are not silently truncated.
- Remove the hard-coded manual `delete()` table loop and rely on the `ON DELETE CASCADE` contract already declared on every user-scoped public table.
- Replace the native `window.prompt` destructive confirmation with a mobile-safe shadcn `AlertDialog` that keeps the destructive button disabled until the user types `DELETE`.

## 6. User problem
Deleting an Eblocki account did not cancel the user's live Stripe subscription. Storage purge was capped at 1000 files. Destructive confirmation used a native browser prompt inconsistent with the design system and prone to mobile misfires.

## 7. Commercial / trust harm
A deleted user could remain billed by Stripe with no in-app record. Silent storage truncation left the user's evidence behind after they explicitly requested deletion. A drift-prone manual table list guarantees future user-scoped tables would leak past a delete unless someone remembered to edit the function.

## 8. Current behaviour (pre-WP-004)
- `supabase/functions/delete-account/index.ts` purged storage with a single `list({ limit: 1000 })` call.
- The function iterated a hard-coded list of tables (`proof_artifacts`, `proof_commitments`, `coach_interactions`, `daily_control_sheets`, `performance_os_config`, `user_modes`, `user_onboarding_profiles`, `user_research_profiles`, `push_tokens`, `analytics_events`, `user_roles`, `profiles`) — a subset of the actual user-scoped tables.
- No Stripe subscription cancellation.
- `src/pages/Settings.tsx` used `window.prompt("… Type DELETE to confirm.")` for the destructive action.

## 9. Expected behaviour
- Function cancels any `active` / `trialing` / `past_due` non-`onetime_` subscription for the user, grouped by `environment`, using `createStripeClient(env)`.
- Function paginates storage list/remove.
- Function relies on `ON DELETE CASCADE` from `auth.users` for the remaining table cleanup.
- Settings UI uses `AlertDialog` with typed `DELETE` confirmation and the destructive button disabled until the phrase matches.

## 10. Scope (declared surface)
- `supabase/functions/delete-account/index.ts`
- `src/pages/Settings.tsx`
- `src/components/eblocki/DeleteAccountDialog.tsx` (new)
- `docs/release/elite-current-work-package.md`
- `docs/release/elite-master-execution-ledger.md`

## 11. Non-scope
No changes to Stripe pricing, product, entitlement, Founder access, webhook logic, `create-checkout`, `create-portal-session`, or `payments-webhook`. No schema / migration / RLS / GRANT changes (all user-scoped tables already CASCADE from `auth.users`). No changes to `export-data`, `coach`, or proof surfaces. No new analytics events. No new secrets.

## 12. Dependencies
- `createStripeClient(env)` in `supabase/functions/_shared/stripe.ts` (already exists; used by `create-checkout`, `payments-webhook`, `create-portal-session`).
- `STRIPE_SANDBOX_API_KEY` (already configured). `STRIPE_LIVE_API_KEY` is only present after live provisioning; the function catches per-row cancellation errors so a missing live key on a sandbox-only project does not abort deletion.

## 13. Files changed
- `supabase/functions/delete-account/index.ts`
- `src/pages/Settings.tsx`
- `src/components/eblocki/DeleteAccountDialog.tsx` (new)
- `docs/release/elite-current-work-package.md`
- `docs/release/elite-master-execution-ledger.md`

## 14. Data / schema implications
None. Deletion still relies on `ON DELETE CASCADE` already declared on every user-scoped public table. No DDL touched.

## 15. Security implications
- No new client-exposed secrets.
- Stripe API calls remain server-side and routed through the connector gateway via `createStripeClient(env)`.
- Auth-user deletion still uses the service-role key server-side only.
- Failure modes: Stripe or storage errors are logged with `console.warn` and do not abort auth-user deletion; the user's right to be deleted takes precedence over cleanup completeness. This is intentional and documented in the function header.

## 16. Mobile implications
`AlertDialog` uses the same shadcn primitives already used across the app; destructive button is full-width on the mobile layout via the existing footer stack. `autoCapitalize="characters"` on the confirmation input reduces mobile misfires.

## 17. Accessibility implications
Confirmation `Label` is associated with the input via `htmlFor`. Destructive action is a real `AlertDialogAction` (keyboard-reachable, focus-trapped by Radix), not a raw `Button`.

## 18. Analytics implications
No new events. Existing `EVENTS.account_deletion_requested` still fires immediately before the function call.

## 19. Acceptance criteria
1. `delete-account` cancels active Stripe subscriptions before auth-user delete.
2. `delete-account` paginates storage purge.
3. `delete-account` no longer maintains a manual table delete loop.
4. `Settings.tsx` uses `AlertDialog`; destructive button disabled until `DELETE` typed.
5. `npx tsgo --noEmit` clean.
6. `npm run test` green.
7. `npx vite build` green.
8. Phase 0 bundle rescan: `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist` → no matches.
9. Playwright evidence at 390 px and 1280 px of dialog open, disabled state, enabled state — no actual submission.
10. Ledger + current-work-package updated. WP-004 flipped to VERIFIED COMPLETE only after criteria 1-9 recorded with exact commands.

## 20. External-verification gate
End-to-end Stripe cancellation validation requires a disposable Stripe test-mode account (create test subscription → delete account → verify cancelled in Stripe test dashboard). Recorded as `WP-004-EXTERNAL` and left `BLOCKED — EXTERNAL ACCESS REQUIRED`, mirroring WP-001's pattern.

## 21. Rollback
Revert `supabase/functions/delete-account/index.ts` and `src/pages/Settings.tsx`; remove `src/components/eblocki/DeleteAccountDialog.tsx`. No schema/data changes to unwind.

## 22. Next work package after WP-004
**WP-005A — P1-PAY-ENV VERIFICATION** (`READY / EXECUTABLE`): confirm `PaymentTestModeBanner` never renders when `getStripeEnvironment() === 'live'`, `create-checkout` rejects cross-env price mismatches, and checkout/webhook/portal/subscription reads remain environment-consistent.

**WP-005B — P1-PRICING-SOT CONSISTENCY LOCK** (`BLOCKED — MANUAL COMMERCIAL DECISION REQUIRED`): do not implement until Tristan supplies final Pro monthly, Pro annual, annual discount, Founder price/model, lifetime wording, and refund wording.

## 23. Reconciliation closeout status (2026-07-12)
- Audit report path: `docs/release/eblocki-repository-reconciliation-product-verdict.md` (preserved through PR #99).
- Superseded branch cleanup completed after zero-diff re-verification:
  - remote deleted: `codex/first-proof-post-merge-cleanup-20260629`
  - remote deleted: `tristanxsinclair-sync-update-branches`
- `main` branch protection enabled with strict required checks:
  - `Verify product`
  - `Test, build, and lint`
  - `Playwright (mobile-chromium)`
- Existing external gates remain unchanged and unresolved:
  - `WP-003` authenticated-browser evidence dependency
  - `WP-001` export-data external verification
  - `WP-004-EXTERNAL` Stripe cancellation end-to-end verification

---

## Historical: WP-003 archive

WP-003 (P1-VERDICT-COPY) was flipped to VERIFIED COMPLETE 2026-07-11 after authenticated Playwright reobservation at 390 px and 1280 px. Full record retained in `docs/release/elite-master-execution-ledger.md` and evidence archived under `docs/release/evidence/wp-003/post-fix/`.

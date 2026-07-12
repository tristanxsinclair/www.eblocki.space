# Cross-agent audit + next Master Plan step

## Part A — Audit of prior-agent work

Standard applied: master-plan build-control (Plan → bounded WP → verified evidence → ledger → single-WP handoff), plus RLS/GRANT/secret hygiene, no schema drift, Phase 0 confinement not regressed.

### Contributions inspected since last audit
1. WP-003 reobservation and duplicate-block fix in `src/pages/Proof.tsx` (lines 1604-1652 pre-patch).
2. Post-fix Playwright reobservation at 390 px and 1280 px; 8 screenshots under `docs/release/evidence/wp-003/post-fix/`.
3. Ledger flip: P1-VERDICT-COPY → VERIFIED COMPLETE (2026-07-11).
4. `docs/release/build-control-flow-audit.md` process audit.
5. E2E infrastructure additions (seed script, average-user fixture, WP-003 spec).

### Verdicts

| Item | Verdict | Notes |
|---|---|---|
| WP-003 duplicate-block removal | COMPLIANT | Bounded to `src/pages/Proof.tsx`; no logic change; `tsgo --noEmit` clean; screenshots archived. |
| Reobservation evidence | COMPLIANT | Both viewports captured; scans (infra vocab, raw enum, headline duplication) recorded verbatim. |
| Ledger flip to VERIFIED COMPLETE | COMPLIANT with caveat | Justified — no logic change, screenshots archived. **Caveat:** ledger `Files changed during reobservation` correctly lists only `src/pages/Proof.tsx`, but the higher WP-003 `Files changed` section still enumerates the pre-reobservation superset. Not a violation, but future WPs should distinguish "initial WP edits" from "reobservation-cycle edits" in the same section. |
| P0-CONFINE-AI-EXPORT still BLOCKED | COMPLIANT | Correctly not flipped without deployed archive inspection. |
| P1-PRICING-SOT still NEEDS MANUAL DECISION | COMPLIANT | Not started, correctly gated on Tristan input. |
| E2E infra additions | COMPLIANT | Scoped to `scripts/`, `tests/e2e/`, `docs/testing/`, `.env.example`; env-var-only credentials; no `VITE_` on service-role key; `playwright/.auth/` gitignored. |
| Phase 0 confinement not regressed | PASS | Prior bundle scan still valid; no new client-side model/vector references introduced by WP-003 fix. |
| Schema / RLS / GRANT hygiene | PASS | No DDL touched. |
| Secret / service-role handling | PASS | No secrets in client bundle; delete-account and export-data continue to use service-role server-side only. |

### Systemic weaknesses (carried forward from prior audit)
1. WP files should be amended with `## Widened scope` **before** editing files outside declared surface — still worth enforcing on the next WP.
2. Reobservation cycles must clearly separate "reobservation-cycle files changed" from "initial WP files changed" inside the WP doc.

### Overall verdict
**PASS.** All contributions since the last inspection followed the master-plan build-control standard. No corrective action required beyond the two carry-forward process notes.

## Part B — Next Master Plan step: WP-004 (P1-ACCOUNT-DELETE hardening)

Selected because:
- P1-VERDICT-COPY closed 2026-07-11.
- P1-PRICING-SOT blocked (Tristan decision required).
- P0-CONFINE-AI-EXPORT blocked (external Supabase CLI / test account required).
- P1-PAY-ENV verification requires a deployed live Stripe environment to falsify — partially blocked.
- **P1-ACCOUNT-DELETE is the highest-value P1 item that is fully executable from source right now.**

### Audit of `supabase/functions/delete-account/index.ts` (read-only, done in plan mode)

Findings:

1. **Active Stripe subscription is never cancelled.** The function deletes the `subscriptions` row via `auth.users` `ON DELETE CASCADE`, but does **not** call `stripe.subscriptions.cancel()` for any active subscription. Result: a user who deletes their account can continue to be billed by Stripe with no in-app record. This is a live commercial/trust defect and the strongest reason to run this WP now.
2. **Storage purge silently truncates.** `admin.storage.from("proof-attachments").list(uid, { limit: 1000 })` will leave attachments behind if a user has >1000 files. Should paginate or use `remove` with a wildcard prefix.
3. **Hard-coded table list is redundant and drift-prone.** Every table in the list already has `user_id ... ON DELETE CASCADE REFERENCES auth.users(id)`, so `admin.auth.admin.deleteUser(uid)` cascades to all of them automatically. The manual delete loop:
   - is unnecessary
   - guarantees the list drifts as new user-scoped tables are added (`custom_systems`, `system_reps`, `momentum_state`, `xp_events`, `domain_levels`, `operator_level`, `identity_ledger`, `court_verdicts`, `subscriptions` — none of which are in the loop, and none of which need to be, because CASCADE handles them).
   - hides the real deletion contract behind a manual list.
4. **Destructive UX uses `window.prompt`.** `src/pages/Settings.tsx` line 174 uses a native prompt for a permanent action. On mobile this is easy to misfire and inconsistent with the app's design system. Should be a shadcn `AlertDialog` with explicit "type DELETE" text input and disabled destructive button until match.
5. **No analytics reset on server side.** Client resets PostHog after the response returns; if the client crashes after delete but before reset, the ID stays associated. Minor.
6. **`profiles` is redundantly deleted** — cascade already covers it via `PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.

### WP-004 scope (bounded)

Objective: make account deletion complete, safe, and trust-preserving — no billing after delete, no truncated storage purge, no drift-prone table list, and a proper confirmation modal.

Files to change (declared surface):
- `supabase/functions/delete-account/index.ts` — cancel active Stripe subscription first; paginate storage purge; drop the manual table loop and rely on CASCADE; keep verbose logging.
- `src/pages/Settings.tsx` — replace `window.prompt` destructive flow with a shadcn `AlertDialog` component; keep existing analytics event and toast pattern.
- (New) `src/components/eblocki/DeleteAccountDialog.tsx` — the modal component (typed DELETE confirmation, destructive button disabled until match, loading state).
- `docs/release/elite-current-work-package.md` — overwrite with WP-004.
- `docs/release/elite-master-execution-ledger.md` — record WP-004 entry.

Non-scope:
- No changes to Stripe pricing, product, entitlement, Founder access, or webhook logic.
- No schema / migration / RLS / GRANT changes (all tables already CASCADE from `auth.users`).
- No changes to export-data, coach, or proof surfaces.
- No new analytics events.
- No new secrets.

Dependencies:
- `PAYMENTS_SANDBOX_STRIPE_SECRET_KEY` / `PAYMENTS_LIVE_STRIPE_SECRET_KEY` are already available to edge functions (used by `create-checkout` / `payments-webhook`).
- `createStripeClient(env)` already exists in `supabase/functions/_shared/stripe.ts`.

### Acceptance criteria

1. `supabase/functions/delete-account/index.ts`:
   - Before deleting the auth user, queries `subscriptions` for the user's active rows (`status in ('active','trialing','past_due')` and `stripe_subscription_id` not starting with `onetime_`) grouped by `environment`, and calls `stripe.subscriptions.cancel(id)` on each (using `createStripeClient(env)` per row's environment). One-time (`onetime_`) rows are skipped — nothing to cancel.
   - Storage purge iterates with pagination until `list` returns fewer than page size.
   - Manual table delete loop is removed; a comment documents that CASCADE from `auth.users` covers all user-scoped tables.
   - Cancellation or storage errors are logged but do not abort the auth-user delete once subscription cancellation has been attempted — user must still be able to delete.
2. `Settings.tsx` opens a shadcn `AlertDialog` for delete, requiring the user to type `DELETE` before the destructive button enables. No `window.prompt`.
3. `npx tsgo --noEmit` clean.
4. `npm run test` green.
5. `npx vite build` green.
6. Phase 0 bundle rescan: `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist` → no matches.
7. Playwright at 390 px and 1280 px on `/settings` — screenshot of dialog open + destructive button disabled + enabled state. Do **not** actually submit delete against the injected session (would nuke the test account).
8. Ledger + current-work-package updated. WP-004 flipped to VERIFIED COMPLETE only after criteria 1-7 recorded with exact commands.

### External-verification gate (not part of code completion)

To validate live Stripe cancellation end-to-end, a follow-up manual test with a disposable Stripe test-mode account is required (create test subscription → delete account → verify subscription cancelled in Stripe test dashboard). Recorded as `WP-004-EXTERNAL` and left BLOCKED — EXTERNAL ACCESS REQUIRED, same pattern as WP-001.

### Rollback

`supabase/functions/delete-account/index.ts` and `src/pages/Settings.tsx` are the only production files touched. Revert both files and remove `DeleteAccountDialog.tsx` to restore prior behaviour. No schema/data changes to unwind.

### After WP-004

Next executable strict WP: **P1-PAY-ENV** verification (assert `PaymentTestModeBanner` never renders when `getStripeEnvironment() === 'live'` and `create-checkout` refuses cross-env price mismatches). P1-PRICING-SOT remains blocked until Tristan supplies public prices, Founder terms, refund rules.

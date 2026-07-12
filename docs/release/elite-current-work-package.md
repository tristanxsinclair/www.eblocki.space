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
**P1-PAY-ENV** verification: confirm `PaymentTestModeBanner` never renders when `getStripeEnvironment() === 'live'` and `create-checkout` refuses cross-env price mismatches. **P1-PRICING-SOT** remains `NEEDS MANUAL DECISION` pending Tristan-approved public prices, Founder terms, and refund rules.

---

## Historical: WP-003 archive

WP-003 (P1-VERDICT-COPY) was flipped to VERIFIED COMPLETE 2026-07-11 after authenticated Playwright reobservation at 390 px and 1280 px. Full record retained in `docs/release/elite-master-execution-ledger.md` and evidence archived under `docs/release/evidence/wp-003/post-fix/`.

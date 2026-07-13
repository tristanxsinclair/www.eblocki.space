# Work Package WP-005A — P1 Payment Environment Verification

- Governing control: **WP-005A / P1-PAY-ENV** (Phase 1)
- Master-plan sections: Trust/Reliability, Commercial integrity, Stripe environment separation
- Supersedes WP-004 as the active current work package. WP-004 code remains verified; `WP-004-EXTERNAL` remains blocked on disposable Stripe test subscription access.

## 1. Work-package ID
WP-005A.

## 2. Governing control
P1-PAY-ENV.

## 3. Phase
Phase 1 — Trust and release blockers.

## 4. Priority
P0 release-control item within Phase 1.

## 5. Objective
Verify and harden Stripe environment separation so:
- dev/test cannot accidentally use live resources;
- production cannot accidentally use test resources;
- checkout, webhook, portal, return-page, and entitlement surfaces agree on the intended Stripe environment;
- misconfiguration fails closed before checkout creation, portal creation, or entitlement mutation;
- pricing, Founder terms, refunds, subscriptions schema, and product modules remain unchanged.

## 6. Current behaviour before WP-005A
- Browser mode was derived from `VITE_PAYMENTS_CLIENT_TOKEN`.
- Checkout and portal functions trusted the client-supplied `environment`.
- Webhook mode was chosen from the `?env=` query parameter.
- Checkout accepted any identifier-like lookup key before asking Stripe for a Price.
- Webhook entitlement writes relied on signature verification, but did not compare event/resource `livemode` to the endpoint environment.
- The checkout return page only polled subscription state, but displayed the full session id.

## 7. Environment model
| Environment | App URL | Supabase project | Stripe mode | Checkout function | Webhook endpoint | Portal function | Secret source | Status |
|---|---|---|---|---|---|---|---|---|
| local | `http://127.0.0.1:8080` | `imeghpjrqlmifkltuqdx` from `supabase/config.toml` | Expected `sandbox` | `create-checkout` | `payments-webhook?env=sandbox` | `create-portal-session` | `.env.development` has public test token only; server payment secrets absent | Code/browser verified; payment execution blocked |
| preview | Unknown | Unknown | Expected `sandbox` unless owner config says otherwise | Same functions | `?env=sandbox` | Same function | Dashboard/env access required | BLOCKED — ACCESS REQUIRED |
| staging | Not found in repo | Not found in repo | Not configured | Not configured | Not configured | Not configured | Not configured | Not applicable unless owner creates staging |
| production | `https://www.eblocki.space` | `imeghpjrqlmifkltuqdx` inferred from repo config; dashboard not inspected | Expected `live` | `create-checkout` | `payments-webhook?env=live` | `create-portal-session` | Supabase function secrets/dashboard access required | BLOCKED — ACCESS REQUIRED |

## 8. Implementation scope
- Added a pure shared Stripe environment guard: `supabase/functions/_shared/stripe-config.ts`.
- Reused that guard in:
  - `supabase/functions/_shared/stripe.ts`
  - `supabase/functions/create-checkout/index.ts`
  - `supabase/functions/create-portal-session/index.ts`
  - `supabase/functions/payments-webhook/index.ts`
  - `supabase/functions/delete-account/index.ts` for redacted Stripe-log output only.
- Centralised client publishable-token interpretation in `src/lib/stripe.ts` and `PaymentTestModeBanner`.
- Kept return-page authority read-only and redacted the displayed checkout reference.
- Added deterministic tests in `src/lib/eblocki/__tests__/stripe-environment.test.ts`.
- Added non-secret placeholders to `.env.example` for required server payment guard variables.
- Captured unauthenticated pricing viewport evidence under `docs/release/evidence/wp-005a/`.

## 9. Non-scope
No pricing changes. No Founder-term changes. No refund wording changes. No Stripe product creation. No schema or migration. No subscription table redesign. No Stripe charges. No broad analytics taxonomy. No PR #100 changes. No WP-005B pricing-source implementation.

## 10. Required configuration
Edge Functions now require:
- `PAYMENTS_EXPECTED_ENV` = `sandbox` or `live`
- `PAYMENTS_ALLOWED_RETURN_ORIGINS` = comma-separated exact origins
- `STRIPE_SANDBOX_API_KEY`
- `STRIPE_LIVE_API_KEY`
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
- `PAYMENTS_LIVE_WEBHOOK_SECRET`
- `LOVABLE_API_KEY`

Missing values fail closed. Prefix checks reject obvious test/live key swaps when a Stripe-style key prefix is present. Lovable connection keys or other opaque keys cannot prove account ownership by prefix; dashboard verification remains required.

## 11. Behavioural change
- Checkout rejects:
  - invalid deployment env;
  - env that differs from `PAYMENTS_EXPECTED_ENV`;
  - unknown price lookup keys;
  - disallowed return origins;
  - Stripe Prices whose `livemode` does not match the requested env.
- Portal rejects:
  - invalid or mismatched env;
  - disallowed return origins;
  - Stripe Customers whose `livemode` does not match the requested env.
- Webhook rejects before mutation when:
  - `?env=` is missing/invalid or differs from `PAYMENTS_EXPECTED_ENV`;
  - signature verification fails;
  - event/resource `livemode` differs from the endpoint env;
  - subscription price lookup key is not one of the existing approved keys;
  - one-time checkout is not paid Founder access.
- Checkout return still does not grant entitlement; webhook/database rows remain the authority.
- Payment banner still appears only for sandbox/test public token and not for live public token.

## 12. Files changed
- `.env.example`
- `src/components/PaymentTestModeBanner.tsx`
- `src/lib/stripe.ts`
- `src/pages/CheckoutReturn.tsx`
- `supabase/functions/_shared/stripe.ts`
- `supabase/functions/_shared/stripe-config.ts` (new)
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/create-portal-session/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/payments-webhook/index.ts`
- `src/lib/eblocki/__tests__/stripe-environment.test.ts` (new)
- `docs/release/evidence/wp-005a/pricing-payment-env-390.png` (new)
- `docs/release/evidence/wp-005a/pricing-payment-env-1280.png` (new)

## 13. Data / schema implications
None. No migrations. No enum rename. No stored data removed.

## 14. Security implications
- No raw Stripe secret/webhook key values committed.
- No privileged `VITE_` variables added.
- Edge Function errors are redacted for Stripe keys, webhook secrets, common Stripe object IDs, and JWT-like strings.
- Built client still contains the public Supabase anon JWT, which is expected public client configuration; scans found no Stripe secret prefixes, webhook secrets, service-role key names, or server payment secret variable names in `dist`.
- Return page no longer displays the full checkout session id.

## 15. Acceptance evidence
- `git diff --check` -> PASS.
- `npx tsc --noEmit` -> PASS.
- `npm run test -- src/lib/eblocki/__tests__/stripe-environment.test.ts` -> PASS, 12 tests.
- `npm run test` -> PASS, 40 files, 318 tests.
- `npx vite build` -> PASS.
- `npm run lint` -> PASS with 14 pre-existing warnings, 0 errors.
- Bundle confinement scan:
  `rg -a -n 'vs_[A-Za-z0-9]{6,}|gpt-[0-9]|openai/|EBLOCKI_VECTOR_STORE_ID' dist` -> no matches, `rg_exit=1`.
- Client secret scan:
  `rg -a -o -n '(sk|rk)_(test|live)_[A-Za-z0-9]|whsec_[A-Za-z0-9]|SUPABASE_SERVICE_ROLE_KEY|STRIPE_(SANDBOX|LIVE)_API_KEY|PAYMENTS_(SANDBOX|LIVE)_WEBHOOK_SECRET|LOVABLE_API_KEY' dist` -> no matches, `rg_exit=1`.
- Source secret scan:
  `rg -n -o -S '\b(sk|rk)_(test|live)_[A-Za-z0-9]|\bwhsec_[A-Za-z0-9]|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b|\b(cus|sub|price|prod)_[A-Za-z0-9]{12,}\b' src supabase .github .env.example` -> no matches, `rg_exit=1`.
- Privileged `VITE_` scan:
  `rg -n -S 'import\.meta\.env\.VITE_[A-Z0-9_]*(SERVICE_ROLE|WEBHOOK|SECRET|STRIPE_(SANDBOX|LIVE)|API_KEY|LOVABLE_API_KEY)' src supabase .github .env.example` -> no matches, `rg_exit=1`.
- Browser pricing viewport QA at local test-mode public token:
  - 390px: title `Pricing — Eblocki`, test-mode banner visible, no framework overlay, no horizontal overflow, Yearly toggle interaction worked.
  - 1280px: title `Pricing — Eblocki`, test-mode banner visible, no framework overlay, no horizontal overflow, Yearly toggle interaction worked.
  - Screenshots:
    - `docs/release/evidence/wp-005a/pricing-payment-env-390.png`
    - `docs/release/evidence/wp-005a/pricing-payment-env-1280.png`
  - Console: no app errors; only existing React Router future-flag warnings.

## 16. External verification
Blocked in this environment:
- `supabase` CLI absent.
- `stripe` CLI absent.
- local `.env` and `.env.development` do not contain server payment secrets.
- no dashboard access to inspect Supabase function secrets, Stripe dashboard mode, webhook endpoints, Customer Portal settings, or actual Price/Product mapping.
- no safe test checkout, webhook delivery, portal open, cancellation, or live/test dashboard reconciliation was executed.

Manual verification still required:
1. In Supabase function secrets, set `PAYMENTS_EXPECTED_ENV` and `PAYMENTS_ALLOWED_RETURN_ORIGINS` per environment.
2. Verify sandbox functions reject live-prefixed keys and live functions reject test-prefixed keys.
3. Verify sandbox webhook endpoint uses `?env=sandbox` and sandbox webhook secret; live endpoint uses `?env=live` and live webhook secret.
4. Execute a sandbox checkout for `pro_monthly` and confirm only a sandbox subscription row is written.
5. Replay the same webhook event and confirm the upsert/update path is safe.
6. Execute a failed/incomplete checkout and confirm no entitlement row is written.
7. Open portal from a paid test user and confirm it uses the matching sandbox customer.
8. Verify production function secrets and origins before enabling live checkout.

## 17. Rollback
Revert the files listed in section 12. Remove `PAYMENTS_EXPECTED_ENV` and `PAYMENTS_ALLOWED_RETURN_ORIGINS` from deployment only if rolling back the guard. No schema/data rollback required.

## 18. Status
**PARTIALLY COMPLETE — CODE/TEST/BUILD VERIFIED; EXTERNAL DASHBOARD AND PAYMENT-FLOW VERIFICATION BLOCKED.**

WP-005A may be reviewed as a draft PR, but must not be marked verified complete or merged as a final release gate until the external verification in section 16 is completed.

## 19. Next strict control
1. Close WP-005A external verification with Stripe/Supabase dashboard access.
2. WP-005B remains blocked until Tristan supplies final commercial pricing and terms decisions.

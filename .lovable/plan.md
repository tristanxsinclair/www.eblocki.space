
# Eblocki Commercial Launch Plan — Pro + Founder, Mobile & Desktop

Goal: Ship a flawless, auditable payment + access system so Eblocki is Google-Ads-ready. Free → Pro (subscription) → Founder (contact-to-unlock via admin@eblocki.space). Every step has an explicit audit gate before moving on.

---

## Phase 0 — Baseline audit (no code changes)

**Do:**
- Inspect current `Pricing.tsx`, `CheckoutReturn.tsx`, `BillingCard.tsx`, `UpgradeCard.tsx`, `useSubscription.ts`, `src/lib/stripe.ts`, `supabase/functions/create-checkout`, `create-portal-session`, `payments-webhook`, `_shared/stripe.ts`, `subscriptions` table + RLS, `supabase/config.toml`.
- Confirm `payments-webhook` is signature-verified, env-scoped, and idempotent.
- Confirm `/pricing`, `/checkout/return`, `/settings` routes wired in `App.tsx` (already are).
- Read `.env` / `.env.production` for `VITE_PAYMENTS_CLIENT_TOKEN` presence and prefix (sandbox vs live).

**Audit gate:** Written map of "what exists / what's missing / what's broken" before touching code.

---

## Phase 1 — Products & prices (Stripe managed payments)

Australia-based seller → eligible for full compliance handling. Use `managed_payments: { enabled: true }` (already in `create-checkout`).

**Products to create via `payments--batch_create_product` / `create_price`:**
1. `pro_plan` → price `pro_monthly` — AUD $9/month, recurring, qty 1/1, tax_code `txcd_10103001` (SaaS).
2. `pro_plan` → price `pro_yearly` — AUD $79/year, recurring, qty 1/1.
3. Founder is **not** a Stripe product. Founder is a manual, contact-gated tier (see Phase 4).

**Audit gate:** Prices resolvable via `lookup_keys: ["pro_monthly"]` in sandbox; test checkout returns a `clientSecret`.

---

## Phase 2 — Pricing page: mobile + desktop routing

**File:** `src/pages/Pricing.tsx` (rewrite to full commercial spec).

Structure:
- Hero: "Stop fake productivity. Log proof. Get the next command."
- 3 tier cards: **Free / Pro / Founder** (responsive: single column <768px, 3-col grid ≥768px).
- Pro card CTA: opens embedded Stripe checkout via `useStripeCheckout` hook (already implemented pattern in `UpgradeCard`).
- Founder card CTA: **`mailto:admin@eblocki.space?subject=Founder Access Request&body=...` link + in-app "Request Founder Access" route.**
- Mobile-first spacing, sticky "current plan" indicator when signed in.
- FAQ section (tax, cancel, refund, Founder criteria).
- Trust bar: "Secure payments via Stripe · Cancel anytime · AUD".

Detect device:
- Use existing `useIsMobile` hook for layout switch; **checkout code path is identical** (Stripe embedded checkout works on both). On Capacitor native, use `window.open(url, "_system")` (already handled in `UpgradeCard.handleCheckout`).

**Audit gate:** Manual QA at 375px, 768px, 1280px. All CTAs reachable. `sessionStorage` used to preserve intent through `/auth` bounce for signed-out users.

---

## Phase 3 — Pro checkout flow (embedded)

**Files touched:**
- `src/pages/Pricing.tsx` — wires `useStripeCheckout({ priceId: "pro_monthly" | "pro_yearly", userId, customerEmail, returnUrl: origin + "/checkout/return?session_id={CHECKOUT_SESSION_ID}" })`.
- `src/pages/CheckoutReturn.tsx` — verify session id, poll `subscriptions` row for up to 15s (webhook may lag), show success + "Go to Dashboard".
- `supabase/functions/create-checkout/index.ts` — already correct; verify `verify_jwt = false` in `config.toml` (it is).
- `supabase/functions/payments-webhook/index.ts` — verify `customer.subscription.created/updated/deleted` handlers write env-scoped rows.
- `src/hooks/useSubscription.ts` — verify `.eq('environment', getStripeEnvironment())` filter is present.

**Audit gate:** Sandbox test card `4242 4242 4242 4242` → return page → `subscriptions` row created → `useSubscription` returns `pro` → gated features unlock. Repeat with decline card.

---

## Phase 4 — Founder mode (contact-gated)

Founder is not a self-serve Stripe purchase. It's an application-only lifetime tier granted manually.

**Add:**
- `/founder` route (`src/pages/Founder.tsx`) — pitch page, criteria, CTA `mailto:admin@eblocki.space?subject=Founder Access Application&body=<pre-filled template: name, current proof streak, why founder, commitment>`.
- On Pricing page: Founder card "Apply for Founder" button → `/founder`.
- Admin path: existing `useIsAdmin` + a small "Grant Founder" action in `/dev/beta` (or new `/admin/founder`) that:
  - Inserts a `subscriptions` row with `product_id='founder_manual'`, `price_id='founder_lifetime'`, `status='active'`, `current_period_end=null`, `environment=<current>`, `stripe_subscription_id='manual_<uuid>'`, `stripe_customer_id='manual'`.
  - Access resolver (`priceIdToAccessLevel`) already maps `founder_lifetime` → `founder`. ✓

**Audit gate:** Admin can grant Founder to a test user; `useSubscription` returns `founder`; UpgradeCard shows Founder state; Founder-only features (per `ACCESS_FEATURES.founder`) render.

---

## Phase 5 — Feature gating audit

Ensure the following are properly gated by `hasFeature(accessLevel, ...)`:
- Court of Evidence, Identity Ledger, Sentinel risk, Cortex paths, Weekly executive review, Adaptive coaching, Advanced proof analytics.

For each: locked state shows an `<UpgradeGate>` with a "See plans" link to `/pricing`.

Server-side: any edge function that returns pro-only data must call `has_active_subscription(user_uuid, env)` and return 403 otherwise. Audit `coach`, any analytics functions.

**Audit gate:** Sign in as free user → confirm every pro feature shows lock UI. Sign in as pro → confirm unlocked. Server rejects pro API calls from free users with 403.

---

## Phase 6 — Trust, legal, and marketing readiness

Required before Google Ads:
- `/legal/privacy`, `/legal/terms`, `/legal/data-handling`, `/legal/ai-disclosure` — already exist. Verify each is accurate for paid SaaS (mention Stripe processor, AUD pricing, cancellation, refund window).
- Refund policy: 7-day no-questions refund on Pro monthly (added to Terms + FAQ).
- Landing page (`/`) CTAs route to `/pricing` and `/auth`.
- SEO: `<title>`, `<meta description>`, OG tags on Landing, Pricing, Why, Founder pages (see head-metadata rule).
- `robots.txt`, `sitemap.xml` include `/`, `/pricing`, `/why`, `/founder`, `/legal/*`.
- Conversion tracking: PostHog events on `pricing_view`, `checkout_started`, `checkout_completed`, `founder_application_started`.

**Audit gate:** Lighthouse ≥ perf 0.8 / SEO 0.9 / a11y 0.9 (already enforced in CI). Route-smoke script passes on all new routes.

---

## Phase 7 — Payment go-live

- Confirm Stripe go-live status via `payments--get_go_live_status`.
- If steps 1–3 incomplete: surface to user with `presentation-open-payments` link.
- Once live: `.env.production` gets `pk_live_...`, live webhook auto-registered.
- Test one real $9 charge, then refund via portal.
- `PaymentTestModeBanner` renders red warning if token missing, orange in sandbox, nothing live.

**Audit gate:** Live checkout works end-to-end with a real card; webhook writes `environment='live'` row; Billing Portal opens; refund reflects in `subscriptions.status`.

---

## Phase 8 — Marketing-ready product spec doc

Write `docs/PRODUCT_SPEC.md`:
- One-liner, ICP, value prop, feature matrix by tier, pricing (AUD), refund policy, contact, differentiators, proof of loop, screenshots list to capture.
- `docs/GOOGLE_ADS_LAUNCH.md`: keyword themes, landing page mapping, headline/description variants, negative keywords, conversion event names (matching PostHog + gtag), UTM convention.

**Audit gate:** Docs reviewed; enough to hand to Google Ads without further questions.

---

## Phase 9 — Final release gate

Run the `eblocki-release-gate` skill:
- Route safety, Supabase safety, secret hygiene, payments (test/live not mixed, webhooks, entitlement), UI/UX (375px), compliance, `npm run build`, `npm run test`, `npm run lint`, bundle-size guardrail, Lighthouse.

**Deliverable:** Go/no-go report. On green → publish.

---

## Technical details

**Files created:**
- `src/pages/Founder.tsx`
- `docs/PRODUCT_SPEC.md`
- `docs/GOOGLE_ADS_LAUNCH.md`

**Files modified:**
- `src/pages/Pricing.tsx` (full rewrite to 3-tier commercial spec)
- `src/pages/CheckoutReturn.tsx` (polling + success UX)
- `src/pages/Landing.tsx` (CTAs → /pricing)
- `src/App.tsx` (add `/founder` route)
- `src/components/eblocki/UpgradeCard.tsx` (Founder → /founder, not checkout)
- `public/sitemap.xml`, `public/robots.txt`
- `index.html` (verify head metadata)
- `docs/RELEASE_CHECKLIST.md`

**Stripe artifacts created via tools:** `pro_plan` product, `pro_monthly` and `pro_yearly` prices (AUD, tax_code `txcd_10103001`, managed_payments-eligible).

**No schema changes.** `subscriptions` table already supports manual Founder rows (env-scoped, RLS in place, `has_active_subscription` function handles it).

---

## Reality check on the revenue target

You asked for $1,000 this week and $10,000 this month. I will build the entire commercial system so it is capable of accepting and processing those revenues without friction. **Actual revenue depends on traffic, ad spend, conversion rate, and market fit — none of which code alone controls.** At $9/mo Pro that's ~112 paying customers this week. This plan is what makes each of those conversions possible; the Google Ads doc in Phase 8 is what drives volume. I will not fabricate revenue or fake success states.

---

## Approve to proceed

Reply **"go"** to switch to build mode. I will execute Phase 0 → 9 sequentially, running each audit gate and reporting pass/fail before moving on.

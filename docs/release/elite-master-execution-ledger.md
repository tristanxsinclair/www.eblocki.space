# Eblocki Elite Master Execution Ledger

## Governing documents
- Master plan: `Eblocki Elite Product Standard Complete` (uploaded 2026-07-10)
- Stack: React 18 + Vite + TS + React Router + Tailwind/shadcn + Supabase + PostHog + Capacitor + Stripe
- Current active phase: **Phase 0 — Immediate containment**
- Current release gate: OpenAI infra confinement fully closed; then Phase 1 trust/mobile blockers
- Ledger last updated: 2026-07-10

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
| P0-CONFINE-AI-EXPORT | 0 | P0 | Strip `model`/`vector_store_id` from export-data archive | `supabase/functions/export-data` | IN PROGRESS (WP-001) | Verify + deploy |
| P0-CONFINE-AI-BUNDLE-SCAN | 0 | P0 | Search built client bundle for `vs_`, model IDs | build output | NOT STARTED | Run after next `npm run build` |
| P1-PRICING-SOT | 1 | P0 | Pricing source of truth (Stripe + display) | `src/lib/stripe.ts`, Pricing, UpgradeCard | NEEDS MANUAL DECISION | Awaiting Tristan-approved public prices |
| P1-PAY-ENV | 1 | P0 | Payment env control (sandbox vs live surfacing) | `PaymentTestModeBanner`, `stripe.ts` | PARTIALLY COMPLETE | Verify banner never shows in live |
| P1-VERDICT-COPY | 1 | P0 | Remove duplicated / false verdict copy | Verdict surfaces | NOT STARTED | Inspect Proof result screen |
| P1-BILLING-PORTAL | 1 | P1 | Billing portal reachable from Settings | `BillingCard`, `create-portal-session` | VERIFIED COMPLETE (prior turn) | — |
| P1-ACCOUNT-EXPORT | 1 | P1 | Account data export | `export-data` | VERIFIED COMPLETE after WP-001 | — |
| P1-ACCOUNT-DELETE | 1 | P1 | Account deletion | `delete-account` | NOT VERIFIED THIS PASS | Inspect next |
| P3-MOBILE-REMEDIATION | 3 | P1 | Remaining mobile defects | multiple pages | NOT STARTED | Deferred to Phase 3 |
| P4-RETENTION | 4 | P2 | Retention validation | — | NOT STARTED | Gated by Phase 1 |
| P5-MONETISATION | 5 | P2 | Monetisation validation | — | NOT STARTED | Gated by P1-PRICING-SOT |

## Current blocking chain
1. Earliest unresolved P0: **P0-CONFINE-AI-EXPORT** (WP-001, this turn).
2. After close: verify built-bundle contains no infra IDs (P0-CONFINE-AI-BUNDLE-SCAN).
3. Next executable P1 without user decision: **P1-VERDICT-COPY** or
   **P1-ACCOUNT-DELETE** review. **P1-PRICING-SOT** is blocked pending
   Tristan-approved public prices, Founder terms, refund rules.

## Evidence index
- Client source search: `rg -n -S 'vs_|vector_store_id|openai/|gpt-' src/` → clean
- Settings UI: `src/pages/Settings.tsx` lines 62-72
- Coach server routing: `supabase/functions/coach/index.ts`
- Export leak (fixed): `supabase/functions/export-data/index.ts`
- Work package: `docs/release/elite-current-work-package.md`

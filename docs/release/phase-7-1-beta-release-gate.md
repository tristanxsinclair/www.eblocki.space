# Phase 7.1 — Eblocki Beta Release Gate and QA Proof

Single checklist to decide whether Eblocki is ready for a controlled **5–10 person Proof Week beta**.

**Last run:** 2026-07-06  
**Branch inspected:** `grok/beta-release-gate-20260706-0008` (based on `main` @ `16a97ce`, PR #34 merged)  
**Status keys:** PASS / FAIL / NEEDS MANUAL CHECK / NOT OBSERVABLE

---

## 1. Build and CI status

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | **PASS** | Vite build OK (7.7s local). Bundle warning: `index-*.js` >500 kB (244 kB gzip) — non-blocking for beta. |
| `npm run test -- --run` | **PASS** | **262/262** tests, 34 files (vitest 3.2.6). Includes `temporal-loop-audit`, `dashboard-view-model`, `Dashboard.test.tsx`. |
| `npm run lint` | **FAIL** | **69 problems** (56 errors, 13 warnings). Pre-existing repo-wide debt (`no-explicit-any`, `no-empty-object-type`, `react-refresh/only-export-components`, etc.). Not introduced by Phase 7.1. |
| `npm run lint:eblocki` | **PASS** | Targeted Eblocki/Coach/GameForge surfaces — clean. |
| `npm run smoke:routes` | **PASS** | Local preview @ `127.0.0.1:4173` — all 8 routes returned HTTP 200 with SPA shell. |
| `npm audit` | **FAIL** | 2 vulnerabilities (1 moderate, 1 high) in **esbuild/vite dev toolchain**. Fix requires `npm audit fix --force` → Vite 8 (breaking). Dev-server only; not a runtime production blocker. |
| GitHub Actions — PR #34 | **PASS** | Merged 2026-07-05. `Eblocki Verify`: tests + build passed after `2a502e6` audit fix. |
| GitHub Actions — `main` post-merge (`16a97ce`) | **PARTIAL** | CI job `Verify product`: tests ✅ build ✅ lint:eblocki ✅ route smoke ✅ **npm audit ❌** (moderate threshold). Datadog Synthetics workflow ❌ (missing `DATADOG_*` secrets — pre-existing). |

**Exact CI failures (observable):**
1. `npm audit --audit-level=moderate` — esbuild dev-server advisories (GHSA-67mh-4wv8-2f99, GHSA-g7r4-m6w7-qqqr).
2. Datadog Synthetic tests — `Run Datadog Synthetic tests` step fails immediately (no API/app keys in repo).

---

## 2. Route checks

Verified via `src/App.tsx` route table, `scripts/route-smoke.mjs`, and code inspection.

| Route | Protected | Result | Notes |
|-------|-----------|--------|-------|
| `/` | No | **PASS** | Landing — public, no session required. |
| `/dashboard` | Yes | **PASS** | `Protected` → auth redirect if signed out. Smoke 200 (SPA shell). |
| `/proof` | Yes | **PASS** | Standard preview, submit, verdict flow. `/proof?first=1` smoke 200. |
| `/onboarding` | Yes | **PASS** | 6-step flow; skip → `/dashboard`. |
| `/start-today` | Yes | **PASS** | Also aliased at `/start`. Fastest path → `/proof?first=1`. Smoke 200. |
| `/coach` | Yes | **PASS** | Edge function + deterministic fallback on failure. |
| `/operator` | Yes | **PASS** | Loads operator/domain levels; `if (!user) return null` (minor flash risk). |
| `/gameforge` | Yes | **PASS** | Thin `AppShell` wrapper; no extra auth logic needed. |
| `/proof-week` | Yes | **PASS** | Dedicated page; smoke 200. |
| `/auth` | No | **PASS** | Sign-in/sign-up + forgot password. Smoke 200. |
| `/welcome` | Yes | **PASS** | First-time welcome gate. Smoke 200. |

---

## 3. Auth / new-user checks

| Check | Result | Evidence |
|-------|--------|----------|
| Signed-out user does not crash | **PASS** | `Protected` redirects to `/auth`; public routes render without session. |
| New user can begin onboarding | **PASS** | `/onboarding` upserts `user_onboarding_profiles` + `user_modes`; sets `completed_onboarding: true`. |
| Returning user reaches dashboard | **PASS** | `Auth.tsx` navigates on session; `useAuth` listener-first hydration. |
| No-proof-history state is safe | **PASS** | Dashboard zero-state: “Submit your first proof” → `/proof?first=1`; “See what counts” → `/proof-week`. `seen_welcome` gate → `/welcome` when appropriate. `queryFailed` → degraded status, no crash. |
| Forgot / reset password | **PASS** | Forgot on `/auth`; `/reset-password` handles `PASSWORD_RECOVERY`. |
| Sign-out | **PASS** | Settings `PasswordSecurity` + `signOut()` via `useAuth`. |

---

## 4. Proof flow checks

| Check | Result | Evidence |
|-------|--------|----------|
| Proof type/domain selectable | **PASS** | `Proof.tsx` artifact type + domain fields; mode linkage. |
| Standard preview before submission | **PASS** | `ProofStandardPreviewPanel` (non–first-proof); `FIRST_PROOF_STANDARD_PREVIEW` card for `?first=1`. |
| Required evidence visible | **PASS** | Preview panel shows required evidence + elite version. |
| Contract alignment visible | **PASS** | `proof-contract-alignment` tests + duplicate-contract guard on submit. |
| Submit success is honest | **PASS** | Verdict card only after successful `proof_artifacts` insert. |
| Submit failure is honest | **PASS** | `toast.error` on catch; no fake verdict; attachment/OCR errors surfaced. |
| Verdict / next action appears | **PASS** | `verdict.nextUpgrade` / `extractNextUpgrade`; first-proof simplified verdict + “See my next step” → `/dashboard`. |
| Verdict feedback | **PASS** | `VerdictFeedback` (yes/kind_of/no) → `interest_signals`. |

**Minor gap (non-blocking):** `ProofWeekPanel.tsx` links to `/proof#feedback` but `Proof.tsx` has no `id="feedback"` anchor. Panel is **not mounted** anywhere; live path uses `/proof-week` page + inline `VerdictFeedback`.

---

## 5. Dashboard checks

| Check | Result | Evidence |
|-------|--------|----------|
| One obvious primary command | **PASS** | `CommandHero` when artifacts exist; zero-state CTA when none. |
| Proof Week / first proof entry visible | **PASS** | Zero-state links to `/proof?first=1` and `/proof-week`. |
| Latest verdict / court signal safe | **PASS** | `buildDashboardViewModel()` + `courtSignalFor()`; `isEvidenceStrength()` guard before badges. |
| Empty states work | **PASS** | Zero-artifact card; `queryFailed` degraded branch. |
| Old/partial proof rows do not crash | **PASS** | `dashboard-view-model.test.ts` covers null rows, missing verdict, queryFailed. `safeText()` / `strengthRank()` defaults. |

---

## 6. Mobile checks

Code-level containment audit (Phase 7.3 patterns). **Human device walkthrough not run this pass.**

| Surface | 375px / 390px | Result | Notes |
|---------|---------------|--------|-------|
| Dashboard | Inspected | **PASS** (code) | `mobile-safe-page`, `mobile-safe-card`, `text-wrap-safe`, `min-w-0`, `truncate`, progressive disclosure. |
| Proof form | Inspected | **PASS** (code) | `min-w-0 max-w-full`, `break-words`, `MobileCollapse`, `w-full sm:w-auto` CTAs. |
| No horizontal body scroll | Inspected | **PASS** (code) | `AppShell` `overflow-x-hidden`; containment on primary beta surfaces. |
| Long proof titles contained | Inspected | **PASS** (code) | `break-words` / `line-clamp` on proof cards and verdict rows. |
| Advanced panels collapsed | Inspected | **PASS** (code) | `MobileCollapse` on Proof stats/pending; dashboard `showSecondary`. |
| Buttons tappable | Inspected | **PASS** (code) | Full-width mobile CTAs; bottom nav in `MobileBottomNav`. |
| Coach | Inspected | **PASS** (code) | `text-wrap-safe`, wrapping quick-prompt buttons. |
| Operator / GameForge | Inspected | **NEEDS MANUAL CHECK** | Thinner mobile containment than Dashboard/Proof; deferred per prior gates. |

---

## 7. Supabase safety checks

| Check | Result | Evidence |
|-------|--------|----------|
| Proof writes match generated types | **PASS** | `proof_artifacts` insert fields align with `src/integrations/supabase/types.ts`; `cle_after_proof_insert` trigger handles verdict/XP. |
| Old rows handled safely | **PASS** | Dashboard view-model null guards; conditional badge rendering. |
| Migrations listed | **PASS** | **17 files** in `supabase/migrations/` (20260512 core schema → 20260619 security hardening). No new migrations required for Phase 7.1. |
| No service role key client-side | **PASS** | Client uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` only. `SERVICE_ROLE` appears only in edge functions (server). |
| Coach function deployment | **NEEDS MANUAL CHECK** | `supabase/functions/coach/index.ts` exists; client invokes with JWT. `docs/release/supabase-coach-deploy-checklist.md` states **not deployed by checklist**. `/coach` has deterministic fallback if function unavailable. |
| Production migrations applied | **NOT OBSERVABLE** | Must confirm via Supabase dashboard / `supabase db push` logs. |
| Edge functions (server) | **PASS** (code) | `coach`, `ocr-extract`, `export-data`, `delete-account`, `notify-momentum`, `send-push`, `process-email-queue`, `mcp`. Service-role functions require `service_role` JWT. |

---

## 8. Privacy / safety checks

| Check | Result | Evidence |
|-------|--------|----------|
| No secrets committed | **PASS** | `.env` uses publishable key; no `sk_live` / `SERVICE_ROLE` in `src/`. |
| No therapy/medical/legal advice claims | **PASS** | Coach framed as diagnosis/plan/proof action; legal pages present (`/legal/*`). |
| No guaranteed outcomes | **PASS** | Verdict copy is conditional; temporal audit uses non-certainty language. |
| No fake “AI knows you” claims | **PASS** | `AIDisclosure` route; coach fallback honest about function unavailability. |
| No password logging | **PASS** | Auth errors as message strings only. |

---

## 9. Final verdict

### **READY WITH MINOR RISKS**

Cleared for a **controlled 5–10 person Proof Week beta** after one human mobile walkthrough and production Supabase/coach confirmation.

### Exact blockers

**None proven** that prevent the required first-user loop (onboarding → first proof → standard preview → submit → verdict → dashboard next action).

### Exact next action

Run one signed-in human walkthrough at **375px width** on production URL: `/auth` → onboarding → `/proof?first=1` → submit → `/dashboard` → confirm next command is obvious.

### Minor risks

1. **Repo-wide lint debt** (56 errors) — non-blocking; `lint:eblocki` passes.
2. **CI `npm audit` failure** on `main` — dev-only esbuild; defer major Vite upgrade.
3. **Datadog Synthetics** — fails without secrets; unrelated to beta loop.
4. **Coach Edge Function** production deploy status unknown — fallback covers outage.
5. **Production Supabase migrations** — not verified from repo alone.
6. **Operator/GameForge mobile** — thinner containment; not on critical beta path.
7. **Orphaned `ProofWeekPanel`** + dead `#feedback` anchor — cosmetic; live path uses `/proof-week` + inline feedback.
8. **Bundle size** >500 kB — acceptable for beta.

---

## Verification log (this pass)

```text
npm run build          → PASS
npm run test -- --run  → PASS (262/262)
npm run lint           → FAIL (69 pre-existing)
npm run lint:eblocki   → PASS
npm run smoke:routes   → PASS (8/8 routes, local preview)
npm audit              → FAIL (2 dev-toolchain vulns; fix needs breaking upgrade)
```

**PR #34:** merged `16a97ce` — restored build + temporal loop audit fix.  
**No code fixes applied in Phase 7.1** — inspection found no narrow release blocker requiring code change.
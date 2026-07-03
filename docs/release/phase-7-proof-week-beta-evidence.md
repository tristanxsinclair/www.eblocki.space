# Phase 7 — Proof Week Beta Release Evidence

Final evidence package for the premium-mobile sequence (H1.1–H1.4) leading into a controlled Proof Week beta.

Compiled: 2026-06-19. Companion to `docs/release/phase-7-beta-release-gate.md` and `.lovable/security-scan-result.md`. This document does **not** supersede the release gate — it adds the H1.1–H1.4 evidence captured after that gate was last run.

---

## 1. Beta verdict

**Ready for a 5–10 person Proof Week beta with minor risks.**

The Dashboard and Proof premium-mobile surfaces passed browser QA. The core proof loop was verified end-to-end in an authenticated session. 174/174 tests pass after each pass. Security posture is the most recent `.lovable/security-scan-result.md`: no active tool-reported findings remain.

This is **not** a claim of total production readiness. See sections 8 and 9.

---

## 2. Scope of what is proven

- Dashboard and Proof premium mobile surfaces passed browser QA at 375, 390, 768, and 1440 px.
- Core proof loop verified end-to-end in an authenticated browser session: Dashboard → Proof → Standard preview → Artifact submission → Verdict → Back to dashboard → Dashboard reflects new proof.
- 174/174 unit tests pass after each of H1.1, H1.2, H1.3, H1.4.
- No horizontal overflow at any tested viewport on `/dashboard`, `/proof`, `/coach`, `/operator`, `/gameforge`, `/settings`.
- No `pageerror` events occurred during the tested flows.
- Submit button correctly disables while saving (observed `disabled=true` mid-flight).
- Verdict appears only after successful insert; verdict score is honest (deterministic scorer returned `moderate 6/10` for the QA artifact — no over-claim).
- Dashboard `CommandHero` "Latest verdict" line refreshed to the new verdict on return from `/proof`.
- Mobile bottom navigation is fixed, safe-area aware, and does not cover content (`main` carries `pb-24 md:pb-0`).
- Desktop sidebar layout preserved at 1440 px.
- No engine, schema, auth, Supabase, scoring, Court, Sentinel, temporal, identity-ledger, OCR, attachment, Dashboard-data, or Proof-submission logic was changed during H1.4 or this evidence pass.

---

## 3. Scope of what is NOT proven

The following are **not verified** by this evidence package. Do not state otherwise to testers or stakeholders.

- Not all features are tested. Coach, Operator, GameForge, Modes, Start Today, Onboarding, Settings, Weekly Retro, Sentinel forecasts, Identity Ledger interactions, and Court adversarial flows were not exercised end-to-end in this pass.
- Not all mobile states are tested. Empty-user, partial-data, network-failure, slow-3G, offline, and PWA-installed states were not exercised in this pass.
- Not all edge functions were re-deployed or re-verified in this pass (`coach`, `ocr-extract`, `notify-momentum`, `send-push`). Coach fallback path is in place but live deployment parity was not re-checked here.
- Attachment / OCR upload path was not exercised end-to-end in H1.4 (base submit only, per scope).
- Real-time / multi-tab cases were not verified. A proof submitted in another tab will not appear until the user navigates — by design for this pass, not a live subscription.
- iOS Safari and real-device Android were not used. QA ran headless Chromium at fixed viewports.
- Performance, accessibility, and i18n audits were not run in this pass.
- Payment flows are not in scope (not enabled).
- This is not a claim of full security. See `.lovable/security-scan-result.md` wording rule.

---

## 4. Evidence timeline — H1.1 to H1.4

### H1.1 — Command-First Dashboard
- Files: created `src/components/eblocki/DashboardForecastTabs.tsx`; edited `src/pages/Dashboard.tsx`.
- Behaviour: `CommandHero` now shows Proof Required, Risk if ignored, and Latest Verdict on mobile. Forecast / Evidence / Audit diagnostics collapsed behind one tabbed surface.
- Tests: 174/174 PASS.

### H1.2 — Proof Page Slim
- Files: edited `src/pages/Proof.tsx`.
- Behaviour: Header simplified to "Submit Proof". "What counts as proof?" trimmed to three examples. Definitions and Strength tally wrapped in `MobileCollapse`. Advanced detail fields (reflection, next upgrade, XP flags, attachment) hidden behind a single "Add detail" disclosure that auto-opens if any of those fields already have data. Submit button full-width. Verdict CTAs reordered with "Back to dashboard" as primary.
- Tests: 174/174 PASS.

### H1.3 — Mobile AppShell Bottom Navigation
- Files: created `src/components/eblocki/MobileBottomNav.tsx`; edited `src/components/eblocki/AppShell.tsx`.
- Behaviour: Mobile (`<md`) replaces the horizontal-scroll nav with a fixed 4-slot bottom nav (Dashboard / Proof / Coach / More). More sheet contains Operator, GameForge, Modes, Start Today, Settings, and Sign out. Desktop sidebar preserved.
- Browser QA: 375, 390, 768, 1440 across `/dashboard`, `/proof`, `/coach`, `/operator`, `/gameforge`, `/settings`. No horizontal overflow. Zero `pageerror`. More-sheet → /modes routing confirmed.
- Tests: 174/174 PASS.

### H1.4 — End-to-End Proof Loop QA
- Files: none.
- Authenticated browser session, full loop at 375×1800, smoke check at 390 / 768 / 1440.
- Steps observed: Dashboard renders → bottom-nav `Proof` routes to /proof → "Submit Proof" header + standards card visible → `ProofStandardPreviewPanel` confirmed before `#proof-content` textarea via DOM-order assertion → form filled (mode: "Eblocki Product Review", type: "reflection", title: "QA proof loop test", content: short measurable statement) → submit enabled before, disabled during save → verdict card rendered → CTAs present in the correct order → `Back to dashboard` returned to `/dashboard` → Dashboard `Latest verdict` line updated to `moderate 6/10` and the new artifact title appeared.
- Tests: 174/174 PASS.

---

## 5. Files changed across the premium-mobile sequence

- `src/components/eblocki/DashboardForecastTabs.tsx` (new) — H1.1
- `src/pages/Dashboard.tsx` (edited) — H1.1
- `src/pages/Proof.tsx` (edited) — H1.2
- `src/components/eblocki/MobileBottomNav.tsx` (new) — H1.3
- `src/components/eblocki/AppShell.tsx` (edited) — H1.3
- `docs/release/phase-7-proof-week-beta-evidence.md` (new — this document)

No files changed in H1.4. No backend, schema, migration, RLS, or edge-function changes in any of the four passes.

---

## 6. Test, build, browser QA results

### Tests
- `bunx vitest run` → **174/174 PASS** (24/24 files). Re-run after every pass and again at the time of writing this document.

### Build
- Not run manually during H1.4 or this documentation pass. The Lovable harness runs build automatically on file changes; no build error has been surfaced to the agent. The last full `npm run build` of record (per `phase-7-beta-release-gate.md` §1) passed with a non-blocking >500 kB bundle warning.

### Lint
- Not re-run in this pass. The release gate noted 87 pre-existing repo-wide errors outside touched surfaces. No new lint errors introduced by H1.1–H1.4 touched files.

### Browser / mobile QA
- Headless Chromium via Playwright, authenticated via injected Supabase session.
- Viewports: 375×1800, 390×1800, 768×1800, 1440×1800.
- Routes: `/dashboard`, `/proof`, `/coach`, `/operator`, `/gameforge`, `/settings`.
- Horizontal-overflow probe: `document.documentElement.scrollWidth === clientWidth` at every viewport/route. Result: no overflow.
- `pageerror` listener attached on every page. Result: zero.
- End-to-end loop assertions captured in `/tmp/browser/qa/screenshots/loop/`.

### End-to-end proof loop
- **Completed.** Artifact inserted, verdict observed (`moderate 6/10`), dashboard reflected the new proof on return.

---

## 7. Security posture summary

Authoritative source: `.lovable/security-scan-result.md` (2026-06-19).

- Scanner output: `connector_security_scan` 0, `supabase_lov` 0, `supabase` 2 items both classified as accepted posture (`pg_net` in `public` for `pg_cron`; `public.has_role` execute permission required by RLS).
- Remediated this cycle: `analytics_events` insert policy, `user_roles` restrictive write-lock, pinned `search_path` on 4 pgmq wrappers, `EXECUTE` revoked from PUBLIC on 6 SECURITY DEFINER functions, edge-function auth checks and JWT requirements tightened.
- Wording rule (enforced): never say "Eblocki is fully secure". Only say **"no active tool-reported findings remain after the latest remediation pass."**
- Next checkpoint: rerun the security scan immediately before sending beta invites and confirm no new findings, accepted-posture items still accepted, user-data isolation holds for proof/analytics/roles/profile.

---

## 8. Remaining risks

Carried from `phase-7-beta-release-gate.md` §9 and updated with this pass:

- Repo-wide lint debt (87 errors / 13 warnings) outside touched surfaces — non-blocking, scheduled for separate cleanup.
- Main bundle >500 kB gzipped ~228 kB — acceptable for a controlled beta; code-splitting deferred.
- GitHub Actions CI status not observable from sandbox — verify on PR before sharing the beta link.
- Coach Edge Function live deployment parity not re-verified this pass. Fallback path covers outage but production parity should be checked against `supabase-production-alignment.md`.
- Tablet (768 px) currently uses the desktop sidebar (bottom-nav is `md:hidden`). If tablet-portrait users expect bottom-nav, switch the breakpoint to `lg`.
- Real-device walkthrough on iOS Safari and Android Chrome at 375 px is recommended before public invites.
- Attachment + OCR path not exercised end-to-end in H1.4. Tested earlier in Phase 7 but not in this pass.
- Live multi-tab / realtime sync of new proofs is not implemented; Dashboard refreshes only on navigation/remount.
- Beta-tester account state variance (no modes, no contracts, no artifacts, partial onboarding) was sampled but not exhaustively walked. The activation panel renders correctly when `allArtifacts.length === 0`.
- One harmless console warning observed during QA (`Unknown message type: RESET_BLANK_CHECK` from `cdn.gpteng.co/lovable.js`). This is the Lovable preview shim, not app code.

---

## 9. Beta launch recommendation

**Ship Proof Week beta to 5–10 invited testers, with the listed risks acknowledged and the manual checklist below executed first.**

Do not promote to broader launch until:

- Beta feedback from at least 3 testers has been recorded via the verdict-level feedback control or `proof-week-feedback-plan.md`.
- Real-device mobile walkthrough on iOS and Android Chrome is completed.
- Security scan is re-run immediately before invite send.
- Coach Edge Function live deployment is re-confirmed.
- At least one full proof loop is observed by a non-author tester end-to-end without assistance.

---

## 10. Manual beta checklist (do before sending invites)

- [ ] Re-run security scan; confirm zero new findings; accepted-posture items still accepted.
- [ ] Confirm GitHub Actions CI green on the PR that ships H1.1–H1.4.
- [ ] Re-confirm `coach` edge function is deployed and responding on production project.
- [ ] Sanity-check `/dashboard`, `/proof`, `/onboarding`, `/start-today`, `/coach`, `/settings` on a real iPhone (375–390 CSS px) and a real Android device.
- [ ] Submit one real proof end-to-end on a real device; verify verdict and dashboard update.
- [ ] Sign out on mobile via the More sheet; sign back in; confirm session restore.
- [ ] Confirm Privacy and Terms routes render publicly (`/legal/*`).
- [ ] Confirm beta invite copy does not promise outcomes, grades, income, therapy, legal, medical, or financial advice.
- [ ] Confirm `.env` is gitignored and no secrets are committed.
- [ ] Save this evidence document + the security-scan result alongside the invite-send record.

---

## 11. Exact claim limits

Permitted public claims for the beta period:

- "Dashboard and Proof premium mobile surfaces passed browser QA."
- "Core proof loop was verified end-to-end in an authenticated session."
- "174/174 unit tests passed after each pass."
- "No horizontal overflow was found at tested viewports (375, 390, 768, 1440)."
- "No page errors occurred during the tested flows."
- "No engine, schema, auth, Supabase, scoring, Court, Sentinel, temporal, identity-ledger, OCR, attachment, Dashboard-data, or Proof-submission logic was changed in the QA pass."
- "The app is ready for a small controlled Proof Week beta, subject to the listed risks."

Prohibited claims:

- "Fully secure."
- "Fully production ready."
- "All features tested."
- "All mobile states tested."
- "All edge functions deployed."
- "All attachment / OCR paths verified."
- "All realtime / multi-tab cases verified."
- "Guaranteed grades, income, therapy, legal, medical, or financial outcomes."
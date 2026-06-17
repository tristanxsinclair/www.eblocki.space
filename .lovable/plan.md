
# Eblocki — Full Product Audit (Plan Mode, no edits)

Inspected (read-only): `package.json`, `src/App.tsx`, `src/components/eblocki/AppShell.tsx`, `src/pages/Dashboard.tsx` (595 LOC), `src/pages/Proof.tsx` (1242 LOC), `src/pages/Onboarding.tsx` (801 LOC), `src/pages/Welcome.tsx` (335), `src/pages/Coach.tsx` (526), `src/pages/Landing.tsx`, `src/pages/Settings.tsx`, `src/pages/StartToday.tsx`, `src/pages/ProofWeek.tsx`, `src/pages/Operator.tsx`, `src/pages/GameForge.tsx`, `src/components/eblocki/*`, `src/hooks/useAuth.tsx`, `src/hooks/useDailyObjectives.ts`, `src/hooks/useMomentum.ts`, `src/integrations/supabase/client.ts`, `src/index.css`, the supabase migrations list and edge functions list, and recent docs under `docs/release/`. Mobile screenshots provided by the user at ~390px were also reviewed.

I did NOT execute tests, build, or lint in this pass — this is a plan, not a verification run.

---

## 1. BLUF

Eblocki has unusually strong **doctrine, copy, and behavioural systems** for a beta-stage app. The Compound Level Engine, Court of Evidence, identity ledger, proof scoring, temporal engine and Proof Week loop already exist in code and are wired to Supabase. The visual language (operator console, lime/cyan on near-black) is distinctive and on-brand.

What is holding it back from feeling elite:

1. **Dashboard cognitive load.** `Dashboard.tsx` is 595 LOC and renders Command Hero + Proof Week + Forecast + Evidence + Identity + Diagnostics + Retro on one route. Even with `MobileCollapse`, a first-time user sees too many zones before they have any proof. The screenshots confirm this — Zone 2/Zone 3/Pending/Evidence all appear before the user has earned them.
2. **Proof page is huge** (1242 LOC). One file owns artifact type, attachment + OCR, scoring preview, submit, verdict, contract alignment, and identity escalation. High change-risk surface and slow comprehension for a beta tester.
3. **Onboarding → first proof is not a single funnel.** Welcome (5 steps) → /dashboard → /proof is three different visual languages. The "Create First Proof" CTA exists on dashboard but the user has no scaffolding inside `/proof` that says "this is your first one, here is the smallest acceptable artifact".
4. **Navigation is wide for a beta.** 7 top-level nav items (Dashboard, Start Today, Proof, Coach, GameForge, Operator, Settings) on mobile horizontal scroll — too many destinations for a 5–10 user Proof Week.
5. **Trust/clarity micro-debt.** Several panels (Temporal Intelligence, Temporal Model Audit, Product Match, Interest Signal) are visible to brand-new users with zero data, which makes the app look like a dashboard demo rather than a tool that earns its panels.

Nothing in the inspected code is unsafe or fake. The blockers are **surface area and disclosure discipline**, not architecture.

---

## 2. Current product map

Routes (from `src/App.tsx`):

- Public: `/`, `/auth`, `/reset-password`, `/install`, `/legal/*`, `/why`
- Protected: `/welcome`, `/onboarding`, `/dashboard`, `/operator`, `/gameforge`, `/coach`, `/sheet`, `/start`, `/start-today`, `/proof`, `/proof-week`, `/modes`, `/modes/:modeId`, `/settings`, `/dev/engine`, `/dev/beta`

Major systems present in `src/lib/eblocki/`:

- Proof scoring + standard preview + contract alignment
- Compound Level Engine (DB triggers in migrations + `level-engine.ts`)
- Court of Evidence (`court_verdicts` table + `CourtVerdictBadge`)
- Identity Ledger
- Momentum + Proof Week
- Temporal engine + calibration + intelligence score + model audit
- Mode templates, mode scoring, mode progress
- Interest signals, product matching, next-upgrade extraction
- Coach engine + router + system prompt (Supabase `coach` edge function)
- GameForge (separate engine under `src/lib/gameforge/`)
- Intervention memory, integrity rules, QA checks

Edge functions: `coach`, `delete-account`, `export-data`, `notify-momentum`, `ocr-extract`, `process-email-queue`, `send-push`.

Storage: `proof-attachments` (private).

---

## 3. Strengths (only what files actually show)

- **Doctrine is encoded, not just marketed.** `proof-scoring.ts`, `cle_*` SQL functions, `court_verdicts`, `identity_ledger` and the verdict-driven XP multipliers in `cle_after_proof_insert` are real — the app actually rejects vague/duplicate proof.
- **Mobile safety rail.** `index.css` has `mobile-safe-page`, `mobile-safe-card`, `text-wrap-safe`, `contained-scroll`, plus body-level `overflow-x: hidden`. `MobileCollapse` is used on dashboard and proof.
- **Auth is clean.** `useAuth` follows the correct order (listener before getSession), `Protected` route gate is simple, and the recent password recovery work is intact.
- **Honest empty/error handling.** Dashboard has `queryFailed` state; Proof shows verdict only after successful insert; coach has a deterministic fallback.
- **Strong visual identity.** Lime `78 95% 56%` + cyan `196 92% 56%` on `222 30% 6%`, mono headings, grid background — distinct, not template.
- **Copy is sharp.** "Momentum is earned, not faked", "Done and yes are rejected on purpose", "Shallow streaks get flagged". Most apps would soften this; Eblocki doesn't.
- **No fake AI claims.** Coach copy frames itself as deterministic + LLM-assisted; no therapy/medical/legal guarantees in inspected files.

---

## 4. Major blockers (P0/P1 candidates)

1. **Dashboard reveals advanced zones before they are earned.** Zone 2 (Forecast/STANDBY), Zone 3 (Evidence 0/0/0), Pending Proof "No active contract" and Temporal panels render on a zero-artifact account. New users read this as "the app is empty / I am behind" instead of "I have not produced proof yet". (Ref: `src/pages/Dashboard.tsx` ~lines 210–460; screenshots IMG_2224/IMG_2225.)
2. **Proof page weight.** `Proof.tsx` at 1242 LOC mixes capture, OCR, scoring preview, identity escalation, verdict view. First-time clarity suffers; regression risk per edit is high. (Ref: `src/pages/Proof.tsx`.)
3. **Mobile nav width / destination count.** AppShell exposes 7 nav items with horizontal scroll on mobile (`overflow-x-auto`). The user sees "DASHBOARD / START TODAY / PROOF / …" cut off — first impression in IMG_2224 confirms this. (Ref: `AppShell.tsx` lines 24–47.)
4. **Welcome → Dashboard → Proof handoff is not a guided first proof.** `Welcome.tsx` (5 steps) does not deep-link the user into `/proof?first=1` with a minimal-friction first artifact. The user lands on a full dashboard instead.
5. **Two onboarding entry points.** `/welcome` and `/onboarding` both exist and both gate via different signals. `Dashboard` checks `seen_welcome` and redirects to `/welcome`; `/onboarding` is separate. This is a quiet trap — easy to ship inconsistently.
6. **`any` types in Dashboard state** (`useState<any>(null)`, `useState<any[]>([])`). Runtime-safe today, but masks any future Supabase schema drift. Type debt = beta-fragility.
7. **Capacitor pulled in but mobile-app posture undeclared.** `@capacitor/*` are dependencies; for a 5–10 person web beta we should not be shipping native shells, and the dev shouldn't be confused about which surface the beta uses.

---

## 5. Tiny improvement opportunities

Copy / labels:
- Dashboard chips "Proof / Coach / Start / Modes" repeat the nav. On mobile, drop "Start" and "Modes" from the header row; keep them only in nav.
- "Command surface" is great branding but useless as a page title for a beta tester. Add a subline: "Your proof for today."
- "PROOF REQUIRED — One artifact: visible artifact. One standard: General Proof Standard. Timebox 25 minutes." has a duplicated word ("artifact: visible artifact"). Tighten to "One visible artifact. Standard: General Proof. Timebox 25 min."
- "FUTURE PATH — current path - low" reads like a debug string. Replace with a sentence: "Your current trajectory is low. One proof today changes it."
- Proof Week "Activate: Submit your first proof artifact." — drop "Activate:" prefix; the verb is already in the button.

Spacing / hierarchy:
- `space-y-5` on dashboard makes every section equally loud. Increase to `space-y-8` between zone groups and `space-y-3` within a zone so Zone 1 visually dominates.
- Section headers ("ZONE 2 / Forecast / STANDBY") should be `text-[10px]` muted, not bold — they currently compete with the actual content.

Empty / loading states:
- `Dashboard` Pending Proof empty state says "No active contract. Open Coach to forge one." — better: "No proof contract yet. Submitting today's artifact creates one automatically."
- Evidence card 0/0/0 should hide the AVG cell when artifacts === 0 and show "Your first artifact will appear here."
- `loading` UI in `Protected` is "Loading…" mono text. Replace with a Crosshair pulse so first-paint feels owned by the brand.

Buttons:
- "Submit today's proof" + "Get command" two buttons compete. Make "Submit today's proof" the only primary; "Get command" should be a small text link.
- Proof page "Create First Proof" → `/proof?first=1` query and switch to a stripped layout.

Microcopy on Proof:
- Onboarding step 4 promises "Lock in evidence. Done and yes are rejected on purpose." But `/proof` doesn't reinforce that with an inline rule on the textarea. Add helper text under the artifact textarea: "Describe what an external observer could verify. 'Done' is auto-rejected."

Mobile containment:
- AppShell nav uses `overflow-x-auto` — replace on mobile with a 4-icon bottom bar (Dashboard / Proof / Coach / Settings) and move the rest behind a "More" sheet. The horizontal scroll on first paint reads as broken (visible in IMG_2224).
- The dashboard header CTA row wraps to two lines on 390 px. Collapse to a single primary "Submit proof" CTA on mobile.

Analytics:
- `logEvent("dashboard_section_opened", …)` is logged on toggle but not on first paint impression. Add `dashboard_zone_visible` once per session per zone so we can measure who actually reaches Zone 3.
- Add `first_proof_started` and `first_proof_submitted` events with elapsed seconds — this is the core beta metric.

Accessibility:
- Lime on near-black hits ~7:1 — fine. But the cyan on dark in panels can drop below 4.5:1 for body text; audit `text-muted-foreground` over `bg-card/40`.
- Buttons in AppShell are `min-h-[44px]` ✓, but the bottom-sheet drawer in Proof attachment lacks `aria-label` on the X close.
- Add `<main id="main">` skip-link from header.

Performance:
- `Dashboard` fetches 8 queries in parallel including a 200-row `proof_artifacts` and 200-row `court_verdicts`. For a beta this is fine, but cap at 60 days and add a `lt('created_at', cutoff)`. The temporal engine doesn't need 200 rows for a 7-day window.
- `ProofWeekPanel` receives `artifactDates` derived in render. Memoise (`useMemo`) to avoid re-running on every Dashboard re-render.

Privacy clarity:
- Settings has export/delete + sign-out ✓. Add a single sentence near export: "Export includes proof artifacts, verdicts, and identity ledger. It excludes coach LLM context."

---

## 6. Feature-level improvement opportunities

Safe for beta:
- Beta nav reduction (Dashboard / Proof / Coach / Settings + "More" sheet).
- First-proof guided mode `/proof?first=1` (no scoring panel, no contract alignment, just textarea + standard + submit).
- Progressive disclosure on Dashboard: hide Zone 2 + Zone 3 + Temporal panels until `allArtifacts.length >= 1`. Show a single "Activation" card until then.
- In-app "Send beta feedback" floating button (already have `BetaFeedback.tsx` — wire it to a fixed bottom-right on every protected route).

After beta:
- Split `Proof.tsx` into `ProofForm`, `ProofVerdict`, `ProofAttachments`, `ProofStandardPicker`.
- Type the Dashboard state from generated `Database` types instead of `any`.
- Move 200-row queries to RPC or materialised view.
- Push notifications honesty pass (we register, but inspect retention impact before turning on).

Avoid for now:
- Stripe / payments.
- New AI architecture beyond the existing Coach.
- Cortex / cross-domain inference layer.
- Native app store submission until web beta closes the loop.

---

## 7. Mobile audit (390 px reference)

- **Dashboard:** Header CTA row wraps; Zone 2 / Zone 3 fire on empty account; "ZONE 2" label printed twice (eyebrow + inside dropdown). Pending Proof card text "No active contract. Open Coach to forge one." is clipped. **Fix priority: P0.**
- **Proof:** Page is usable; attachment + OCR controls work but the Required Evidence list pushes the submit button below two scroll viewports. **Fix priority: P1 — collapse Standard Preview by default on mobile when `evidenceCount > 3`.**
- **Onboarding (/welcome):** Premium feel (per IMG_2219–2223). One issue: "Step 5 of 5 — Skip" with a primary "Enter Eblocki" exits onto Dashboard, not into a guided proof. **Fix priority: P0 — last step CTA should be "Create my first proof" and route to `/proof?first=1`.**
- **Coach:** Largely fine; "Quick prompts" wrap. Textarea sits below the fold once a long fallback response is shown. **Fix priority: P2 — sticky composer on mobile.**
- **GameForge:** Wrapper file is 11 LOC — actual UI is in `src/components/gameforge/GameForgeShell.tsx`. Not part of the core beta loop; **defer.** Consider hiding `/gameforge` from nav for the Proof Week beta.

---

## 8. Supabase / data safety audit

- Dashboard reads `temporal_snapshot` from `proof_artifacts` and feeds it to the temporal engine. The migration list shows multiple temporal migrations — confirm `temporal_snapshot` column is nullable-safe (the code defensively uses `try/catch` around `computeTemporal`, ✓).
- `daily_objectives` insert in `useDailyObjectives` writes `kind`, `position`, `resistance_level`, etc. Old rows from earlier seeding may lack `completion_quality_self_rating` — verify the column exists in current schema or wrap the patch (already conditional ✓).
- `proof_commitments` query filters `status = 'pending'` only — if the enum was ever expanded, the dashboard silently shows zero. Document the enum.
- `user_modes` query reads `mode_id` only on dashboard but `is_active` + `is_default` elsewhere — keep filters consistent; if `is_active` defaults to true everywhere except dashboard, dashboard may include archived modes. **Recommend: add `.eq('is_active', true)` on the dashboard query.**
- No service role key in client (`integrations/supabase/client.ts` uses publishable key only ✓).
- `proof-attachments` bucket is private ✓; Proof page should always upload through signed paths (verify in detailed pass).
- Edge function `coach` is mentioned by name in docs — production parity not re-verified this pass.

---

## 9. Copywriting audit

Weak → better:

- "Operating System // Command Centre" → keep as eyebrow; add headline `Your proof for today.`
- "Submit one measurable artifact to activate the command layer." → `Submit one measurable artifact. That unlocks the rest of the app.`
- "No active contract. Open Coach to forge one." → `No proof contract yet — your first artifact creates one automatically.`
- "current path - low" → `Trajectory: low. One proof today changes it.`
- "PROOF REQUIRED — One artifact: visible artifact. One standard: General Proof Standard. Timebox 25 minutes." → `Required: one visible artifact, General Proof standard, 25-minute timebox.`
- "Eblocki OS - Not Configured" (uses hyphen-minus) → `Eblocki OS — not configured`. Use em-dash.
- Onboarding step 4 list item 4 "Done and yes are rejected on purpose." → `Words like "done" or "yes" are rejected. Show what you produced.`
- Settings sign-out button "Sign out" → fine; add helper text "Ends this session on this device."

---

## 10. Premium UI audit

What looks generic:
- Section headers ("ZONE 2 / Forecast / STANDBY") use the same weight as content — collapses hierarchy.
- The dashboard uses bordered cards with the same border on every card; nothing visually communicates "this card is your next action".
- Buttons use only `Button` variants — no truly hero CTA. The first-proof CTA should be larger and visually distinct from "Get command".

What to fix without overdesigning:
- Reserve the lime glow (`shadow-glow` already defined in `index.css`) exclusively for the single primary CTA on screen. Right now multiple buttons use the primary fill — the glow loses meaning.
- Use the `grid-bg` utility on Landing and Welcome only — currently risks bleeding into the app shell which makes the app feel busier than it is.
- Drop one decorative icon per card. The current proof card has Gavel, Scale, and a checkmark — that is two too many.

---

## 11. Behavioural system audit

Visible to users today:
- Court verdicts via `CourtVerdictBadge` on Proof.
- Identity ledger on Dashboard (Diagnostics) and Operator page.
- Momentum + streak via `MomentumPanel` and `MomentumRing`.
- Proof Week via `ProofWeekPanel`.
- Compound levels via Operator page (per IMG_2200) — clearly working.

Still hidden / under-surfaced:
- The duplicate detection (7-day content hash check in `cle_after_proof_insert`) is invisible to the user — they will never know why a submission scored 0. Surface this as a verdict reason on the Proof verdict screen.
- Diminishing returns (>5 proofs/day) is silent. Add a small "diminishing returns — same domain" badge on the verdict when triggered.
- Interventions (`InterventionCard`) appear on dashboard but only fire from coach-detected state — for a beta tester with no coach interactions yet, this is dormant. Either trigger from `state` heuristics on first session or hide until a state exists.

---

## 12. Prioritised improvement backlog

P0 (must fix before sending invites):
1. Hide Dashboard Zone 2 / Zone 3 / Temporal panels until `allArtifacts.length >= 1`. Replace with a single Activation card.
2. Welcome step 5 CTA "Enter Eblocki" → "Create my first proof" routing to `/proof?first=1`.
3. Mobile nav reduction: bottom-tab style with 4 destinations + "More". Avoid horizontal scroll on first paint.
4. Fix duplicate "artifact: visible artifact" copy and "current path - low" debug-string copy on Dashboard.
5. Wire `BetaFeedback` as a floating button on every protected route so testers can report without leaving context.

P1 (should fix before invites):
1. First-proof mode in `/proof?first=1` — strip Standard Preview + Contract Alignment + Identity Escalation; keep textarea + standard + submit.
2. Memoise `artifactDates` and add `.eq('is_active', true)` to the user_modes query.
3. Add `first_proof_started` / `first_proof_submitted` analytics with elapsed time.
4. Hide `/gameforge` and `/operator` from main nav during Proof Week; keep routes alive.
5. Surface duplicate / diminishing-returns reasons on Proof verdict.

P2 (polish):
1. Loading screen brand pulse (replace "Loading…").
2. Hero glow exclusivity (only one glow per viewport).
3. Sticky composer on mobile Coach.
4. Accessibility audit on `text-muted-foreground` over `bg-card/40`.
5. Settings export helper sentence.

P3 (after beta):
1. Split `Proof.tsx` into 4 components.
2. Type Dashboard state from `Database` types.
3. Replace 200-row queries with bounded windows or an RPC.
4. Native push polish.
5. Consider splitting Temporal panels into a `/intelligence` route earned at N ≥ 7 artifacts.

---

## 13. Credit-efficient Build plan (small prompts)

Each prompt = one route/component, explicit guardrails, explicit verification, expected files. Do not batch.

A. **Dashboard activation gate** — Hide Zone 2/3/Temporal until first artifact. Guardrails: do not touch Proof, Coach, auth. Verify: tests pass, manual at 390 px shows only Activation card on zero-artifact account. Files: `src/pages/Dashboard.tsx` only.

B. **Welcome → first proof handoff** — Last step CTA routes to `/proof?first=1`. Guardrails: do not change Welcome copy on steps 1–4, do not touch auth. Verify: route navigates correctly; existing test for Welcome still green. Files: `src/pages/Welcome.tsx`.

C. **First-proof simplified mode in `/proof`** — Read `?first=1`, hide Standard Preview, Contract Alignment, Identity Escalation, attachment OCR; keep artifact textarea + standard select + submit. Guardrails: never bypass scoring; verdict UI stays. Verify: submitting a first artifact still inserts a row and renders verdict. Files: `src/pages/Proof.tsx`.

D. **Mobile bottom nav + nav reduction** — Replace mobile horizontal scroll nav with bottom tab bar (Dashboard, Proof, Coach, Settings) + "More" sheet (Start, Modes, Operator, GameForge). Guardrails: desktop sidebar unchanged. Verify: 390 px shows tab bar; routes still reachable. Files: `src/components/eblocki/AppShell.tsx`, plus a small `MobileTabBar.tsx`.

E. **Dashboard copy + cosmetic pass** — Fix duplicate-word copy, debug-string "current path - low", em-dash in "Not Configured", reduce decorative icons, restrict glow to one hero CTA. Guardrails: no logic changes. Verify: visual diff at 390/768/1280. Files: `src/pages/Dashboard.tsx`, possibly `src/components/eblocki/ProofWeekPanel.tsx`.

F. **Beta feedback floating button** — Mount `BetaFeedback` from AppShell as a fixed bottom-right button on protected routes only. Guardrails: do not auto-open; do not block content. Verify: appears on Dashboard/Proof/Coach/Settings; submits successfully. Files: `AppShell.tsx`, `BetaFeedback.tsx`.

G. **Analytics for activation funnel** — Add `first_proof_started` / `first_proof_submitted` with elapsed seconds and zone-visibility impressions. Guardrails: no PII in payload. Verify: events visible in PostHog dev. Files: `src/pages/Proof.tsx`, `src/pages/Dashboard.tsx`, `src/lib/analytics/events.ts`.

H. **Supabase query hygiene** — Cap Dashboard `proof_artifacts` and `court_verdicts` to 60-day window; add `is_active=true` to `user_modes` query; memoise `artifactDates`. Guardrails: keep types compatible. Verify: tests + manual render. Files: `src/pages/Dashboard.tsx`.

I. **Verdict reason surfacing** — On `/proof` verdict, render duplicate / diminishing-returns / vague reasons returned by `court_verdicts.reasoning`. Guardrails: render only if present. Files: `src/pages/Proof.tsx`, possibly `CourtVerdictBadge.tsx`.

---

## 14. Best next Build prompt (run this one first)

```
You are Lovable AI inside the real Eblocki repo.

Task: Dashboard activation gate for first-time users.

Do not touch Auth, Proof, Coach, Settings.
Do not change any business logic or Supabase queries beyond what is required to read artifact count.
Do not add new architecture.
Do not redesign the Dashboard layout for users who already have artifacts.
Do not break desktop layout above md breakpoint.

Goal:
On /dashboard, when the signed-in user has zero proof artifacts (allArtifacts.length === 0),
render ONLY:
  - AppShell + header
  - The Eblocki-OS-not-configured card (if still applicable)
  - A single new Activation card with copy:
      Eyebrow:  ZONE 1 // ACTIVATION
      Headline: Submit one measurable artifact to activate the command layer.
      Body:     One artifact. One standard. 25-minute timebox.
                Done and yes are rejected on purpose.
      Primary CTA: Create my first proof  → /proof?first=1
      Secondary link: Start Today → /start-today
  - The existing ProofWeekPanel (Day 1/7), unchanged.

Hide for zero-artifact users:
  - Zone 2 Forecast block
  - Zone 3 Evidence block
  - Pending Proof block
  - Temporal panels (Intelligence, Model Audit, Map, ProductMatch, InterestSignalCard)
  - Diagnostics + WeeklyRetro toggles

As soon as allArtifacts.length >= 1, the dashboard reverts to its current layout. No data is deleted, no state is reset.

Files expected to change:
  - src/pages/Dashboard.tsx only.

Verification:
  - Run: npm run test
  - Run: npm run build
  - Manual: load /dashboard on a zero-artifact account at 390 px and confirm only Activation + Proof Week are visible.
  - Manual: load /dashboard on an account with >= 1 artifact and confirm full layout still renders.
  - If repo-wide lint still fails from pre-existing debt, report honestly and confirm whether Dashboard.tsx introduced new lint errors.

Output only:
  - files inspected
  - files modified
  - what the zero-artifact dashboard now renders
  - what the >= 1 artifact dashboard renders
  - verification results
  - remaining risks
```

---

## 15. Out of scope / explicit non-recommendations

- No Stripe, no payments copy, no subscription gating in beta.
- No new AI layer beyond the existing `coach` edge function.
- No Next.js migration.
- No new proof system, no Sentinel rewrite, no Cortex.
- No service-role-key paths in the client.
- No fake success states; verdicts continue to render only after a confirmed insert.

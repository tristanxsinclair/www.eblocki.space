
# Phase 7.1 — Site Flow, Accessibility, Function Orchestration, User Clarity

Planning pass only. Smallest safe changes to make Eblocki feel like one connected product. No new tables, no Stripe, no Cortex, no redesign.

## 1. Repo inspected

Yes. Key files read: `src/App.tsx`, `src/pages/Landing.tsx`, `src/pages/StartToday.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Proof.tsx`, `src/pages/ProofWeek.tsx`, `src/pages/Coach.tsx`, `src/components/eblocki/AppShell.tsx`, `src/components/eblocki/ProofStandardPreviewPanel.tsx`, `src/lib/eblocki/proof-week.ts`. Supabase tables list confirmed.

## 2. Current route map

| Route | Purpose | Primary action | Issues |
|---|---|---|---|
| `/` Landing | Sell, route to Proof Week | "Start Proof Week" | Two CTAs ("Start Proof Week" + "Submit first proof") send signed-out users to protected routes — bounces to `/auth` with no return-to context |
| `/auth` | Sign in | n/a | Does not preserve intended destination |
| `/welcome` → `/onboarding` | Build OS | Create modes | Long 6-step form; "Skip" goes to `/dashboard` (skipped users land with `activeDomains.length === 0` and see "OS not configured" banner — soft dead end) |
| `/dashboard` | Command centre | View command + open Proof | Too dense: CommandHero + ProofWeekPanel + Forecast tabs + Evidence + ProductMatch + InterestSignal + Identity + Weekly. Multiple competing CTAs in header (Proof, Coach, Start, Modes). No single "next" |
| `/proof-week` | 7-day challenge home | Join + submit | "Submit today's proof" link is `/proof` with no day/context query → Proof page does not know it came from Proof Week |
| `/proof` | Submit + verdict | Score & file | Verdict card wall: feedback, why, missing standard, elite version, next upgrade, identity escalation, attachment — all stacked. No segmentation. No "back to Proof Week" CTA |
| `/coach` | Diagnose | Diagnose | Accepts `?prompt=` and `?mode=` already. No contextual entry from verdict/dashboard/Proof Week other than generic links |
| `/start-today` | Daily DCS + contract | Forge contract | Parallel to Proof Week — overlaps in user mind. Both compete for "what do I do today" |
| `/operator`, `/gameforge`, `/modes`, `/sheet`, `/settings` | secondary | various | Reachable from sidebar — fine, not in beta hot path |

Dead-end risks: signed-out user clicking Landing CTAs → `/auth` with no redirect back. Onboarding skip → dashboard with empty modes. Proof verdict screen has no "next" beyond "score another".

Mobile: AppShell sidebar collapses to horizontal scroll nav — works but cramped. Dashboard zones overflow vertically on 375px (acceptable). Proof verdict is the worst offender.

## 3. Ideal user journeys

**New signed-out user**
- Expected: Landing → click "Start Proof Week" → `/auth` → on sign-in, land on `/proof-week`
- Current: Lands on `/auth` with no redirect, then `/welcome`, then `/dashboard`. Proof Week never auto-surfaces
- Fix: pass `?redirect=/proof-week` from Landing CTAs; `/auth` honours redirect after success

**New signed-in user without onboarding profile**
- Expected: forced into `/welcome` → `/onboarding` → `/proof-week`
- Current: `/welcome` is gated by `seen_welcome`; after `/onboarding` user is sent to `/dashboard` (Proof Week panel visible but not the primary)
- Fix: after Onboarding save, route to `/proof-week` not `/dashboard`. Dashboard remains the home for returning users

**Proof Week Day 1 user**
- Expected: `/proof-week` shows Day 1 command → "Submit today's proof" → `/proof` already scoped to Day 1 context → submit → verdict → "Continue Proof Week" → back to `/proof-week`
- Current: link to `/proof` carries no `?source=proof-week&day=1`; verdict screen has no return path
- Fix: pass query params, render a top "Proof Week Day X" context banner on `/proof`, and show "Back to Proof Week" CTA on verdict

**Returning Proof Week user**
- Expected: `/dashboard` shows "Continue Proof Week — Day N" as the single primary command
- Current: ProofWeekPanel renders alongside CommandHero (two top-level commands)
- Fix: when Proof Week is active and incomplete, CommandHero's primary CTA becomes "Continue Proof Week (Day N)"; the standalone ProofWeekPanel moves below or collapses

**Post-verdict user**
- Expected: verdict → one clear next action (Continue Proof Week / Submit another / Ask Coach)
- Current: verdict shows giant card with no clear "next"
- Fix: split verdict into 6 small cards + action row at bottom

**Stuck user**
- Expected: a "Stuck? Ask Coach" link from Proof Week + verdict + dashboard, with a contextual seed prompt
- Current: only sidebar Coach link exists
- Fix: add contextual `Link to="/coach?prompt=..."` from the three surfaces

**User with no proof history**
- Expected: empty-state copy that names one action
- Current: dashboard has empty states but they're scattered across panels
- Fix: when `allArtifacts.length === 0`, CommandHero shows "Submit your first proof artifact" and suppresses Forecast / Product Match / Interest Signal panels

**User with old/partial data**
- Existing `queryFailed` branch handles Supabase failure. Confirm view-model treats `null` artifact rows safely (already does per existing tests). No change needed.

## 4. Biggest flow problems (ranked)

**Critical**
- Landing CTAs send signed-out users to protected routes with no redirect-back → user lands on a generic dashboard after sign-in, not Proof Week.
- Verdict screen is a wall — no segmentation, no "next" action, no return to Proof Week.
- Dashboard has 2–4 competing primary actions (CommandHero CTA + header buttons + ProofWeekPanel + Quick Check-in). User cannot tell what to do first.

**High**
- Proof Week → Proof has no context handoff. Submitting from Proof Week feels disconnected.
- StartToday and Proof Week compete for "today's action". For beta, Proof Week wins; StartToday should be demoted (still reachable, not in header).
- New user with no modes lands on `/dashboard` with "OS not configured" banner instead of being routed forward.

**Medium**
- AppShell sidebar uses 7 items; on mobile this overflows horizontally. Beta only needs Dashboard / Proof Week / Proof / Coach.
- Coach has no contextual seed from verdict.

**Low**
- Footer/landing has cosmetic duplication; not a beta blocker.

## 5. Accessibility risks (ranked)

**Critical** — none confirmed; shadcn primitives carry ARIA.

**High**
- `<select>` elements on Proof page have `<Label htmlFor>` — good. But the "Choose mode" custom buttons on Onboarding (arena cards / coaching style buttons) have no `aria-pressed` on the coaching style buttons. The "drop a file" zone in Proof.tsx uses `role="button"` + keyboard handler — acceptable, but missing `aria-label`.
- AppShell horizontal nav: each NavLink is a `whitespace-nowrap` tap target ~28px tall on mobile — below 44px target.
- Landing has only one `<h1>` ✓. Proof page has `Seo` title but the H1 inside the page is missing — the page uses a `<h2>`-style header; should declare an `<h1>`.

**Medium**
- Color contrast: `text-muted-foreground/50` is not used. `font-mono text-[9px]` and `text-[10px]` chips may fall below 4.5:1 contrast — verify against `--muted-foreground` token (no token change).
- Dashboard `MetricCell` truncates value with `truncate` — fine, but no `title` attr for hover/screen-reader full text.
- Proof attachment progress `Progress` has no `aria-label`.

**Low**
- Sonner toasts are aria-live by default (shadcn handles).
- Identity card uses `font-mono` 10px labels — readable on dark, acceptable.

## 6. Function orchestration problems

- **Onboarding**: discoverable via `/welcome` redirect, but post-onboarding routes to dashboard (should route to Proof Week for beta).
- **Proof Week**: hidden inside dashboard panel + standalone route, but never linked from Proof verdict or Coach. Needs cross-links.
- **Proof submission**: well-built but isolated from Proof Week context.
- **Proof standard preview**: correctly shown before submit ✓.
- **Court verdict + feedback**: feedback control exists ✓ but buried under the verdict body.
- **Coach**: standalone, no contextual entry from verdict/dashboard/Proof Week with seed.
- **StartToday vs ProofWeek**: duplicated "what should I do today" mental model. Demote StartToday for beta.
- **ProductMatchPanel, InterestSignalCard, Temporal panels**: rendered on dashboard for users with zero proof — clutter. Should hide until at least one artifact exists.
- **GameForge, Operator, Sheet, Modes**: out of beta hot path. Keep in sidebar.

## 7. Proposed implementation plan

Smallest safe diffs first. No DB changes. No new dependencies.

### Step 1 — Honour redirect on `/auth` and update Landing CTAs

- Files: `src/pages/Landing.tsx`, `src/pages/Auth.tsx`
- Change: Landing CTAs link `/auth?redirect=/proof-week` and `/auth?redirect=/proof`. `Auth.tsx` reads `redirect` param and navigates there after sign-in (signed-in users on `/auth` also auto-redirect).
- Risk: low. Pure routing.
- Test: manual — signed-out click Landing → sign in → arrive at Proof Week.

### Step 2 — Route post-onboarding to Proof Week

- Files: `src/pages/Onboarding.tsx`
- Change: on save success, `navigate("/proof-week")` instead of `/dashboard`.
- Risk: low.
- Test: manual — new user completes onboarding → lands at Proof Week.

### Step 3 — Proof Week → Proof context handoff (UI-only)

- Files: `src/pages/ProofWeek.tsx`, `src/pages/Proof.tsx`
- Change:
  - Proof Week "Submit today's proof" link → `/proof?source=proof-week&day=N`.
  - Proof page reads `source` + `day` and renders a slim top banner: `"Proof Week — Day N: {label}. {command}"` + "Exit Proof Week context" link.
  - On verdict, if `source=proof-week`, primary CTA becomes "Continue Proof Week" (back to `/proof-week`).
  - Pre-fill artifact type/title hints from `PROOF_WEEK_DAYS[N-1].proofRequired` only when empty.
- Important: do not fake contract completion. No write to `proof_commitments`. No migration.
- Risk: low. UI-only.
- Test: unit — Proof renders banner when query param set; existing proof submission tests unchanged.

### Step 4 — Verdict screen split

- Files: `src/pages/Proof.tsx`
- Change: replace the single verdict card with 6 small cards in a 2-column grid (1-col on mobile):
  1. Artifact Summary (title, type, mode, score badge)
  2. What This Proves (`why`)
  3. Required Evidence (`requiredEvidence` list)
  4. Missing Standard (`missingStandard`)
  5. Next Required Proof (`nextUpgrade`)
  6. Identity Escalation (`identityEscalationReason`, allowed/blocked badge)
  Then a single Action Row: [Continue Proof Week | Submit Another | Ask Coach how to upgrade this] + the existing VerdictFeedback below.
- Pass Coach seed: `?prompt=Help me upgrade this proof: {title}. Missing standard: {missingStandard}. Suggest the next artifact.&mode=auto`.
- Risk: low. Pure JSX refactor — no scoring logic changes.
- Test: existing `proof-standard-preview.test.ts` unchanged; manual verify each card renders.

### Step 5 — Dashboard focus

- Files: `src/pages/Dashboard.tsx`
- Change:
  - When Proof Week is active and incomplete, CommandHero's primary CTA = `Continue Proof Week (Day N)` → `/proof-week`. ProofWeekPanel collapses to a slim 1-line "Day N/7" indicator under hero.
  - Header action buttons reduced to: [Proof] [Coach]. Remove Start + Modes from header (still in sidebar).
  - When `allArtifacts.length === 0`: hide ProductMatchPanel, InterestSignalCard, Forecast tabs, Identity card, Weekly section. Show one empty-state card: "No proof yet. Submit one measurable artifact to activate the command layer." with CTA → `/proof`.
  - Otherwise keep existing layout but move ProductMatchPanel + InterestSignalCard below Weekly (less prominent).
- Risk: medium — most-touched file. View-model logic untouched; only conditional rendering and ordering.
- Test: existing `dashboard-view-model.test.ts` unchanged. Add a small component-level smoke check is optional.

### Step 6 — Contextual Coach entry points

- Files: `src/pages/ProofWeek.tsx` (already has Coach link — add seed), `src/pages/Dashboard.tsx` CommandHero, `src/pages/Proof.tsx` verdict action row.
- Change: each Coach link passes a domain-specific `?prompt=` seed. Coach already accepts `prompt` and `mode` query params.
- Risk: low.
- Test: manual — click each link, confirm Coach prefills.

### Step 7 — AppShell trim for beta + accessibility fixes

- Files: `src/components/eblocki/AppShell.tsx`
- Change:
  - Reorder nav: Dashboard, Proof Week, Proof, Coach, then group Operator/GameForge/Settings under a "More" section (still visible on desktop, scrollable on mobile).
  - Add `aria-label="Primary"` to `<nav>`.
  - Bump mobile NavLink min-height to `min-h-11` for 44px tap target.
- Files: `src/pages/Proof.tsx`
  - Promote the page header `<div>` to a single `<h1>` (currently has no h1).
  - Add `aria-label="Upload progress"` to attachment `Progress`.
  - Add `aria-label` to the file drop zone `role="button"`.
- Risk: low.
- Test: manual a11y check + visual.

### Step 8 — Copy polish

- Files: `Landing.tsx`, `ProofWeek.tsx`, `Proof.tsx` (verdict CTAs), `Dashboard.tsx` empty state, Coach CTA links.
- Change: see Section 9 below.
- Risk: trivial.

## 8. Proof Week → Proof contract linking recommendation

- **Safe now? Yes — UI-only.**
- Recommended: query params `?source=proof-week&day=N`. Render a Proof Week context banner on Proof. On verdict, return-to-Proof-Week CTA. Do not write to `proof_commitments`. Do not mark Proof Week day as "completed" in DB.
- **Migration needed? No.** Proof Week status is already derived from artifact timestamps via `computeProofWeek`. Submitting an artifact while in the Proof Week window naturally counts.
- **What not to fake**: do not insert fake `proof_commitments` rows just to show contract completion; do not pre-set evidence_strength; do not skip the standard preview.
- Future (not this pass): if we want explicit per-day contracts, add nullable `proof_week_day: int2` column to `proof_artifacts` in a separate additive migration. Out of scope here.

## 9. Copy changes proposed

- **Landing hero CTA**: keep "Start Proof Week" but link to `/auth?redirect=/proof-week` for signed-out, `/proof-week` for signed-in (handled by a wrapper or by Auth honouring redirect).
- **Landing secondary CTA**: change "Submit first proof" → "I already have an account" linking to `/auth`.
- **Proof Week explanation (top of `/proof-week`)**: keep current copy; add one sub-line under the H1: "One command a day. One artifact. The Court of Evidence judges it. No fake productivity survives."
- **Proof submit CTA**: change "Score & File Proof Artifact" → "Submit to Court of Evidence".
- **Verdict next action (action row)**:
  - Primary (if Proof Week context): "Continue Proof Week — Day N"
  - Primary (else): "Submit another proof"
  - Secondary: "Ask Coach how to upgrade this"
- **Dashboard empty state**: "No proof yet. Submit one measurable artifact to activate the command layer." CTA: "Submit first proof".
- **Coach CTA (from verdict)**: button label "Ask Coach how to upgrade this proof".

## 10. Test plan

Unit / helper (Vitest):
- `proof-week.test.ts` — already covers days 1–7 labels and progression. Add: window edge cases at day 7/8 (already partially covered).
- `proof-standard-preview.test.ts` — unchanged.
- `dashboard-view-model.test.ts` — unchanged.
- New: a small `proof-week-context.test.ts` if a tiny helper is introduced to parse `source`/`day` query params; otherwise no new test file.

Component (optional, only if cheap):
- Verdict split — visual check only; no test added.
- Coach link seed — manual.

Manual QA:
- Signed-out lands on `/proof-week` via Landing CTA after sign-in.
- Onboarding completion routes to `/proof-week`.
- Proof Week Day 1 submit → Proof shows banner → submit → verdict shows "Continue Proof Week" → returns to `/proof-week`.
- Dashboard with zero artifacts: only Command empty state shown.
- Dashboard with active Proof Week: hero CTA = Continue Proof Week.
- Coach link from verdict prefills prompt.
- 375px width: no horizontal overflow on Landing / Proof Week / Proof verdict / Dashboard.
- Keyboard: tab through Proof form, drop zone activates with Enter/Space, verdict cards reachable.

## 11. Verification plan (post-implementation)

- `npm run test`
- `npm run build` (auto by harness)
- `npm run lint:eblocki`
- Manual flow walk per Section 10.
- Mobile viewport check via browser--view_preview at 375x812.

## 12. Out of scope (explicit)

- No new Supabase tables, columns, RLS, or migrations.
- No Stripe, Cortex, payment processing.
- No coach edge-function changes.
- No GameForge / Operator changes.
- No design-token or theme changes.
- No new dependencies.

---

**Ready to implement this plan? If approved, I will make the smallest safe changes first and preserve existing proof, Court, Dashboard, and Coach logic.**

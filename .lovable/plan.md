# Eblocki Plan-Mode Audit — Student Clarity, Premium Restraint, Beta Readiness

This is an audit. No code is changed in this step. The single recommended Build task and its exact prompt are at the bottom.

---

## BLUF

- **Strongest current asset:** A genuine, defensible product wedge — proof artifact → scored verdict → next command. The loop exists in code (`Proof.tsx`, `proof-scoring.ts`, `proof-standard-preview.ts`, `dashboard-view-model.ts`), is deterministic, and is not vaporware.
- **Weakest current blocker:** The first 60 seconds. Landing copy, Welcome step 0, and Onboarding all introduce *philosophy and architecture* ("behavioural operating system", "Temporal loop", "Court", "Zone 1 // Activation", "command surface") before a student understands the basic action: *submit one piece of work and find out if it counted*. A normal 18–22 year old will not parse this in 60 seconds.
- **Is it understandable enough for student beta?** Not yet. Mechanics work; framing does not. Comprehension is the gate, not features.
- **Single highest-leverage fix:** Replace the abstract first-screen + Welcome-step-0 framing with a concrete, student-readable explanation built around one sentence + one example proof + one CTA, and route brand-new users into a 60-second guided first proof instead of a 5-step onboarding before they’ve seen the product work.

---

## Current App Map

**Routes inspected (from `src/App.tsx`):**

- Public: `/`, `/auth`, `/reset-password`, `/install`, `/why`, `/legal/*`
- Protected: `/welcome`, `/onboarding`, `/dashboard`, `/operator`, `/gameforge`, `/coach`, `/sheet`, `/start`, `/start-today`, `/proof`, `/proof-week`, `/modes`, `/modes/:modeId`, `/settings`, `/dev/engine`, `/dev/beta`

**Major user flows that actually exist:**

- Landing → `/auth` → first-time redirect to `/welcome` (gated by `seen_welcome`) → `/dashboard`.
- `/dashboard` Zone 1 Activation card → `/proof?first=1` for first artifact.
- `/start-today` 5-step wizard → creates `daily_control_sheets` row + `proof_commitments` row → links to `/proof`.
- `/proof` submission → scoring → verdict → next-upgrade → returns to dashboard.
- `/onboarding` — heavier, identity + arenas + coaching style + custom modes (6 steps).

**Major systems found in `src/lib/eblocki/`:** proof-scoring, proof-standard-preview, proof-contract, fake-study-detector, states, modes, temporal-engine (+ calibration, audit, snapshot, intelligence-score, evidence-explanation, proof-link), dashboard-view-model, momentum, level-engine, intervention-memory, product-matching, interest-signals, coach-engine/router/response, mobile-disclosure.

**Confusing duplication a student will trip on:**

- Two onboardings: `/welcome` (short, 5 steps, MODE_BANK presets) and `/onboarding` (long, 6 steps, custom arenas). Only `/welcome` is gated. `/onboarding` is reachable but never required.
- Two start surfaces: `/start` and `/start-today` are the same component.
- Three “command” surfaces overlap conceptually: Dashboard CommandHero, Start Today, Coach.
- `/proof-week`, `/gameforge`, `/operator`, `/sheet`, `/why`, `/modes` all exist in the protected nav surface but none of them are needed for first-session comprehension.

**Assumptions (not invented):** Auth, Supabase tables (`user_onboarding_profiles`, `user_modes`, `proof_artifacts`, `proof_commitments`, `daily_control_sheets`, `court_verdicts`, `identity_ledger`) are real — they are queried directly in `Dashboard.tsx`. RLS state was not re-verified in this audit.

---

## First-Time Student Journey (mapped)

```text
Landing /
   │  Headline: "Stop fake productivity."
   │  Sub: "Eblocki helps students turn intention into proof, detect avoidance…"
   │  CTA: Start Today / Submit Proof
   ▼
Auth /auth
   ▼
Welcome /welcome  (Step 0: "Eblocki is not a productivity app. It is a behavioural operating system.")
   ├─ Modes (pick 1+ from MODE_BANK)
   ├─ Goals
   ├─ First-proof explainer (4 steps, read-only)
   └─ Momentum explainer
   ▼
Dashboard /dashboard
   │  Activation card → /proof?first=1
   ▼
Proof /proof  (long form: domain, mode, type, content, attachment, standard preview)
   ▼
Verdict (score / strength / next upgrade)
   ▼
Dashboard return (CommandHero + Evidence + ForecastTabs)
```

**Per-step user reality:**


| Step                 | What student likely understands        | What confuses them                                                                                                                         | What must change                                                                                           |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Landing              | "Some kind of productivity/proof app." | "Forecast", "Temporal loop", "Court", "Ledger", "calibration" all in hero. Headline says what it stops, never plainly says what it *does*. | Lead with one literal sentence + one literal example. Drop "Temporal/Court/Ledger" from hero.              |
| Welcome step 0       | Vague philosophy.                      | "Behavioural operating system" + crossed-out terms before they’ve done anything.                                                           | Replace step 0 with a 1-screen "here’s what proof looks like" + immediate CTA to do one.                   |
| Welcome modes        | Pick checkboxes.                       | Mode names like `PSYCH_HD`, `LAW_MAX`, `SALES_CLOSE` look like internal codes.                                                             | Use human labels and a "Just Studying" default.                                                            |
| Dashboard activation | Sees a CTA.                            | Surrounding shell already shows "Operating System // Command Centre", "Zone 1 // Activation" before the first proof exists.                | Empty-state mode that hides Zones, Forecast tabs, Operator chips until 1 artifact exists.                  |
| Proof form           | Long.                                  | "Evidence type", "Proof tier", "Standard preview", "Mode" all visible at once on first submission.                                         | First-proof mode (`?first=1`) should already collapse most of this; verify it truly hides advanced fields. |
| Verdict              | Score number.                          | "Elite version", "Missing standard", "Identity escalation reason" can read as harsh/legalistic.                                            | Soften verdict copy on the *first* proof only. Keep strictness for later submissions.                      |
| Return               | Lots of panels.                        | Forecast/Audit/Evidence tabs + Ledger + Momentum + Weekly Retro + Quick Check-In + Identity card stacked.                                  | Progressive disclosure: hide Audit + Forecast until ≥3 artifacts.                                          |


---

## Competitor Comparison


| Product                | What it does better than Eblocki                       | What Eblocki can do better                     | Principle to extract                               | Avoid copying                    |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------- | -------------------------------- |
| Duolingo               | First-session "I get it" in 30s; one obvious action.   | Real-world artifacts vs synthetic exercises.   | Single, unmistakable next tap.                     | Mascot guilt, streak coercion.   |
| Elevate                | Clean daily card.                                      | Output-based instead of game-based.            | "Today’s one thing" pattern.                       | Score theatrics.                 |
| Notion                 | Composable surfaces.                                   | Opinionated loop, not blank canvas.            | Templates as on-ramps.                             | Empty doc anxiety.               |
| Linear                 | Premium restraint, keyboard speed, density discipline. | Behavioural meaning behind tasks.              | Typography hierarchy, monochrome with one accent.  | Hiding meaning behind keybinds.  |
| Todoist / TickTick     | Frictionless capture.                                  | Quality > count.                               | Inbox → next action.                               | Treating checkboxes as progress. |
| Habitify               | Habit clarity.                                         | Proof of behaviour, not self-report.           | One-line daily prompt.                             | Self-rated streaks.              |
| Forest                 | Emotional hook (tree).                                 | Real artifact instead of timer art.            | Single visible commitment.                         | Cosmetic gamification.           |
| Strava / Whoop / Oura  | Trustworthy data viz with uncertainty.                 | Behavioural calibration over biometrics.       | Uncertainty shown, not hidden.                     | Score addiction.                 |
| Chess.com              | Honest rating after evidence.                          | Identity ledger after proof, not before.       | Rating that earns trust.                           | ELO-shaped status games.         |
| Spotify Wrapped        | Emotional reflection.                                  | Weekly proof retro.                            | Periodic narrative reward.                         | Vanity metrics.                  |
| Cursor / Replit        | Powerful tool that still onboards in 60s.              | Behavioural meaning.                           | Hide power until needed.                           | Tool-first storytelling.         |
| Apple Fitness / Health | Apple-spec restraint, one-glance status.               | Forecast with uncertainty + behavioural cause. | Three rings = three things; nothing else competes. | Ring tyranny.                    |


---

## Premium / Apple-Spec Gap Analysis

- **Visual hierarchy:** Dashboard renders Zone 1 hero + 3-up signal grid + Evidence card + 3-tab Forecast/Evidence/Audit + Identity card + Momentum + Weekly Retro + Quick Check-In on one screen. Apple-spec demands one dominant element per scroll. Current state competes with itself.
- **Copy:** Mixes student plain English with founder-internal terms ("Operating System // Command Centre", "Zone 1 // Activation", "Temporal loop", "Court", "Identity Ledger"). Pick one register for first-session users.
- **Spacing:** Cards are dense (`p-4 md:p-5`), grids are 3-up on small screens (`grid-cols-3 gap-2`) — Apple-spec would use 2-up max on mobile with more vertical air.
- **Mobile:** `mobile-safe-page`, `mobile-safe-card`, `text-wrap-safe`, `MobileCollapse` exist — good. But still 3-column metric grids and many simultaneous panels. Risk of overload, not overflow.
- **Interaction:** Multiple CTAs of equal weight in header (`Proof`, `Coach`, `Start`, `Modes`). Apple-spec = one primary, others demoted.
- **Information architecture:** Power features (Operator, GameForge, Proof Week, Engine debug, Beta admin) live next to first-time features. Should be physically separated for first 7 days.
- **Trust:** "Free beta · No card required · Built for university students" is good. Add a one-line privacy/data line in the hero footer.

---

## Top 10 Confusions That Stop a Normal Student

1. The hero never says, in literal student language, "submit your essay/notes/answer and we tell you if it actually counted as real work."
2. "Behavioural operating system" appears before a student has done anything.
3. `MODE_BANK` IDs (`LAW_MAX`, `PSYCH_HD`) look like config keys.
4. Two onboarding flows (`/welcome`, `/onboarding`) with different scope and tone.
5. Two start surfaces (`/start`, `/start-today`) for the same screen.
6. Dashboard talks about Forecast, Court verdict, Identity, Calibration *before* the user has a single artifact.
7. "Done" and "yes" rejected is shown as a rule before the user knows what they’re being asked.
8. Proof form exposes "evidence type", "proof tier", "transfer flag", "pressure flag" terms to a first-timer.
9. Verdict tone (`missingStandard`, `identityEscalationReason`) reads legalistic for someone’s first try.
10. No visible "what does a strong proof look like for *me, a student*" example before submission.

---

## Highest-Leverage Fixes (ranked)


| Priority | Fix                                                                                                                                                                                                         | Why it matters                                         | Files/routes likely involved                                    | Build risk                                          | Verification needed                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| P0       | Rewrite Landing hero + Welcome step 0 in literal student language; one-sentence what-it-does, one concrete example ("submit a study note, an essay paragraph, or a past-paper answer"), one primary CTA.    | Fixes the 60-second comprehension gate.                | `src/pages/Landing.tsx`, `src/pages/Welcome.tsx`                | Low — copy + light layout.                          | Read-through by a non-builder; mobile screenshot.                   |
| P0       | True empty-state Dashboard: until 1 artifact exists, hide Forecast/Evidence/Audit tabs, Operator chips, "Zone 1 // Command Centre" eyebrow. Show only one card: "Submit your first proof" + 2-line example. | Removes the wall-of-panels first impression.           | `src/pages/Dashboard.tsx` (gate on `allArtifacts.length === 0`) | Low — conditional rendering already partly present. | Visual check at 0 artifacts; existing tests unaffected.             |
| P0       | Collapse duplicate routes: `/start` aliased to `/start-today` already; either remove `/onboarding` from any nav OR clarify it as "Advanced setup" reachable only from Settings.                             | Removes confusion between two onboardings.             | `src/App.tsx`, any link to `/onboarding`.                       | Low.                                                | Grep for links; no DB change.                                       |
| P0       | Rename mode IDs surfaced to users: show `display_name` only in `Welcome` (`LAW_MAX` → "Law"). Keep ID internally.                                                                                           | Removes "config key" feel.                             | `src/pages/Welcome.tsx` `MODE_BANK` rendering only.             | Very low.                                           | Visual.                                                             |
| P1       | First-proof mode (`?first=1`) audit: confirm Proof form hides advanced fields (evidence type, transfer/pressure flags, proof tier) and uses softened verdict copy.                                          | First-proof experience determines retention.           | `src/pages/Proof.tsx`, `src/lib/eblocki/first-proof.ts`.        | Medium — must not break normal submission.          | Targeted tests on `first-proof.ts`; manual run of `/proof?first=1`. |
| P1       | Header CTA discipline: Dashboard header keeps **Proof** as the only primary; move Coach/Start/Modes into an overflow or secondary row.                                                                      | Apple-spec primary action discipline.                  | `src/pages/Dashboard.tsx` header block.                         | Low.                                                | Visual.                                                             |
| P1       | Add one-line proof example under hero CTA on Landing ("e.g. paste a 200-word IRAC answer, an essay paragraph, or your study notes.").                                                                       | Replaces abstract proof concept with concrete picture. | `src/pages/Landing.tsx`.                                        | Very low.                                           | Read-through.                                                       |
| P2       | Progressive disclosure: hide Audit tab until ≥3 artifacts; hide Weekly Retro until 7 days exist.                                                                                                            | Reduces dashboard density for new users.               | `src/pages/Dashboard.tsx`.                                      | Low.                                                | Conditional logic test.                                             |
| P2       | Replace "Operating System // Command Centre" eyebrow with "Today" for first 7 days.                                                                                                                         | Tone: from internal-founder to student.                | `src/pages/Dashboard.tsx`.                                      | Very low.                                           | Visual.                                                             |
| P2       | Strip "Temporal", "Court", "Identity Ledger" terminology from first-session surfaces; keep internally.                                                                                                      | Same tone fix.                                         | Landing, Welcome, Dashboard first-render.                       | Low.                                                | Read-through.                                                       |
| P3       | Audit `/proof-week`, `/gameforge`, `/operator`, `/why` for whether they should be linked at all during beta.                                                                                                | Reduces surface area; raises trust.                    | `src/components/eblocki/AppShell.tsx`, `MobileBottomNav.tsx`.   | Low.                                                | Nav screenshot.                                                     |


---

## What Not To Build Yet

- Cortex / counterfactual memory.
- Stripe / paid tiers.
- New AI providers or expanded LLM behaviour.
- New dashboards or dashboard panels.
- New gamification layers, levels, badges, rings.
- Any second proof system parallel to `proof_artifacts`.
- Broad visual redesign or theme overhaul.
- New mobile chrome (bottom nav already exists).

Audited Prompt (SAME PROMPT BUT BETTER)  
You are operating in Build Mode inside the real Eblocki repo for [www.eblocki.space](http://www.eblocki.space).

Mission: Student Clarity Pass v1.

Make the first 60 seconds of Eblocki understandable to a normal university student without removing any existing system, route, table, or proof logic.

Preserve the actual stack:

- React 18
- Vite
- TypeScript
- React Router
- Tailwind/shadcn UI
- Supabase Auth/database/functions/storage
- PostHog analytics
- Capacitor mobile shell
- Lovable metadata

Do not convert to Next.js.  
Do not add Stripe.  
Do not add Cortex.  
Do not add new AI architecture.  
Do not create a duplicate proof system.  
Do not redesign the app.  
Do not rename Supabase tables or columns.  
Do not touch RLS.  
Do not expose secrets.

INSPECT FIRST

Inspect before editing:

- src/pages/Landing.tsx
- src/pages/Welcome.tsx
- src/pages/Dashboard.tsx
- src/pages/Proof.tsx
- src/components/eblocki/AppShell.tsx
- src/App.tsx
- src/lib/eblocki/first-proof.ts

If any file or route differs materially from this prompt’s assumptions, stop and report the mismatch before editing.

EDIT SCOPE

Only edit these files unless inspection proves one small additional file is required:

- src/pages/Landing.tsx
- src/pages/Welcome.tsx
- src/pages/Dashboard.tsx

Read-only unless absolutely necessary:

- src/pages/Proof.tsx
- src/components/eblocki/AppShell.tsx
- src/App.tsx
- src/lib/eblocki/first-proof.ts

CHANGE 1 — Landing hero clarity

In src/pages/Landing.tsx:

Replace the first-viewport hero copy with literal, student-readable language.

Use:

Headline:  
Find out if your work actually counts.

Subheadline:  
Submit one piece of your real work — an essay paragraph, study notes, or a past-paper answer — and Eblocki tells you whether it proves progress or not.

Example line under CTAs:  
Example proofs: a 200-word IRAC answer, a corrected past-paper question, or one lecture explained in your own words.

CTA rules:

- Keep one primary CTA: Start Today
- Keep one secondary CTA: Submit Proof
- Do not introduce extra competing CTAs in the hero.

Remove these terms from the first viewport only:

- Temporal loop
- Court
- Ledger
- calibration
- behavioural operating system

These terms may remain lower on the page if already present and useful, but not in the first viewport.

CHANGE 2 — Welcome step 0 clarity

In src/pages/Welcome.tsx:

Rewrite Step 0 / PhilosophyStep so the first screen does not describe Eblocki as a “behavioural operating system”.

Use:

Title:  
Welcome. Here is what Eblocki does.

Paragraph:  
Eblocki helps you submit one piece of real work, check whether it actually proves progress, and get the next action.

Bullets:

1. Submit one piece of real work.
2. Get an honest check.
3. Do the next action.

Keep the tone plain, student-readable, and low-cringe.

Mode labels:  
In ModesStep, display MODE_BANK using human-readable labels only.

Examples:

- LAW_MAX → Law
- PSYCH_HD → Psychology
- SALES_CLOSE or sales mode → Sales
- BUILD / Eblocki / founder mode → Build
- ATHLETE / soccer mode → Athlete
- FINANCE → Finance
- LIFE / general mode → General

Important:

- Do not change mode_id values.
- Do not change Supabase payload structure.
- Only change what users see.

CHANGE 3 — Dashboard true zero-artifact empty state

In src/pages/Dashboard.tsx:

When allArtifacts.length === 0, render a true first-user empty state.

Requirements:

- Show the existing Activation / first-proof card.
- Show one obvious primary Proof CTA.
- Replace eyebrow text “Operating System // Command Centre” with “Today”.
- Hide or suppress advanced dashboard panels until at least one artifact exists.

At zero artifacts, do not show:

- DashboardForecastTabs
- IdentityLedger
- MomentumPanel
- WeeklyRetro
- QuickCheckInCard
- Identity card
- Forecast / Evidence / Audit tabs
- Operator chips
- Coach / Start / Modes header CTAs

Those routes may remain available through AppShell navigation if already present. Do not remove routes.

Do not change:

- Supabase queries
- view-model logic
- temporal logic
- proof scoring
- proof submission
- dashboard data fetching
- table names
- RLS

OUT OF SCOPE

Do not touch:

- Proof.tsx logic
- proof-scoring
- proof-standard-preview
- temporal-engine
- Sentinel/Cortex logic
- Supabase migrations
- RLS policies
- auth redirects
- route structure
- new onboarding architecture
- new components unless a tiny in-file helper is cleaner

VERIFICATION

Run and report honestly:

- npm run lint, or the repo’s lint script
- npm test, npm run test, or the repo’s vitest command
- npm run build

Browser checks:

Use viewport 390x844 and 1280x800.

Check:

1. /
  - Hero is readable.
  - Primary CTA is Start Today.
  - Secondary CTA is Submit Proof.
  - First viewport does not contain Temporal, Court, Ledger, calibration, or behavioural operating system.
2. /welcome
  - Step 0 renders the new plain-English explanation.
  - User-visible mode names are human-readable.
  - Internal mode IDs remain unchanged.
3. /dashboard
  - If an authenticated zero-artifact session is available, verify only the first-proof Activation card and primary Proof CTA show.
  - If authentication or zero-artifact state is not available, do not fake it. Report browser dashboard verification as blocked and explain exactly why.
  - Still verify that the conditional rendering code is present.

Save screenshots under:  
/tmp/browser/clarity-pass/

If screenshot saving is unavailable, report that honestly.

FINAL REPORT

Include:

- Files inspected
- Files modified
- Files intentionally not modified and why
- Exact new Landing hero copy
- Exact new Welcome step 0 copy
- Confirmation that mode IDs stayed unchanged
- Confirmation of zero-artifact dashboard gating logic
- Lint result
- Test result
- Build result
- Browser check result
- Screenshot paths if available
- Any blocked verification
- Residual risks
- Any out-of-scope change required and why

Completion standard:

A first-time student loading /, then /welcome, then /dashboard at zero artifacts sees plain student language and one obvious next action on each screen, with no Temporal/Court/Ledger/calibration terminology in the first viewport of those first-user surfaces.

---

## Recommended Next Build Task (single)

**Task:** *Student Clarity Pass v1 — Landing hero, Welcome step 0, Dashboard true empty state, and human-readable mode labels.*

This is the highest-leverage move because it directly attacks the only thing blocking student beta: comprehension. No new features, no schema changes, no AI changes, no new routes. Pure copy + conditional rendering on three existing files.

---

## Final Build Mode Prompt (paste-ready)

```
You are operating in Build Mode inside the real Eblocki repo for www.eblocki.space.

Mission: Student Clarity Pass v1. Make the first 60 seconds of Eblocki understandable
to a normal university student without removing any existing system, route, table, or
proof logic.

Preserve the actual stack: React 18 + Vite + TS + React Router + Tailwind/shadcn +
Supabase + PostHog + Capacitor + Lovable metadata. Do not convert to Next.js. Do not
add Stripe. Do not add Cortex. Do not add new AI architecture. Do not create a
duplicate proof system. Do not redesign the app. Do not rename Supabase tables or
columns. Do not touch RLS. Do not expose secrets.

Inspect first (do not assume):
- src/pages/Landing.tsx
- src/pages/Welcome.tsx
- src/pages/Dashboard.tsx
- src/pages/Proof.tsx (read-only; do not edit in this task)
- src/components/eblocki/AppShell.tsx
- src/App.tsx routing table
- src/lib/eblocki/first-proof.ts
If any file or route differs from what this prompt assumes, stop and report.

Scope of edits (ONLY these three files unless inspection proves a fourth is required):

1) src/pages/Landing.tsx
   - Replace the hero copy block with literal, student-readable language.
   - New headline: "Find out if your work actually counts."
   - New subheadline (one sentence): "Submit one piece of your real work — an essay
     paragraph, study notes, a past-paper answer — and Eblocki tells you whether it
     proves progress or not."
   - One concrete example line directly under the CTAs: "Example proofs: 200-word
     IRAC answer, a corrected past-paper question, a summary of one lecture in your
     own words."
   - Keep one primary CTA "Start Today" and one secondary "Submit Proof".
   - Remove "Temporal loop", "Court", "Ledger", "calibration" terminology from the
     first viewport. They can remain lower on the page if needed for trust, but not
     in the hero.

2) src/pages/Welcome.tsx
   - Rewrite Step 0 (PhilosophyStep) so it does not call Eblocki a "behavioural
     operating system" on the first screen. Replace with:
       - Title: "Welcome. Here is what Eblocki does."
       - One paragraph in student language about submitting real work and getting an
         honest check.
       - Three bullets: 1) Submit one piece of real work. 2) Get an honest check.
         3) Get the next action.
   - In ModesStep, display MODE_BANK using human-readable names only
     (e.g. "Law", "Psychology", "Sales", "Build", "Athlete", "Finance", "General").
     Keep mode_id values unchanged in state and in the Supabase upsert.

3) src/pages/Dashboard.tsx
   - True empty state: when allArtifacts.length === 0, render ONLY the existing
     Activation card. Do not render DashboardForecastTabs, IdentityLedger,
     MomentumPanel, WeeklyRetro, QuickCheckInCard, or the Identity card.
     (Most of this is already gated; verify no first-render panel leaks through.)
   - Header CTAs: when allArtifacts.length === 0, render only the Proof button as
     primary; hide Coach / Start / Modes from the header (they remain reachable via
     AppShell nav).
   - Eyebrow text: when allArtifacts.length === 0, replace
     "Operating System // Command Centre" with "Today".
   - Do not change any Supabase queries, view-model logic, or temporal logic.

Do NOT:
- Touch Proof.tsx logic, proof-scoring, proof-standard-preview, or any temporal file.
- Add or remove routes.
- Change MODE_BANK ids.
- Change Supabase queries, tables, or RLS.
- Add new components beyond small in-file presentational helpers.

Verification (run and report honestly):
- npm run lint (or repo's lint script)
- npm test  (or repo's vitest run)
- npm run build
- Browser check via headless Playwright at viewport 390x844 and 1280x800:
    - /  (hero is readable; no "Temporal/Court/Ledger" in first viewport)
    - /welcome step 0 (new copy renders)
    - /dashboard at zero artifacts (only Activation card + Proof CTA visible)
- Capture and save screenshots under /tmp/browser/clarity-pass/.

Final report must include:
- Files inspected
- Files modified (and any file you decided NOT to touch and why)
- Exact copy diffs for hero + Welcome step 0
- Confirmation of header/CTAs/eyebrow gating at 0 artifacts
- Lint/test/build results (real)
- Screenshot list
- Residual risks (e.g. existing tests that asserted old copy)
- Whether any out-of-scope file required a change and why

Completion standard: A first-time student loading / and then /welcome and then
/dashboard at zero artifacts sees plain student language and exactly one obvious
next action on each screen, with no Temporal/Court/Ledger terminology in the first
viewport of any of those three pages.
```
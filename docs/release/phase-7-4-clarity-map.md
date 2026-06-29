# Phase 7.4A Clarity Map

Date: 2026-06-29
Branch: `codex/phase-7-4a-clarity-surface-pass-20260629`

## Mission

Make the first-user surface answer four questions immediately:

1. What do I press?
2. What counts as proof?
3. What happens after I submit?
4. What do I do next?

Protect the existing core loop:

Landing -> Start Proof Week -> Submit Proof -> See What Counts -> Get Proof Verdict -> Receive Next Command -> Return Tomorrow

## KEEP

- `src/App.tsx`
  - Keep the current route map and protected-route structure.
- `src/pages/ProofWeek.tsx`
  - Keep the 7-day proof challenge structure, join state, active day state, and what-counts card.
- `src/pages/Proof.tsx`
  - Keep the split between normal `/proof` and first-proof `/proof?first=1`.
  - Keep title-first submission, default artifact fallback, simplified first-proof verdict, and advanced-details gating.
- `src/pages/Dashboard.tsx`
  - Keep the command-first dashboard shape, zero-proof activation card, command hero, and deeper detail panels.
- `src/pages/Coach.tsx`
- `src/pages/Operator.tsx`
- `src/pages/GameForge.tsx`
- `src/pages/Settings.tsx`
  - Keep these as secondary or advanced surfaces in this phase.

## IMPROVE

- `src/pages/Landing.tsx`
  - Sharpen the hero promise, first action, and preview labels.
  - Make the first-proof CTA go to `/proof?first=1`.
- `src/pages/Welcome.tsx`
  - Make the fast path explicit with skip/final actions that lead to first proof.
  - Rewrite the first-proof explanation around the actual user loop.
- `src/pages/StartToday.tsx`
  - Make the non-planner path read as the fastest route to proof.
  - Remove leftover command-centre wording from visible labels.
- `src/pages/ProofWeek.tsx`
  - Align visible labels with “Start Proof Week”, “Submit first proof”, and “Back to Today”.
- `src/pages/Dashboard.tsx`
  - Rename the top surface to `Today` in visible UI.
  - Keep one obvious action above the fold.
  - Make secondary proof history and advanced model detail easier to understand.
- `src/components/eblocki/DashboardForecastTabs.tsx`
  - Rename `Diagnostics` into a clearer progressive-disclosure label.
- `src/pages/Proof.tsx`
  - Make the first-proof task, proof verdict, and after-submit next step more explicit.
  - Keep the advanced system behind optional detail.

## HIDE / COLLAPSE

- `src/components/eblocki/DashboardForecastTabs.tsx`
  - Keep forecast, proof history, and deeper model detail below the main command surface.
- `src/pages/Proof.tsx`
  - Keep definitions and strength tallies collapsed outside first-proof mode.
  - Keep optional details collapsed by default for first-proof mode.
- `src/pages/Dashboard.tsx`
  - Keep identity, temporal, and audit-style detail below the main next-action layer.

## MERGE

- Landing, Welcome, Proof Week, and Start Today should all converge on the same first action:
  - `/proof?first=1`
- Dashboard, Proof verdict, and Proof Week completion should all converge on the same next-step surface:
  - `Today` / `/dashboard`

No route deletion, route merge, or broad component extraction is part of this phase.

## RENAME

- `Command centre` -> `Today`
- `Command Centre Preview` -> `What you see after you submit`
- `Evidence Ledger` -> `Proof record`
- `Court score` -> `Verdict`
- `Forecast calibration` -> `What happens next`
- `Diagnostics` -> `More detail`
- `Verdict` -> `Proof verdict`
- `Activation` -> `Fastest path`

## Out Of Scope

- CI workflows
- npm audit
- repo-wide lint cleanup
- Datadog workflow
- Supabase schema
- exported type names, DB enums, analytics events, or deep product refactors
- broad Dashboard or Proof route rewrites
- Phase 7.4B clarity/system design work

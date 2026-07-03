# Phase 7.4A Clarity And Usability Pass

Date: 2026-06-29
Branch: `codex/phase-7-4a-clarity-surface-pass-20260629`

## Intent

This pass narrows the first-user surface so Eblocki answers four questions faster:

1. What do I press?
2. What counts as proof?
3. What happens after I submit?
4. What do I do next?

It keeps the deeper intelligence layers intact, but moves them behind clearer labels, clearer return paths, and existing progressive disclosure.

## Scope

Changed surfaces:

- `src/pages/Landing.tsx`
- `src/pages/Welcome.tsx`
- `src/pages/StartToday.tsx`
- `src/pages/ProofWeek.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/eblocki/DashboardForecastTabs.tsx`
- `src/pages/Proof.tsx`
- `src/lib/eblocki/first-proof.ts`
- `docs/release/phase-7-4-clarity-map.md`
- `docs/release/phase-7-4-clarity-and-usability-pass.md`

Inspected but intentionally not changed in this phase:

- `src/App.tsx`
- `src/pages/Onboarding.tsx`
- `src/pages/Coach.tsx`
- `src/pages/Operator.tsx`
- `src/pages/GameForge.tsx`
- `src/pages/Settings.tsx`
- deeper advanced components and lib files that were already compatible with the intended clarity surface

## Outcome

The pass aligns Landing, Welcome, Proof Week, Start Today, Dashboard, and first-proof mode around one clearer loop:

- Start Proof Week or submit first proof
- see what counts as proof
- get a proof verdict immediately
- return to `Today` for the next command

Visible labels were simplified, but the existing proof standards, scoring, forecast layers, and advanced detail panels remain intact.

## Guardrails

This pass does not:

- change routes or app structure
- change Supabase schema
- remove proof scoring, standards, Court logic, Temporal logic, Modes, States, or Proof Week
- create a new dashboard or proof flow
- refactor `Proof.tsx` broadly
- patch CI, npm audit, Datadog, or repo-wide lint debt

## Verification Status

Requested verification commands for this phase are still:

- `npx vitest run`
- `npm run build`
- `npm run lint:eblocki`

Requested browser/mobile checks were:

- `/`
- `/proof-week`
- `/proof`
- `/proof?first=1`
- `/dashboard`
- `/coach`

In this Codex thread, direct shell execution was unavailable, so command verification could not be run here. Browser/mobile verification was also not available through a usable local dev-server workflow in this thread. Re-run the requested checks in a working local shell or CI/dev environment before merge.

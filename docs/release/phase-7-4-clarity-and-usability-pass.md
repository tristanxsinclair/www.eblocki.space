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

Targeted surfaces only:

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

In this Codex thread, direct shell execution was unavailable, so command verification must be reported honestly from that limitation unless rerun in a working local shell or CI job.

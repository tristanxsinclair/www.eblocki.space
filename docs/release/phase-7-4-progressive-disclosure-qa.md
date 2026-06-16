# Phase 7.4 — Component-Level Mobile Progressive Disclosure

Builds on Phase 7.3 global containment. Goal: a beta tester on a 375–430 px
phone sees one command, one proof CTA, one verdict summary, one next step —
with advanced intelligence available but never dominating the first screen.

## What's collapsed by default on mobile (md breakpoint, < 768 px)

| Area | Default mobile | Default desktop |
| --- | --- | --- |
| Dashboard CommandHero | visible | visible |
| Proof Week panel | visible | visible |
| Evidence summary (metrics + pending + latest verdict + domain signal) | visible | visible |
| Recent proof list | first 2 + Show more | up to 4 |
| Forecast / Calibration / Intel tabs | collapsed behind "View forecast, calibration, and intel" | expanded |
| Product match + Interest signal | collapsed behind "View product match" | expanded |
| Weekly retro / momentum | collapsed (existing) | collapsed (existing) |
| Advanced diagnostics (model audit) | collapsed (existing) | collapsed (existing) |
| Completed proof artifacts | first 3 + Show all | all |
| Per-artifact long feedback | summary + "Show full artifact" | summary + "Show full artifact" |

## Components added

- `src/components/eblocki/MobileCollapse.tsx` — mobile-only collapsible
  wrapper. Uses Tailwind `md:` to render children unconditionally on tablet+.
- `src/lib/eblocki/mobile-disclosure.ts` — pure helpers:
  `mobileRecentProofLimit`, `mobileLedgerLimit`, `summariseArtifactContent`,
  `isCollapsedByDefault`.

## Manual QA checklist (375 / 390 / 430 px)

### Dashboard
- [ ] Command Hero visible above the fold (title + next best action + CTAs).
- [ ] Proof Week panel visible directly below.
- [ ] Forecast tabs collapsed; tap expands; no horizontal overflow.
- [ ] Product match collapsed; tap expands.
- [ ] Recent proof shows ≤ 2; "Show recent proof (N more)" reveals rest.
- [ ] Weekly section collapsed until tapped.
- [ ] Body never scrolls horizontally in any state.

### Proof
- [ ] Completed artifacts ≤ 3 by default; "Show all (N more)" reveals rest.
- [ ] Long feedback collapses to summary with "Show full artifact" toggle.
- [ ] Long titles / attachment names wrap; no horizontal overflow.

### GameForge
- [ ] Prompts and output wrap; no horizontal overflow.
- [ ] Action buttons reachable.

### Operator
- [ ] Hero stacks vertically on mobile.
- [ ] Domain cards single column at 375 px.
- [ ] Identity Ledger entries compact and readable.

### Onboarding
- [ ] Save / Reset CTAs full-width and in viewport.
- [ ] Identity fields wrap.

## Release safety

- Proof scoring logic: untouched.
- Coach routing logic: untouched.
- Supabase schema: untouched (no new migrations).
- No secrets added or read.
- Phase 7.3 global containment preserved; progressive disclosure layered on top.

## Test status

- `vitest run` — 155 / 155 passing across 22 files, including new
  `mobile-disclosure.test.ts` (7 tests).

## Remaining blockers

- Manual QA on real iOS Safari and Android Chrome at 375 / 430 px still
  required before beta-release-credible. No automated visual regression.
- Deep GameForge mobile refactor deferred; relies on the Phase 7.3
  containment rail.

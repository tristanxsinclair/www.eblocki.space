# Phase 7.3 — Mobile Containment QA

## Scope
Release-blocker fix pass: stop body-level horizontal scroll on phone widths
(375 / 390 / 414 / 430 px) and contain nav + main column. No product logic,
proof scoring, coach routing, or schema changes.

## Root causes found
1. `html`, `body`, `#root` did not constrain `max-width` or clip `overflow-x`,
   so any single over-wide child (chart, long unbroken string, mis-sized grid)
   made the entire page side-scrollable.
2. `AppShell` main column missed `w-full max-w-full overflow-x-hidden`, so a
   wide child page (Dashboard forecast, Proof artifact wall) leaked into the
   document scroll axis.
3. Mobile top nav row used `overflow-x-auto` on the `<nav>` but the parent
   `<aside>` had no `min-w-0`, so flex children could still push width.

## Files modified
- `src/index.css` — global containment safety rail + utility classes
  (`mobile-safe-page`, `mobile-safe-card`, `text-wrap-safe`, `contained-scroll`).
- `src/components/eblocki/AppShell.tsx` — `w-full max-w-full overflow-x-hidden`
  on root + `<main>`, `min-w-0` on `<aside>` and `<nav>`, 44px min tap target
  + `shrink-0` on nav items, scroll-touch inside the nav row only.

## Files created
- `docs/release/phase-7-3-mobile-containment-qa.md` (this file).

## Page-level status
| Page          | Status after this pass |
| ------------- | --------------------- |
| AppShell nav  | Fixed — scrolls inside nav row, never the body |
| Dashboard     | Contained by `<main>` overflow-x rail; advanced panels unchanged, still visible (progressive disclosure deferred to follow-up pass) |
| Proof         | Contained by rail; artifact wall progressive disclosure deferred |
| Coach         | Contained by rail; existing wrap classes intact |
| GameForge     | Contained by rail; existing `sm:` grids collapse correctly |
| Operator      | Contained by rail |
| Onboarding    | Contained by rail |
| Start Today   | Nav no longer clips; step card contained |
| Proof Week    | Contained by rail |

## Mobile QA checklist (manual)
At 375 / 390 / 414 / 430 px:
- [ ] No body-level horizontal scroll on any route
- [ ] Top nav scrolls inside its own row, never the page
- [ ] Dashboard command surface visible without sideways drag
- [ ] Proof submit button reachable inside its card
- [ ] Coach input + mode chips wrap inside container
- [ ] GameForge answer options fit inside card
- [ ] Operator + Onboarding save buttons visible
- [ ] Start Today nav active item not clipped
- [ ] Proof Week day cards readable

## Manual proof loop
- [ ] Proof Week → Proof → submit → verdict → feedback → Dashboard → Coach
      completable without sideways dragging

## Verification
- TypeScript build: run by harness (no manual `npm run build`).
- No tests added or removed; no proof / coach / scoring code touched.

## Release safety
- No secrets added, no schema migration, no service-role exposure.
- No route loops introduced (AppShell route table unchanged).
- No proof scoring or coach routing changes.
- Advanced panels are still rendered — only the document-level scroll axis
  is suppressed. Per-component progressive disclosure (collapsing
  forecast / calibration / artifact walls behind toggles) is deferred to a
  follow-up pass and tracked in the Page-level status table above.

## Remaining blockers
- None at the document-scroll level.
- Follow-up (not blocking beta containment): collapse Temporal Field map,
  Calibration/Intel, and completed-artifact walls behind explicit
  `View details` toggles on `< md` widths.
# Simple User Clarity Pass

## Goal
A 13-year-old should understand Eblocki in under 60 seconds:
1. Pick what you worked on.
2. Show proof.
3. Eblocki checks if it counts.
4. Eblocki gives the next move.

## Public one-liner
"Eblocki helps you stop fake productivity by turning effort into proof."

## Longer explanation
"Submit one piece of proof. Eblocki checks whether it actually shows progress,
warns you if the work looks fake or weak, and gives your next command."

## User-facing language map
| Internal name | Now shown to user |
| --- | --- |
| Court of Evidence | Proof Check |
| Adversarial Review | Fake Progress Check |
| Sentinel | Risk Radar |
| Identity Ledger | Progress Record |
| Intervention | Next Command |
| Proof Artifact | Proof |
| Proof Week | (removed from primary UI) |

## Proof Week
- Removed from Landing CTAs and Dashboard.
- `ProofWeekPanel` is no longer rendered.
- `/proof-week` route and page remain reachable for existing beta cohort links
  but are not a primary product concept.
- All "Join Proof Week" / "Start Proof Week" calls-to-action replaced with
  "Start Today" and "Submit Proof".

## Files changed
- `src/pages/Landing.tsx` — new copy, CTAs point to `/start-today` and `/proof`.
- `src/pages/Dashboard.tsx` — removed `ProofWeekPanel`; verdict empty-state
  copy updated to plain language.
- `src/pages/Proof.tsx` — header eyebrow + verdict + page title renamed to
  "Proof Check".
- `src/pages/Coach.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Modes.tsx`,
  `src/pages/ModeDetail.tsx`, `src/pages/Auth.tsx`,
  `src/components/eblocki/ProofContractCard.tsx` — user-facing
  "Court of Evidence" → "Proof Check".
- `src/pages/Operator.tsx` — user-facing "Identity Ledger" → "Progress Record".
- `docs/release/simple-user-clarity-pass.md` — this document.

## Intelligence preserved (no behavioural change)
- Proof engine, proof scoring, proof standard preview.
- Court of Evidence verdict logic (internal name unchanged).
- Adversarial review and fake-study detector.
- Identity ledger storage and surfacing.
- Sentinel / Temporal forecast and intervention engine.
- Coach router, mode detection, state detection.
- Supabase schema, types, and migrations — untouched.

## Not verified in this pass
- Authenticated mobile QA on real device at 375px (visual regression).
- PostHog event names (no analytics rename performed).
- Edge function copy.

## Risks
- Internal code/log strings (e.g. `system-prompt.ts`, `coach-router.ts`,
  `product-matching.ts`, `proof-week.ts`) still reference legacy names. These
  are not user-visible and were intentionally left alone to avoid behaviour
  drift.
- `/proof-week` route is still mounted; remove later once beta cohort is off it.
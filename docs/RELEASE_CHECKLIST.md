# Release Checklist - Eblocki

This checklist defines the release gate for Eblocki changes. A change is not release-ready until GitHub CI is green or any failure is explicitly understood and fixed.

## GitHub CI

The workflow lives at `.github/workflows/ci.yml` and runs on:

- push to `main`
- pull request targeting `main`

Required CI checks:

- `npm ci`
- `npm run test`
- `npm run build`
- `npm run perf:bundle-size` (desktop bundle-size guardrail)
- Lighthouse desktop thresholds via `@lhci/cli` (`lighthouserc.json`)
- `npm run lint:eblocki`
- built SPA route smoke check through `npm run smoke:routes`
- `npm audit --audit-level=moderate`

## What Blocks Release

Release is blocked when any of these fail:

- tests fail
- build fails
- desktop bundle-size guardrail fails (`scripts/bundle-size-guardrail.mjs`) — a chunk or the JS/CSS total exceeded its budget. Fix the regression or, if intentional (new large dependency), raise the specific budget in that file and note the reason here.
- Lighthouse desktop assertions fail (`lighthouserc.json`) — performance ≥ 0.8, a11y ≥ 0.9, best-practices ≥ 0.9, LCP ≤ 3.5s, TBT ≤ 400ms, CLS ≤ 0.1 on `/`, `/dashboard`, `/proof`.
- targeted Eblocki lint fails
- route smoke check fails for `/`, `/dashboard`, `/start-today`, `/proof`, `/coach`, `/gameforge`, `/operator`, `/install`, or `/why`
- audit reports moderate, high, or critical vulnerabilities that have not been accepted with a documented security decision

Do not delete tests, weaken assertions, skip build, or remove audit to get a green run.

## Audit Failures

If `npm audit --audit-level=moderate` fails:

- read the advisory output in the CI log
- identify package, severity, and fixed version
- prefer normal non-breaking package upgrades
- do not run `npm audit fix --force` unless the breaking changes have been reviewed and tested
- if a vulnerability is inherited from tooling such as Vite or Vitest and a safe upgrade is not available, document the advisory and keep the audit visible in CI

## Targeted Lint

`npm run lint:eblocki` verifies recent Eblocki-owned surfaces without turning every release into a repo-wide cleanup pass:

- `src/lib/eblocki`
- `src/lib/gameforge`
- `src/components/gameforge`
- `src/pages/Coach.tsx`
- `src/pages/GameForge.tsx`

The original `npm run lint` script remains available for full-repo linting.

## Coach Manual QA

Verify `/coach` after CI is green:

- empty input state explains diagnosis, proof, and practice
- simple question produces diagnosis and proof action
- study problem produces study coaching
- law issue uses law reasoning without invented sources
- sales issue uses customer need, value framing, objection handling, and close language
- overplanning or avoidance input shows a warning
- proof action always appears
- GameForge suggestion appears when practice is useful
- deterministic fallback remains useful if the Coach function or AI provider is unavailable

## GameForge Manual QA

Verify `/gameforge` after CI is green:

- empty input generates a safe starter pack
- short input generates a pack without crashing
- pasted material generates domain-specific practice
- generated pack has levels and rounds
- user can answer a round
- feedback appears after submission
- mistake clinic appears after a wrong answer
- boss battle appears before completion
- mastery result appears after completion
- proof artifact appears and can be copied
- Coach review link opens `/coach` with the GameForge result context

## Mobile QA

Check at mobile width before release:

- Coach input and mode chips fit without horizontal overflow
- Coach response cards stack cleanly
- GameForge mode, intensity, and style selectors are usable
- active round answer controls are tappable
- boss battle and mastery result remain readable

## Supabase And Secrets

- no service role key in client code
- client code uses only Vite publishable Supabase env variables
- Edge Function secrets stay server-side
- migrations must include RLS policies when adding tables
- generated Supabase types must match schema before relying on new columns

## Final Release Decision

Release only when:

- GitHub CI is green
- manual Coach/GameForge QA is complete
- audit result is clean or documented
- no fake AI, fake certainty, or proof-free success path has been introduced

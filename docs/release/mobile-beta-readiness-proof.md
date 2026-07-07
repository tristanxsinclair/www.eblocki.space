# BLUF

Status is `BLOCKED`, not beta-ready proof. On July 4, 2026 at 22:39:38 AWST, mobile checks at `375x812` and `390x844` showed the public landing page rendering without horizontal overflow, but every beta-flow route requested for verification (`/onboarding`, `/proof`, `/dashboard`, `/start-today`, `/coach`) redirected to `/auth`, so the onboarding -> proof -> verdict/standard -> dashboard loop was not observable.

## Date/time

`2026-07-04 22:39:38 AWST`

## Branch/commit

- Branch: `codex/recover-proof-check-mcp-main`
- Commit: `41bd1c1 Complete v1.5 activation pass`

## Commands run

```bash
git status --short
git branch --show-current
git log --oneline -1
npm install
npm run build
npm run dev -- --host 127.0.0.1
```

## Command results

- `git status --short`: repo was clean for app code before QA; QA work added `docs/release/mobile-qa-results.json`, screenshots, and a temporary `playwright` dev dependency update in `package.json` and `package-lock.json`.
- `git branch --show-current`: `codex/recover-proof-check-mcp-main`
- `git log --oneline -1`: `41bd1c1 Complete v1.5 activation pass`
- `npm install`: succeeded.
- `npm run build`: succeeded. Build produced a large chunk warning for `dist/assets/index-BtGCQGrT.js` at `826.48 kB`.
- `npm run dev -- --host 127.0.0.1`: succeeded at `http://127.0.0.1:8080/`.
- Browser execution note: the in-app browser could not complete localhost navigation in this environment, so final viewport proof was captured with local Playwright on the same machine.

## Viewports tested

- `375x812`
- `390x844`

## Routes tested

- `/`
- `/onboarding`
- `/proof`
- `/dashboard`
- `/start-today`
- `/coach`

## Screenshot evidence list

Core evidence set:

- `docs/release/screenshots/root-375.png`
- `docs/release/screenshots/onboarding-375.png`
- `docs/release/screenshots/proof-375.png`
- `docs/release/screenshots/dashboard-375.png`
- `docs/release/screenshots/start-today-375.png`

Additional mobile width captures:

- `docs/release/screenshots/coach-375.png`
- `docs/release/screenshots/root-390.png`
- `docs/release/screenshots/onboarding-390.png`
- `docs/release/screenshots/proof-390.png`
- `docs/release/screenshots/dashboard-390.png`
- `docs/release/screenshots/start-today-390.png`
- `docs/release/screenshots/coach-390.png`

## Route-by-route pass/fail table

| Route | Viewport | Pass/Fail | Horizontal overflow | Primary CTA visible | Core action clear | Console errors | Screenshot | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `375x812` | PASS | no | yes | yes | no | `docs/release/screenshots/root-375.png` | Public landing rendered normally. |
| `/onboarding` | `375x812` | FAIL | no | yes | yes | no | `docs/release/screenshots/onboarding-375.png` | Redirected to `/auth`. |
| `/proof` | `375x812` | FAIL | no | yes | yes | no | `docs/release/screenshots/proof-375.png` | Redirected to `/auth`. |
| `/dashboard` | `375x812` | FAIL | no | yes | yes | no | `docs/release/screenshots/dashboard-375.png` | Redirected to `/auth`. |
| `/start-today` | `375x812` | FAIL | no | yes | yes | no | `docs/release/screenshots/start-today-375.png` | Redirected to `/auth`. |
| `/coach` | `375x812` | FAIL | no | yes | yes | no | `docs/release/screenshots/coach-375.png` | Redirected to `/auth`. |
| `/` | `390x844` | PASS | no | yes | yes | no | `docs/release/screenshots/root-390.png` | Public landing rendered normally. |
| `/onboarding` | `390x844` | FAIL | no | yes | yes | no | `docs/release/screenshots/onboarding-390.png` | Redirected to `/auth`. |
| `/proof` | `390x844` | FAIL | no | yes | yes | no | `docs/release/screenshots/proof-390.png` | Redirected to `/auth`. |
| `/dashboard` | `390x844` | FAIL | no | yes | yes | no | `docs/release/screenshots/dashboard-390.png` | Redirected to `/auth`. |
| `/start-today` | `390x844` | FAIL | no | yes | yes | no | `docs/release/screenshots/start-today-390.png` | Redirected to `/auth`. |
| `/coach` | `390x844` | FAIL | no | yes | yes | no | `docs/release/screenshots/coach-390.png` | Redirected to `/auth`. |

## Horizontal overflow findings

- No horizontal overflow was observed on any rendered page at `375x812` or `390x844`.
- This finding is limited to the public landing page and the auth screen reached by redirect.

## Core loop findings

- The landing page clearly presents the public beta entry message and CTA on mobile.
- Protected beta routes do not render their target screens for an unauthenticated session.
- Because the session was redirected to `/auth`, the mobile beta loop `onboarding -> proof -> verdict/standard -> dashboard` was not observed.

## Exact blockers

- No authenticated beta test session or approved test credentials were available for local mobile QA.
- `/onboarding`, `/proof`, `/dashboard`, `/start-today`, and `/coach` are all protected and redirected to `/auth` in the tested state.
- Without an authenticated user, there is no evidence for the actual beta flow on mobile, so a readiness claim would be fabricated.

## Next smallest fix

- Run the same mobile sweep with a real beta/test account that can open `/onboarding`, submit one proof, reach the verdict/standard state, and return to `/dashboard`.

## What was not verified

- Authenticated onboarding UI on mobile.
- Proof submission UI on mobile.
- Verdict/standard state on mobile.
- Dashboard return after proof submission on mobile.
- Any logged-in beta flow interactions, data writes, or post-proof state changes.

## Final status: BLOCKED

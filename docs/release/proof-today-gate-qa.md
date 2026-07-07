# Proof-Today Gate QA

Date: 2026-07-05

## Verified

- `npm run test` passed: 33 test files, 265 tests.
- `npm run build` passed against the production Vite build.
- Targeted proof-gate lint passed with no errors. Existing `src/pages/Proof.tsx` hook dependency warnings remain.
- Repo-wide `npm run lint` still fails from unrelated legacy lint debt outside the proof-today gate files.
- Signed-out mobile-width route smoke verified against `npm run preview -- --host 127.0.0.1 --port 4173`:
  - `/dashboard` redirects to `/auth`.
  - `/start-today` redirects to `/auth`.
  - `/proof?first=1&ugly=1` redirects to `/auth`.
- Local-day proof detection is covered by unit tests, including Australia/Perth midnight behaviour.

## Not Verified

- Signed-in new user with no proof today.
- Signed-in user with proof yesterday only.
- Signed-in user with proof today unlocking planner and advanced dashboard state.
- Submit-proof success returning to dashboard with updated proof-today state.
- Submit-proof failure UX against a real Supabase failure.
- Visual screenshots of command gate, proof page, or post-proof dashboard.

## Commands Run

```sh
npx vitest run src/lib/eblocki/__tests__/local-day.test.ts src/lib/eblocki/__tests__/dashboard-view-model.test.ts src/lib/eblocki/__tests__/first-proof.test.ts
npx eslint src/pages/Dashboard.tsx src/pages/StartToday.tsx src/pages/Proof.tsx src/lib/eblocki/dashboard-view-model.ts src/lib/eblocki/first-proof.ts src/lib/eblocki/local-day.ts src/lib/eblocki/__tests__/dashboard-view-model.test.ts src/lib/eblocki/__tests__/first-proof.test.ts src/lib/eblocki/__tests__/local-day.test.ts
npm run test
npm run build
npm run lint
npm run preview -- --host 127.0.0.1 --port 4173
```

## Screenshots And Manual QA Still Needed

- Capture mobile 375px screenshots for signed-in no-proof-today dashboard, `/start-today`, `/proof?first=1&ugly=1`, submit-proof success, and dashboard after proof.
- Use an authenticated beta account or test account to verify no-proof-ever, proof-yesterday-only, and proof-today states against Supabase data.
- Confirm ugly-start query-param copy changes entry hint only and does not alter proof scoring or Court verdict logic in the live signed-in flow.

## Remaining Risks

- Beta readiness is blocked until the signed-in proof submission flow is observed end-to-end.
- The proof-today gate now uses browser local-day semantics. If a user's saved profile timezone intentionally differs from the browser timezone, the gate does not yet read that profile timezone.
- Repo-wide lint remains red from unrelated legacy issues, so CI will remain blocked if it requires `npm run lint`.

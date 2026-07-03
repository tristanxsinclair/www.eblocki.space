# Proof First Submission Simplification v1 Handoff

## Summary

This handoff records the merged Proof First Submission Simplification v1 change from PR #4, which landed on `main` on 2026-06-29.

The change keeps normal `/proof` behaviour intact while making `/proof?first=1` usable by a first-time student without learning advanced Eblocki terminology first.

## Post-Merge Cleanup Note

This cleanup pass de-duplicated the merged helper, test, and handoff state without changing the intended first-proof behaviour.

PR #4 changed only:

- `src/lib/eblocki/first-proof.ts`
- `src/lib/eblocki/__tests__/first-proof.test.ts`
- `docs/release/proof-first-submission-simplification-v1-handoff.md`

`src/pages/Proof.tsx` already contained compatible first-proof UX wiring on current `main`, but was not part of PR #4.

## Behaviour Changed

- `/proof?first=1` now uses the page title `Submit your first proof.`
- First-proof mode explains the task in plain student wording: paste one piece of real work and Eblocki checks whether it proves progress.
- Student examples now include essay paragraph, study notes in your own words, corrected past-paper answer, IRAC paragraph, and psychology concept explanation.
- First-proof mode uses safe deterministic defaults:
  - mode: `GENERAL_EXECUTION`
  - domain: `general_execution`
  - artifact type: `written answer`
- First-proof mode shows only the minimum fields by default:
  - title
  - pasted work
- Mode and proof type are still available, but only behind `Advanced details`.
- First-proof standard preview is simplified into:
  - What counts?
  - What makes it stronger?
  - What should I paste?
- First-proof verdict copy is simplified into:
  - What counted
  - What was weak or missing
  - One next action
- Normal `/proof` keeps the full proof standard preview, contract logic, scoring logic, temporal-linked proof flow, attachment flow, and advanced verdict.

## Files Changed

- `src/lib/eblocki/first-proof.ts`
- `src/lib/eblocki/__tests__/first-proof.test.ts`
- `docs/release/proof-first-submission-simplification-v1-handoff.md`

## Files Intentionally Not Touched

- Supabase schema, RLS, migrations, functions, storage rules
- Proof scoring logic
- Domain standard logic
- Temporal logic
- Stripe
- Cortex
- Routes
- Package files and lockfiles
- Build output

## Verification Results

Historical note from the verified local implementation workspace before merge:

- `pnpm test`: passed, 28 files / 221 tests
- `pnpm run build`: passed
- `pnpm exec tsc --noEmit`: passed
- `pnpm run smoke:routes`: passed for `/`, `/dashboard`, `/start-today`, `/proof`, `/coach`, `/gameforge`, `/operator`, `/install`, `/why`
- Static `/proof?first=1`: HTTP 200, SPA root present
- Targeted lint on touched files: no errors

## Known Lint Debt

Full repo lint still fails on pre-existing repo-wide debt outside this task. Do not treat that as part of this handoff.

Observed after the implementation:

- `pnpm run lint`: failed with existing repo-wide lint errors in unrelated files
- `src/pages/Proof.tsx`: remained compatible on current `main`, but was not changed in PR #4
- `src/pages/Proof.tsx`: still has two pre-existing hook dependency warnings

Do not clean broad lint debt as part of applying this patch.

## Blocked Authenticated Visual QA

Authenticated browser QA was not completed in the local packaging pass because `/proof?first=1` is protected and requires a signed-in browser session.

After applying the patch to the real repo, manually verify:

- `/proof?first=1` loads after sign-in.
- The first viewport does not expose Court, identity escalation, temporal, calibration, evidence governance, or behavioural operating system language.
- The page has one obvious task: paste real work and submit first proof.
- `Advanced details` contains mode/proof-type controls without making them mandatory.
- First-proof submission produces an honest verdict.
- The verdict shows Back to dashboard as the primary action and Submit another proof as the secondary action.
- Normal `/proof` still shows the full standard preview and professional proof flow.

## Apply Instructions

Preferred patch apply path:

1. From the real repo root, create a branch:

   ```bash
   git checkout -b codex/proof-first-submission-simplification-v1-20260626
   ```

2. Apply the patch:

   ```bash
   git apply proof-first-submission-simplification-v1.patch
   ```

3. Verify only the intended files changed:

   ```bash
   git diff -- src/lib/eblocki/first-proof.ts src/lib/eblocki/__tests__/first-proof.test.ts docs/release/proof-first-submission-simplification-v1-handoff.md
   ```

4. Run verification:

   ```bash
   pnpm test
   pnpm run build
   pnpm exec tsc --noEmit
   pnpm exec eslint src/lib/eblocki/first-proof.ts src/lib/eblocki/__tests__/first-proof.test.ts
   ```

5. If available, run route smoke:

   ```bash
   pnpm run smoke:routes
   ```

Fallback copy path:

1. Copy the files from `handoff/proof-first-submission-simplification-v1/` into the same repo-relative paths in the real repo.
2. Do not copy any other files.
3. Run the same verification commands above.

## Completion Standard

After applying this handoff, the activation spine should be:

Landing -> auth/dashboard -> zero-state dashboard -> `/proof?first=1` -> honest simplified verdict -> dashboard.

A first-time student should be able to submit proof before learning Eblocki's advanced language.

# WP0 — Production Truth Receipt

## Verdict

**BLOCKED — canonical production now matches merged main, but production schema/runtime and authenticated-loop evidence remain missing.**

## Repository

- Repository: `tristanxsinclair/www.eblocki.space`
- Verification branch: `codex/wp0-main-receipt`, created directly from `origin/main`
- Main HEAD SHA: `93b118ca8e349e83cb17fc8fd1cdf2975fd142d3`
- Main commit: `Merge pull request #111 from tristanxsinclair/codex/wp0-production-truth`
- WP0 implementation commit: `c991de409e0479767281886590c5b32d22c8672b`
- WP0 receipt update commit: `1b6fcb251f4a735213cd65ee04e1af04a39db861`
- PR #111 merged: yes, at `2026-08-11T04:38:52Z`
- Working tree before this receipt update: clean
- Remote status: `origin/main` at the merge commit above

## Build identity

- Commit SHA: injected from a validated deployment variable or `git rev-parse HEAD`; otherwise unavailable
- Build ID: deployment-supplied ID, or SHA plus UTC build time when SHA is known; otherwise unavailable
- Build timestamp: UTC ISO-8601 timestamp generated when Vite evaluates the production build
- Environment: explicit deployment environment, falling back to the Vite mode
- App version: `0.0.0` from `package.json`

GitHub CI, Pages, and E2E builds now supply `github.sha`, the Actions run ID/attempt, and an explicit environment. The client-visible object contains only the five fields above; it does not read or expose application secrets.

## Lovable WP0 audit

Claimed:

- roadmap
- build metadata
- Settings card
- clean typecheck
- 367 passing tests

Observed at `origin/main` before this work:

- no `docs/release/personal-evidence-twin-roadmap.md`
- no `src/lib/eblocki/build-info.ts`
- no Settings build-information card
- no build metadata injection in `vite.config.ts`
- no reproducible evidence for the claimed typecheck or test count

Corrections:

- implemented the build identity contract and honest unavailable state
- added the Settings System/build-information card
- added build metadata tests
- added trusted metadata inputs to GitHub build workflows
- added the gated roadmap and this receipt
- added a database uniqueness guard for one XP settlement per non-null proof ID
- applied non-breaking transitive security patches; no force or major upgrade was used

## Verification matrix

| Check | Command / evidence | Status | Observation |
| --- | --- | --- | --- |
| Typecheck | `npm exec -- tsc -p tsconfig.app.json --noEmit` | PASS | exited 0 with no diagnostics |
| Tests | `npm test` | PASS | 50 files, 375 tests passed |
| Build | `npm run build` | PASS | Vite 5.4.21; 1,977 modules; existing >500 kB chunk warning |
| Lint | `npm run lint:eblocki`; `npm run lint` | PASS | targeted gate clean; repository lint 0 errors and 12 existing warnings |
| Route smoke | preview on `127.0.0.1:4172`; `npm run smoke:routes` | PASS | 17/17 routes returned HTTP 200 |
| Bundle guardrail | `npm run perf:bundle-size` | PASS | all JS/CSS chunks within repository budgets |
| Production audit | `npm audit --omit=dev --audit-level=high` | PASS | no high production finding; two moderate React Router advisories remain and require a breaking v7 upgrade |
| CI | GitHub Actions for main SHA `93b118c` | PASS | CI, GitHub Pages, and Datadog workflows completed successfully |

## Supabase alignment

- Read-only access check (post-publication WP0 pass): `SUPABASE_ACCESS_TOKEN` was absent in both the sandbox and approved host process. The production project reference resolved from `supabase/config.toml`. No database or Management API query was attempted without the credential.
- Local schema: `proof_artifacts` drives the `cle_after_proof_insert` trigger; the May 20 CLE migration creates `xp_events`, `court_verdicts`, `domain_levels`, `operator_level`, and `identity_ledger`.
- Generated types: contain the proof, verdict, XP, ledger, commitment, objective, operator, and domain structures read by current source.
- Frontend writes: `Proof.tsx` inserts the generated `proof_artifacts` fields, then links commitments/objectives using ownership and null guards.
- CLE: Postgres creates the authoritative verdict, XP event, ledger entry, and progression updates after artifact insert. `court_verdicts.proof_id` is already a primary key.
- Duplicate protection: the WP0 migration adds a partial unique index on `xp_events(proof_id)` for non-null proof IDs. Court is one-per-proof; commitment/objective closure is guarded; multiple ledger kinds for one proof remain intentional.
- Production state: **UNVERIFIED**. The promised read-only Supabase access token was not present in the runtime; local migration files are not deployment evidence.
- Edge functions: **UNVERIFIED**. Local Coach and support functions were inspected, but the environment has no deployment access with which to match source to the deployed versions.

Verdict: **UNVERIFIED**

## Production identity

- Canonical URL: `https://eblocki.space`
- Expected SHA: `93b118ca8e349e83cb17fc8fd1cdf2975fd142d3`
- Live SHA: `93b118ca8e349e83cb17fc8fd1cdf2975fd142d3`
- Live build ID: `93b118ca8e34-20260811043923`
- Live build timestamp: `2026-08-11T04:39:23.746Z`
- Live environment: `production`
- Live app version: `0.0.0`
- Main → live: **MATCH**

Publication history on 11 August 2026 (Australia/Perth): WP0 was initially blocked by the unmerged PR, then by canonical production serving pre-WP0 bundle `assets/index-CseAZrM0.js`. After the user manually republished through Lovable, a cache-bypassed retrieval served new bundle `assets/index-DjGr7P_P.js` (996,517 bytes). Its compiled build contract contains the exact main SHA, build ID, UTC timestamp, production environment, and app version recorded above. The Settings card remains protected; navigating to `/settings` redirected to `/auth` because no legitimate session was available.

## Authenticated production evidence loop

- Session available: no
- Artifact submission: not observed
- Artifact ID: unavailable
- Court verdict: not observed
- Court verdict ID: unavailable
- XP settlement: not observed
- XP event ID: unavailable
- Quest/objective closure: not observed
- Progression update: not observed
- Next command: not observed
- Refresh persistence: not observed
- Duplicate settlement check: source/migration audit only; production behaviour not observed

Status: **NOT OBSERVED**

## Remaining blockers

- The read-only `SUPABASE_ACCESS_TOKEN` is not present in the Codex runtime, so production catalog and deployed Edge Function metadata cannot be inspected.
- The new XP uniqueness migration is not verified as applied in production.
- Production Supabase schema and Edge Function versions cannot be matched to repository source with current access.
- No legitimate authenticated production session was available for the real evidence-settlement loop.

## Evidence limitations

- GitHub Pages success proves only the separate Pages workflow, not canonical Lovable publication.
- Signed-out route access does not prove authenticated application behaviour.
- Generated types and local migrations do not prove production database state.
- Edge Function source presence does not prove deployment.

## Final WP0 decision

WP0 is **BLOCKED**. Merged main and canonical production now match through the deployed build identity contract. Production Supabase/runtime alignment and an authenticated non-duplicating settlement loop remain unobserved, so XP idempotency is not yet proven in production. WP1 must not begin.

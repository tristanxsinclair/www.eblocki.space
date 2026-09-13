# Correction intelligence and verdict coherence

Starting main: `9e371319b100bd5c32729960e1e8780425d01767`
Branch: `codex/correction-intelligence-verdict-coherence`

## Audit before implementation

KNOWN: Proof.tsx calls scoreProofArtifact, inserts proof_artifacts, independently closes commitments/objectives, then renders user-facing-copy and StudyVerdictHint. The latter displays a competing regex verdict. next-upgrade-extract prioritises user text in scoring, persistence and rendering. Correction CTA only sets transient form state; no persisted parent exists. Psychology falls through the domain registry. Preview independently selects standards from contract context. DB cle_after_proof_insert uses a five-point Court scale on ten-point scores, awards XP and ledger entries before insert, rejects recent duplicates using title plus content. Contract update checks no returned row. Historical lists consume persisted rows; daily status uses plainVerdictLabel. Temporal snapshots are advisory. Coach reads saved Court history; it does not score submitted artifacts. System Forge and both MCP entrypoints consume source scoring/checking. Legacy scoreProof is a separate older heuristic API.

Canonical source before: src/lib/eblocki/proof-scoring.ts for browser numeric scores, SQL cle_court for settlement, fake-study-detector.ts for method verdict, domain-standards.ts for rubric; no authoritative composite assessment.
Generated copies: mcp-dist is tsc output from npm run mcp:build; supabase/functions/mcp/index.ts has generator banner and is bundled from src/lib/mcp by the Vite mcp plugin. Regenerate; never patch by hand. Windows generation is disabled by existing configuration because of drive-path handling. NEEDS VERIFICATION: deployed edge bundle and live database migration state; local files cannot establish production parity.

Planned narrow architecture: extend ProofScoringResult with standard, evidence gap, independent recommendation and eligibility. Add deterministic structural academic dimensions and conservative parent comparison. Store versioned assessment JSON and parent FK for historical integrity. Render only canonical strength. DB guards normalise score/strength, reject duplicate evidence and enforce ownership/one-time contract binding; Court maps the same ten-point scale. No external factual correctness certification.

## Architecture after

`Proof form -> scoreProofArtifact -> versioned assessment + proof_artifacts -> DB integrity guard -> existing CLE settlement -> canonical verdict + correction comparison -> historical cards`.

`proof-check` (both MCP entrypoints) uses that scorer, honours the selected standard, derives academic missing dimensions from the same assessment and returns its system recommendation. It no longer inserts a second study verdict or prioritises the detector's next command. The old `scoreProof` export has no production callers in this checkout.

`StudyVerdictHint` is now a **Study method signal**. It displays only detected wording and a limitation. Its internal legacy tier and recommendation never become a second user-facing verdict. This applies to live and submitted hints, regardless of domain.

The scorer owns numeric quality, strength, count/closure eligibility, selected standard, primary gap, recommended artifact and independently derived next correction. The SQL Court projects the ten-point score: 1–3 rejected, 4–6 useful, 7–8 strong, 9–10 elite. Pressure/transfer flags retain their XP role without overriding displayed strength. `plainVerdictLabel` fails closed when strength and numeric score do not jointly support counting. Contract closure checks eligibility and confirms the updated row instead of interpreting an error-free zero-row update as success.

## Root causes and evidence status

| Finding | Status | Resolution |
| --- | --- | --- |
| Scorer and method detector are independent classifiers rendered as peers | KNOWN | Method signal has no verdict or competing correction copy |
| Psychology lacks a registered applied standard | KNOWN | Shared academic applied-understanding standard; psychology aliases route directly |
| User text overrides system correction in three places | KNOWN | Remove extraction from scoring and primary verdict; persist provenance separately |
| Corrected CTA has transient state but no lineage | KNOWN | Parent FK, versioned comparison snapshot, URL parent hint checked against owned rows |
| Wrapping Link overwrites the corrected URL | KNOWN, reproduced by browser regression | Use one navigation owner and retain parent/mode through refresh |
| Database Court uses five-point thresholds on ten-point scores | KNOWN | Correct ten-point projection; flags no longer upgrade Court strength |
| Contracts close without a strength check; zero-row update looks successful | KNOWN | Eligibility gate, compare-and-set row confirmation and DB binding guard |
| Title-based duplicate identity can reward a renamed correction | KNOWN | Normalised evidence fingerprint ignores title and future next-step text; serialize user inserts |
| Tracked MCP preview copy was already behind source and lacked its generated display-label dependency | KNOWN | Regenerate from source; include missing generated dependency |
| Deployed code/migration state matches repository | NEEDS VERIFICATION | Staged rollout and live authenticated loop required |
| Supplied descriptions reproduce the exact original strings | ASSUMED reconstruction only | Fixtures clearly label reconstructed content; 8→7 comparison tested independently |

## Academic and correction model

Academic dimensions are structural: explanation, reasoned scenario application, discrimination, and explicit before/after correction. They require substantive sentences with connected reasoning, rather than counting repeated rubric keywords. An unsupported claim, short rubric list, desired score or future next-step section does not establish these dimensions. This is still a conservative language heuristic, not semantic or factual certification. Academic scores are capped at 8 because independent marking, unaided retrieval and novel transfer are not verified.

The comparison records original/new scores and strengths, raw delta, original system recommendation, target status, structural change, new dimensions, missing/lost dimensions and an explanation. Target status is resolved / partially_resolved / unresolved / incomparable. Structural change is improved / regressed / unchanged / mixed / unknown. These are separate axes: a lower raw score can accompany addressing a target while losing other dimensions. Difficulty remains explicitly unverified.

A concrete scenario can resolve an application target. Merely explaining simultaneous processing only partly satisfies a request to weigh competing explanations. Marking/transfer targets cannot be fully resolved by keyword detection. Unknown/non-academic targets remain incomparable rather than inventing progress. Existing historical recommendations have unknown provenance, so they are not promoted into verified system targets.

## Persistence and backward compatibility

Two additive fields: `parent_artifact_id` (nullable own-user parent FK) and `assessment` (nullable versioned JSON). JSON stores system recommendation, user proposal, target, gap and comparison; existing score/strength/content fields retain their role. Extracted attachment content now persists with the scored artifact, so historical evidence matches scoring input. No sensitive artifact content is added to analytics.

Comparison snapshots survive reload and navigation. Runtime parsing tolerates null/malformed historic metadata. Missing/malformed parent references fail closed before filing; old rows still display recorded feedback and explicitly unknown next-step provenance. Assessed content, domain, scores and lineage are immutable after insertion, while temporal snapshots and feedback workflows continue to work. Parent deletion can retain historical comparison data while the FK becomes null.

The migration is idempotent (executed twice in the test database). Own-row RLS policies are unchanged. Parent ownership is checked explicitly in the database. Type declarations include the new row fields, relationship and pure SQL helper. Full type regeneration against deployed Supabase remains a deployment check.

## Settlement and counters

Intended semantics: a distinct corrected artifact is a new history entry and may earn its own per-artifact XP. It is not a second settlement of its parent's contract. A content-identical submission, including title-only or proposed-next-step-only changes, is rejected within the existing seven-day duplicate window before CLE side effects run. This prevents duplicate XP/ledger/Court settlement for that evidence.

The existing unique XP index still enforces one event per proof ID. The new advisory lock serializes a user's submissions for duplicate detection; the existing CLE trigger remains the only XP writer on insertion. Tests load the actual CLE migration and verify two distinct artifacts produce two XP events, two strong Court rows, exactly one base ledger effect each (separate legitimate level-up entries are allowed), reconciled operator XP totals, and one retained contract reference. Empty evidence is downgraded before settlement. A settled commitment/objective cannot be rebound to another artifact; closure needs counted, owned proof. Required objectives cannot close without proof. Unrelated edits to historical completed tasks do not retroactively rejudge them.

Entry counts remain history counts. Calendar activity remains dated activity, not an extra streak day per artifact. No new streak-writing code was added. Weak/moderate history and useful-evidence XP are distinct from counted daily closure; this release does not retroactively rewrite old XP or counters.

## Verification

| Exact command | Final result |
| --- | --- |
| `npm test` | PASS, 47 files / 369 tests |
| `npm run lint:eblocki` | PASS, no errors or warnings |
| `npm run lint` | PASS, zero errors; 12 warnings in untouched files |
| `npx tsc --noEmit -p tsconfig.app.json` | PASS |
| `npm run build` | PASS; Vite large-chunk advisory remains |
| `npm run perf:bundle-size` | PASS, every chunk within budget |
| `npm run preview -- --host 127.0.0.1 --port 4173` followed by `npm run smoke:routes` | PASS, 12 routes return 200, including proof and first proof |
| `npm run mcp:build` | PASS, generated from canonical source |
| `npm run mcp:smoke` | PASS, local MCP protocol smoke |
| `E2E_BASE_URL=http://127.0.0.1:8087 npx playwright test tests/e2e/correction-coherence.spec.ts tests/e2e/student-app.spec.ts tests/e2e/wp-003-verdict-copy-qa.spec.ts tests/e2e/system-forge.spec.ts` | PASS, 13 passed / 5 skipped; authenticated specs need an injected session |
| `PGLITE_MODULE=/tmp/eblocki-correction-db/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-correction-database.mjs` | PASS, PostgreSQL migration replay and actual CLE settlement checks |
| `git diff --check` | PASS |
| `npm run check:judgment-generated` | PASS after implementation commit; regeneration leaves tracked outputs unchanged |
| `E2E_BASE_URL=http://127.0.0.1:8087 npx playwright test tests/e2e/correction-coherence.spec.ts` | PASS, final targeted rerun: 5 tests |

For reproducible SQL checks, install the isolated test dependency with `npm install --prefix /tmp/eblocki-correction-db @electric-sql/pglite@0.5.8`. The runner creates disposable prerequisite tables and auth shims, loads the actual existing CLE and XP-idempotency migrations, then applies this migration twice and runs `tests/sql/correction-assessment.sql`. It does not connect to production. It is not a full Supabase migration-chain/RLS/concurrency test.

New regression coverage includes source/generated parity, Strong+Useful rendered coherence, domain routing, the reconstructed psychology artifacts, explicit 8→7 decrease, unchanged/irrelevantly extended evidence, user-next-step independence, missing/malformed snapshots, missing parent, changed domain, passive reflection, shorter targeted correction, weak→strong and strong→elite raw comparisons, resolved application and partially resolved discrimination. Browser tests exercise actual form submission, original closure, correction navigation, refresh before submission, historical persistence after submission, one contract write, and viewport containment at 320/390/768/1440. Screenshots were captured; the 390px verdict surface was visually inspected.

Initial failed checks were useful: four law/source-bank routing regressions were fixed, the obsolete test expecting user-text echo was updated to require independent provenance, and the browser correction-link overwrite was fixed. Final results above supersede those exploratory runs.

## Before and after: production regression

| | Observed production | Reconstructed fixture after |
| --- | --- | --- |
| Original | Strong 8/10; general gap | Strong 8/10; application visible, competing explanations not weighed |
| Corrected | Strong 7/10 plus “not strong evidence yet” | Strong 8/10; one strength only; academic standard |
| Comparison | None | Raw delta 0; structural improvement; target partially resolved |
| New evidence | Not explained | Discrimination between interacting processing types is newly visible |
| Remaining | Generic gap / user proposal echoed | Weigh competing explanations in an ambiguous case; independent marking and transfer also remain unverified |
| Recommendation provenance | Mixed | System correction separate from user's proposed ambiguous-scenario practice |
| Settlement | Original closed; correction risks unclear | New distinct history/XP record; original contract reference unchanged |

The additional forced 8→7 fixture renders raw delta −1, target partially resolved, and an explicit statement that task difficulty and factual accuracy are unverified. It never converts a raw score drop into a learning claim.

## Rollout and rollback

Apply the migration to staging **before** deploying the browser bundle. Regenerate and deploy the Supabase MCP bundle as well as the browser; the local Node MCP package must include all regenerated dependencies. `npm run check:judgment-generated` regenerates both outputs and fails on tracked drift, intended for a committed checkout/CI. The parity unit test checks source and generated scoring on the production/adversarial fixtures. Windows retains the repository's existing opt-out of edge generation; use the supported Mac/Linux build path to produce the edge bundle.

Rollback should first stop new writes and restore the prior browser/edge release together. Preserve both additive history columns and snapshots. If a database rollback is required, drop the four new guard triggers, restore only the prior `cle_court` function definition from the starting migration (do not rerun its table/policy creation), and remove the now-unused guard/helper functions after checking dependencies. Retain the XP unique index. This restores the old behavior, including its known judgment defects. Do not delete historical assessment data or recalculate XP as part of rollback.

## Known limitations and remaining production verification

- No production deployment, migration application, account mutation or publishing was performed.
- Live Supabase schema, complete migration chain, auth/RLS interaction, and multi-session advisory-lock behavior require staging verification. Browser REST tests are controlled mocks; PostgreSQL tests execute actual settlement logic but use prerequisite shims.
- Five injected-session tests are skipped, not passed. Repeat the original authenticated psychology journey after migration and deployment; confirm the returned artifact, Court, XP, contract, counters and history agree.
- Content correctness, source independence, true task difficulty, and transfer cannot be certified by deterministic structural patterns. Well-formed false content can still look structurally convincing. No claim of general semantic understanding is made.
- The existing client-calculated scoring trust boundary remains. These changes enforce score/strength consistency and settlement integrity; they are not server-side re-evaluation of a hostile custom API client's numeric score.
- Non-academic historical corrections lacking structured targets report unknown comparison. No fabricated backfill or old XP adjustment occurs.
- Native projects are untouched. No ceremonial native rebuild/sync was run. A packaged mobile release must include the updated web assets through its normal release process; physical-device validation remains external.

## Final verdict

**READY WITH EXTERNAL VERIFICATION** — local implementation and regression checks pass; staging migration/deployment and authenticated production parity remain release gates.

## Exact files changed

- `docs/release/correction-intelligence-verdict-coherence.md`
- `mcp-dist/src/lib/eblocki/academic-evidence.js`
- `mcp-dist/src/lib/eblocki/display-labels.js`
- `mcp-dist/src/lib/eblocki/domain-standards.js`
- `mcp-dist/src/lib/eblocki/fake-study-detector.js`
- `mcp-dist/src/lib/eblocki/proof-check.js`
- `mcp-dist/src/lib/eblocki/proof-scoring.js`
- `mcp-dist/src/lib/eblocki/proof-standard-preview.js`
- `package.json`
- `scripts/test-correction-database.mjs`
- `src/components/eblocki/CorrectionComparison.tsx`
- `src/components/eblocki/StudyVerdictHint.tsx`
- `src/integrations/supabase/types.ts`
- `src/lib/eblocki/__tests__/correction-assessment.test.tsx`
- `src/lib/eblocki/__tests__/fixtures/perception.ts`
- `src/lib/eblocki/__tests__/judgment-generated.test.ts`
- `src/lib/eblocki/__tests__/proof-scoring.test.ts`
- `src/lib/eblocki/academic-evidence.ts`
- `src/lib/eblocki/analytics.ts`
- `src/lib/eblocki/correction-assessment.ts`
- `src/lib/eblocki/domain-standards.ts`
- `src/lib/eblocki/fake-study-detector.ts`
- `src/lib/eblocki/proof-check.ts`
- `src/lib/eblocki/proof-scoring.ts`
- `src/lib/eblocki/user-facing-copy.ts`
- `src/pages/Proof.tsx`
- `supabase/functions/mcp/index.ts`
- `supabase/migrations/20260913000100_correction_assessment.sql`
- `tests/e2e/correction-coherence.spec.ts`
- `tests/sql/correction-assessment.sql`

Implementation commit: `db3dd35`. Work is committed on the isolated branch; nothing was pushed or deployed.

## STAGING FINDING — CORRECTION DOMAIN LINEAGE

Observed authenticated staging failure: the original contract-backed psychology proof was Strong 8/10 under `academic_applied_standard`, counted and closed its contract. After correction navigation removed the completed contract, the child became General/Strong 7/10 and its comparison correctly failed closed as incomparable. The detector disposition was correct; this was context loss, not a reason to loosen comparison.

Confirmed root cause: `Proof.tsx` resolved `selectedModeId` through active mode rows, used the contract as another domain source, and fell back to `GENERAL_EXECUTION` when neither resolved. The parent was loaded only after scoring. A `PSYCH_HD` URL hint therefore did not preserve assessment context without an exact active mode row. Comparison also re-inferred the parent's standard, allowing current inference to override its persisted canonical standard.

Fix: fetch the owned parent before scoring. `correctionAssessmentContext` defaults to its canonical domain and registered persisted standard key; absent/invalid keys fall back to the parent's stored domain, artifact type and evidence through the existing selector. It never uses route hints to override lineage. The existing scorer's `selectedStandard` option is reused; no new scorer, score tuning or migration was introduced. The child persists canonical `psychology`, `academic_applied_standard` and the original parent ID. Required-evidence/elite-reference details use the scorer's selected standard. Comparison now compares the canonical domain and trusted parent standard rather than re-scoring the parent to infer context.

Study-area select events are tracked separately from URL hydration and automatic mode selection. An explicit different area changes context visibly and preserves the legitimate incomparable result. Merely opening or refreshing a correction, including a forged `mode=GENERAL_EXECUTION` URL, does not count as a user override. Refresh resets unsaved form choices and defaults back to trusted parent context. Missing parents still stop submission before scoring/filing. Malformed or incomplete historical snapshots can recover a standard without inventing their missing correction target; comparison remains unknown for that missing history.

Regression coverage:

- All four viewport correction flows now have **no active PSYCH_HD row**. They create the parent from a psychology-linked contract, close it, launch correction, refresh and submit. Assertions verify canonical domain/standard, original parent ID, meaningful comparison and structural improvement, raw score delta, and exactly one contract write retaining the original reference.
- Additional browser tests cover a forged General route, deliberate General selection with visible notice/incomparable result, a historical parent without assessment, and the existing missing-parent fail-closed path.
- Unit tests cover trusted persisted standards outranking current inference, domain aliases, deliberate domain changes, null/invalid/partial snapshots and parent evidence/type fallback. The comparator does not weaken genuine incomparable conditions.

Verification for this follow-up:

| Command | Result |
| --- | --- |
| `npm test` | PASS: 47 files, 373 tests |
| `npx vitest run src/lib/eblocki/__tests__/correction-assessment.test.tsx` | PASS: 15 tests |
| `npm run lint:eblocki` | PASS: no errors/warnings |
| `npm run lint` | PASS: zero errors, same 12 warnings in untouched files |
| `npx tsc --noEmit -p tsconfig.app.json` | PASS |
| `npm run build` | PASS; existing chunk advisory |
| `npm run perf:bundle-size` | PASS |
| `npm run check:judgment-generated` | PASS against canonical generated output; pre-existing local staging issuer override preserved separately |
| `E2E_BASE_URL=http://127.0.0.1:8087 npx playwright test tests/e2e/correction-coherence.spec.ts` | PASS: 8 tests, including absent-mode lineage and explicit overrides |
| `PGLITE_MODULE=/tmp/eblocki-correction-db/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-correction-database.mjs` | PASS: unchanged migration and CLE settlement checks |

Exact follow-up files: `src/pages/Proof.tsx`, `src/lib/eblocki/correction-assessment.ts`, `src/lib/eblocki/__tests__/correction-assessment.test.tsx`, `tests/e2e/correction-coherence.spec.ts`, and this release receipt. Existing local staging edits in `supabase/functions/mcp/index.ts` and `supabase/.temp/` are excluded.

**Another authenticated staging run is required. Verdict remains READY WITH EXTERNAL VERIFICATION.** With the new branch build, repeat the real original-to-corrected psychology loop on an account without an exact active PSYCH_HD row. Close the original contract, click corrected attempt, refresh, and submit the improved artifact without changing study area. Verify the saved child domain is `psychology`, standard key is `academic_applied_standard`, parent ID is correct, raw delta is visible, and comparison is not incomparable because of a lost domain. Verify the original contract still points to the original artifact and has not settled again. A deliberate different area must still yield incomparable. Local mocks and SQL tests do not substitute for this authenticated rerun. Do not merge until it succeeds.

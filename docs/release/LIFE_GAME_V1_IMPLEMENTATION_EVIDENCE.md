# Life-Game v1 implementation evidence

Date: 2026-07-25
Repository: `tristanxsinclair/www.eblocki.space`
Worktree: `C:\Users\trist\Desktop\eblocki\www.eblocki.space.life-game-v1`
Branch: `codex/life-game-v1`
Starting commit: `42064441b5e5ce9bac0daec69239edd1535ded32`

## Outcome

This work implements the zero-migration life-game vertical slice without replacing Eblocki's evidence engine:

- the current Supabase records remain authoritative for artifacts, verdicts, XP, levels, commitments, objectives, momentum, and identity events;
- a read-only `LifeGameSnapshot` adapter projects those records into character, stat, quest, Game Master, and Run Log views;
- the protected release-candidate HUD is mounted at `/game`;
- the existing `/dashboard` is intentionally not replaced before authenticated QA and the current release sequence allow promotion;
- the public landing and deterministic `/demo` explain and preview the life-game loop without database writes or AI calls;
- quest-to-proof linking, proof-required completion guards, Game Master truth constraints, and Arena Score versus character XP boundaries are implemented;
- no migration, generated Supabase type edit, new scoring engine, new quest database, or dependency upgrade was introduced.

A subsequent fun-layer pass adds a command deck, a truthful Run Pulse, quest intensity feedback,
evidence-derived snapshot signals, and interactive Run Log filters. These are presentation-only
derivations of committed records. They do not create badges, award XP, alter levels, or persist a
second progression state.

A settlement pass now makes the evidence transaction feel consequential without weakening its
truth boundary. A quest-filed action can return to `/game?result=<artifact-id>`, where the HUD
reveals only verdict and XP values already present in the authenticated snapshot. Artifact-only
transactions remain visibly pending, arbitrary URL values cannot supply result content, and a
bounded refresh waits for the existing database engine rather than predicting its outcome.

A Run Protocol pass now turns the snapshot into one legible daily game loop:
`Choose → Prove → Verdict → Grow`. Each gate is derived independently from an active quest,
today's artifact count and Run Log timestamp, a committed Court verdict, and a committed XP event.
The protocol supplies one exact next move, rejects yesterday's result as today's progress, and
never treats a filed artifact as a verdict or character update. Mobile renders the active quest
before the protocol; desktop keeps the protocol as the full-width command layer.

## Repository inspected

The implementation began from remote `main` at the starting commit above. The stale desktop root and stale Snapdragon branch were not used as the implementation surface.

Inspected foundations included:

- React Router and protected-route wiring;
- Proof submission, result, commitment-closing, and corrected-attempt behavior;
- daily objectives and proof commitments;
- Compound Level Engine tables and generated types;
- Coach deterministic engine, remote function, vector retrieval bridge, and safety behavior;
- GameForge artifact filing;
- AppShell and mobile navigation;
- migration archive, route smoke, release documents, test configuration, and Capacitor configuration.

The local migration archive contains references for all nine reused records, and generated types contain current markers for all nine:

| Existing record | Migration files containing marker | Generated type markers |
|---|---:|---:|
| `proof_artifacts` | 7 | 2 |
| `xp_events` | 1 | 1 |
| `court_verdicts` | 1 | 1 |
| `operator_level` | 1 | 1 |
| `domain_levels` | 1 | 1 |
| `identity_ledger` | 1 | 1 |
| `proof_commitments` | 1 | 1 |
| `daily_objectives` | 3 | 1 |
| `momentum_state` | 2 | 1 |

No live Supabase migration alignment was claimed because a configured Supabase CLI/project session was not available.

## Files created

- `docs/LIFE_GAME_INTEGRATION_MASTER_PLAN.md`
- `docs/release/LIFE_GAME_V1_IMPLEMENTATION_EVIDENCE.md`
- `docs/release/life-game-landing-1280.png`
- `docs/release/life-game-demo-390.png`
- `docs/release/life-game-demo-1280-fun-pass.png`
- `docs/release/life-game-settlement-390.png`
- `docs/release/life-game-settlement-1280.png`
- `src/components/eblocki/life-game/LifeGameHud.tsx`
- `src/components/eblocki/life-game/LifeGameHud.test.tsx`
- `src/hooks/useLifeGameSnapshot.ts`
- `src/lib/eblocki/life-game/types.ts`
- `src/lib/eblocki/life-game/lexicon.ts`
- `src/lib/eblocki/life-game/projections.ts`
- `src/lib/eblocki/life-game/quest-guard.ts`
- `src/lib/eblocki/life-game/demo.ts`
- `src/lib/eblocki/life-game/pulse.ts`
- `src/lib/eblocki/life-game/settlement.ts`
- `src/lib/eblocki/life-game/index.ts`
- `src/lib/eblocki/life-game/__tests__/authoritative-transaction.test.ts`
- `src/lib/eblocki/life-game/__tests__/projections.test.ts`
- `src/lib/eblocki/life-game/__tests__/quest-guard.test.ts`
- `src/lib/eblocki/life-game/__tests__/demo.test.ts`
- `src/lib/eblocki/life-game/__tests__/pulse.test.ts`
- `src/lib/eblocki/life-game/__tests__/settlement.test.ts`
- `src/lib/gameforge/arena-presentation.ts`
- `src/lib/gameforge/__tests__/arena-presentation.test.ts`
- `src/pages/Demo.tsx`
- `src/pages/GameDashboard.tsx`
- `tests/e2e/life-game-public.spec.ts`

## Files modified

- `README.md`
- `index.html`
- `package.json`
- `scripts/route-smoke.mjs`
- `src/App.tsx`
- `src/components/eblocki/AppShell.tsx`
- `src/components/eblocki/MissionCard.tsx`
- `src/components/eblocki/MobileBottomNav.tsx`
- `src/components/gameforge/GameForgeShell.tsx`
- `src/hooks/useDailyObjectives.ts`
- `src/index.css`
- `src/lib/analytics/events.ts`
- `src/lib/eblocki/__tests__/coach-engine.test.ts`
- `src/lib/eblocki/analytics.ts`
- `src/lib/eblocki/coach-engine.ts`
- `src/pages/Coach.tsx`
- `src/pages/GameForge.tsx`
- `src/pages/Landing.tsx`
- `src/pages/Proof.tsx`
- `supabase/functions/coach/index.ts`

## Implemented behavior

### Truth adapter and HUD

- Uses generated `Tables<>` types and the existing level threshold helper.
- Fetches independent slices with fail-soft health state.
- Projects Body, Mind, Craft, Social, and Discipline without writing level state.
- Builds Run Log entries from artifacts first, leaving missing XP or verdicts pending/unavailable.
- Selects an active quest with objective-before-commitment precedence.
- Reconciles an objective when its linked commitment already has an artifact.
- Provides zero-data, loading, degraded-query, and refresh states.
- Mounts `/game` behind the existing `Protected` wrapper.
- Supports allowlisted `?panel=quests|stats|gm|run-log|intel`.
- Keeps existing Dashboard and advanced Intel surfaces intact.
- Adds a horizontally contained command deck for Quest, Stats, GM, Run Log, Intel, and Arena.
- Derives a Run Pulse from the latest committed ledger/action event, next-level threshold, filed-today count, strongest projected stat, and secondary-record synchronization state.
- Shows display-only operator signals only when authoritative level, streak, verdict, or domain records support them.
- Shows quest resistance as a five-segment intensity meter without changing quest difficulty.
- Filters the current Run Log window by all, actions, system, or pending without changing source records.
- Progressively discloses pulse detail and signal evidence above mobile width so the active quest remains in the first phone viewport.
- Projects the selected evidence settlement from the snapshot's Run Log entry rather than URL
  content.
- Shows a committed verdict, evidence strength, projected stat, and final XP only after
  authoritative secondary records are complete.
- Shows `Artifact committed. Settlement pending.` without reward values when the artifact exists
  before its verdict or XP row.
- Polls the existing snapshot a maximum of four times while settlement is locating or pending,
  then leaves an honest pending/unavailable state instead of inventing success.
- Auto-focuses the result reveal after a proof return while respecting reduced-motion settings.
- Derives five Run Protocol states: no quest, quest armed, artifact filed, verdict committed, and
  evidence cycle complete.
- Marks `Choose`, `Prove`, `Verdict`, and `Grow` complete only when their supporting snapshot
  records exist.
- Uses the latest local-day action for today's protocol and does not reuse an older result.
- Provides one state-specific action: ask the GM, view the quest, refresh truth, or review the
  authoritative settlement.
- Places the active quest before the protocol on mobile and retains the protocol as a full-width
  desktop command layer.
- Removes duplicate first-viewport demo signup copy and invalid nested link/button controls from
  the new landing, demo, and life-game HUD surfaces.

### Quest-to-evidence closure

- Builds `/proof?source=quest&contract=<id>&objective=<id>` from trusted record IDs.
- Treats query parameters as hints and fetches records with authenticated ownership filters.
- Prefills only fetched title, mode, artifact, and standard data.
- Prevents proof-required daily objectives from completing without an artifact ID.
- Removes checkbox completion from proof-required mission cards.
- Creates the artifact before closing the commitment or objective.
- Preserves a created artifact and shows `Action logged // quest sync pending` when secondary synchronization fails.
- Offers `Open character settlement` only for a successfully created quest-linked artifact with a
  valid record ID.

Authenticated database behavior and retry idempotency still require a signed-in runtime walkthrough before release acceptance.

### Game Master

- Keeps the internal `coach` function name, request/response contract, deterministic engine, commitment creation, retrieval bridge, and safety boundary.
- Rebrands user-facing presentation to Game Master.
- Adds compact server-side context from operator/domain/momentum state, recent artifact metadata, authoritative XP/verdict rows, pending commitments, and active mode IDs.
- Excludes raw artifact bodies, attachment URLs, OCR text, secrets, and raw user text from automatic context and analytics.
- Adds explicit constraints against invented XP, verdicts, completion, sources, and competing quests.
- Labels deterministic fallback as `LOCAL DIRECTIVE`.
- Keeps provider and vector failure fail-soft.

The changed edge function was not deployed or exercised against a deployed Supabase runtime.

### Arena

- Keeps GameForge's route and engine intact while presenting it as Arena.
- Presents internal session XP as `Arena Score`.
- Files one proof artifact through the existing path.
- Reads character XP and verdict only from authoritative `xp_events` and `court_verdicts`.
- Displays pending/unavailable state rather than manufacturing a reward.

### Public experience and compatibility

- Repositions the landing around `Your life. Turned into a game.` and `No artifact // no XP`.
- Adds deterministic, PII-free, read-only `/demo`.
- Labels the canned Game Master interaction `DEMO SCRIPT`.
- Demo interactions create no Supabase write or remote AI request.
- Adds friendly `/log`, `/gm`, `/arena`, and `/character` aliases while retaining canonical and historical routes.
- Keeps React 18, Vite, TypeScript, React Router, Lovable metadata, Supabase, and Capacitor architecture.
- Adds no font or runtime dependency.
- Makes no MIT or open-source claim.

## Verification evidence

### Install

Command:

```text
npm ci
```

Result: pass; 645 packages installed. Install reported 12 known vulnerabilities.

### TypeScript

Command:

```text
npx tsc -p tsconfig.app.json --noEmit
```

Result: pass with no output.

### Unit and integration tests

Command:

```text
npm run test
```

Result: pass; 47 test files and 355 tests. Only React Router future-flag warnings were printed.

The settlement-focused subset also passed: 4 files and 21 tests covering URL safety, artifact-only
pending behavior, committed verdict/XP projection, HUD rendering, and the deterministic
quest-to-authoritative-settlement transaction.

The Run Protocol-focused subset also passed: 2 files and 13 tests covering every protocol gate,
today-versus-yesterday isolation, verdict-without-XP behavior, exact next actions, rendered protocol
semantics, and the absence of nested interactive controls.

### Targeted lint

Command:

```text
npm run lint:eblocki
```

Result: pass with no errors or warnings. The script was expanded to cover the new life-game surfaces.

### Repository-wide lint baseline

Command:

```text
npm run lint
```

Result: exit 0 with 12 warnings and 0 errors. Warnings are pre-existing hook-dependency, fast-refresh, and unused-disable debt outside the life-game surfaces. No global cleanup was attempted.

### Production build

Command:

```text
npm run build
```

Result: pass under Vite 5.4.21; 1,974 modules transformed. The main chunk is 1,001.91 kB raw and retains Vite's existing `>500 kB` advisory.

### Bundle-size ratchet

Command:

```text
npm run perf:bundle-size
```

Result: pass.

- total JavaScript: 1,537.8 kB / 1,611.3 kB limit;
- CSS: 102.6 kB / 117.2 kB limit;
- main JavaScript: 979.0 kB / 1,025.4 kB limit.

### Route smoke

Command:

```text
npm run smoke:routes
```

Result: pass; the SPA shell returned HTTP 200 for 17 routes:

```text
/
/demo
/demo?result=demo-log-action-1
/auth
/welcome
/dashboard
/game
/game?result=33333333-3333-4333-8333-333333333333
/log
/gm
/arena
/character
/systems
/proof
/proof?first=1
/proof-week
/start-today
```

This proves route resolution only. It does not prove authenticated behavior.

### Browser QA

Public QA used the production preview with reduced motion.

| Route | 375 | 390 | 414 | 768 | 1280 |
|---|---:|---:|---:|---:|---:|
| `/` horizontal overflow | no | no | no | no | no |
| `/demo` horizontal overflow | no | no | no | no | no |

Additional evidence:

- no browser console or page errors on the public matrix;
- landing rendered the life-game headline and `NO ARTIFACT // NO XP`;
- demo rendered `DEMO OPERATOR // SAMPLE DATA`;
- the scripted demo directive rendered `DEMO SCRIPT`;
- clicking the scripted directive produced zero fetch/XHR requests;
- the command deck, Run Pulse, evidence-derived signals, and quest intensity rendered from the deterministic snapshot;
- the pending Run Log filter reduced the rendered feed to the one pending action and exposed no manufactured XP;
- the settled replay displayed `elite`, `+96`, and its projected stat from the deterministic
  snapshot, then removed the result query when dismissed;
- the artifact-only replay displayed `sync pending` and no `+96` reward;
- an arbitrary result query produced no settlement reveal;
- the settlement reveal auto-focused near the top of the viewport and remained horizontally
  contained at 375, 390, 414, 768, and 1280 px;
- the Run Protocol displayed all four completed gates only from today's deterministic verdict and
  XP records;
- protocol stages remained contained at 375, 390, 414, 768, and 1280 px with no body overflow;
- mobile quest top remained at approximately 488 px after moving the protocol behind the quest,
  keeping the quest heading in the first viewport;
- desktop retained the protocol as a full-width row above the three-column character/quest/GM
  layout;
- the public demo exposed one `Start your run` link rather than two competing first-viewport CTAs;
- rendered landing/demo/HUD controls contained zero nested `a button` or `button a` structures;
- `/demo` remained free of horizontal overflow at 375, 390, 414, 768, and 1280 px after the fun-layer pass;
- no console errors appeared during the fun-layer responsive pass;
- a signed-out `/game` session redirected to `/auth`;
- `/auth` had no horizontal overflow at 390 px.

Baselines:

- `docs/release/life-game-landing-1280.png`
- `docs/release/life-game-demo-390.png`
- `docs/release/life-game-demo-1280-fun-pass.png`
- `docs/release/life-game-settlement-390.png`
- `docs/release/life-game-settlement-1280.png`

Authenticated HUD, quest closure, live verdict/XP synchronization, mobile keyboard behavior, and signed-in aliases remain unverified because no authenticated session was available. Credentials were not requested, printed, stored, or simulated.

### Playwright E2E

Commands:

```text
npx playwright install chromium
E2E_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
```

Result: runner pass; 3 public settlement tests passed and 7 existing product tests skipped because
the required authenticated Supabase session was absent. The public tests verify committed,
artifact-only pending, arbitrary-query rejection, Run Protocol visibility, single demo CTA,
responsive containment, and valid non-nested controls. This is public deterministic E2E evidence,
not authenticated Supabase product evidence.

### Audit

Command:

```text
npm audit --audit-level=moderate
```

Result: exit 1; 12 vulnerabilities: 1 low, 7 moderate, 4 high.

The report includes transitive findings involving `@hono/node-server`, `brace-expansion`, `dompurify`, `esbuild`, `fast-uri`, `postcss`, `react-router`, and `tar`. The Vite/esbuild and React Router remediation paths propose breaking major upgrades. No `npm audit fix`, forced update, or dependency change was run.

### Capacitor

Command:

```text
npx cap doctor
```

Result: command completed. Installed Capacitor dependencies resolve to 8.4.1 while 8.4.2 is available. This checkout has no `ios/` or `android/` native project directory, so native sync/build and generated native diff review were not applicable.

### Diff review

Command:

```text
git diff --check
```

Result: pass. A Vite/Lovable build-time regeneration of `supabase/functions/mcp/index.ts` was detected as unrelated during diff review and restored to the starting commit. No migration, generated Supabase type, or lockfile change remains.

## Schema, security, and privacy impact

- Schema impact: none.
- Migration impact: none.
- Generated Supabase type impact: none.
- RLS bypasses: none introduced.
- Cross-user quest IDs are filtered with authenticated `user_id`.
- URL text is not used as trusted quest or settlement content; result IDs select only entries
  already present in the owned snapshot.
- Analytics properties are enums/IDs/state only; raw GM and artifact content are excluded.
- Demo fixture is deterministic and fictional.
- Secrets and environment files were not read or modified.

## Unresolved risks

- `WP-005A / P1-PAY-ENV VERIFICATION` remains the documented next strict release gate.
- `/dashboard` promotion is intentionally deferred until `/game` passes authenticated desktop and mobile QA.
- The Coach edge function is changed locally but not deployed or runtime-verified.
- Deployed Supabase migration alignment is unverified.
- Authenticated quest closure, partial-sync repair, duplicate prevention, live authoritative
  verdict/XP refresh, and Arena filing need real-user QA.
- Seven authenticated E2E product tests skipped without authentication; three public deterministic
  settlement tests passed.
- Audit debt remains and includes breaking-major remediation paths.
- Repository-wide lint has 12 non-blocking baseline warnings.
- The production main bundle still has the existing large-chunk advisory.
- Native iOS/Android projects are absent from this checkout, so native app verification is unclaimed.
- The repository still has no license; open-source/MIT positioning remains blocked.

## Rollback

Phase 1 has no data rollback.

- Remove `/game` and `/demo` route mounts and the life-game adapter/component directories.
- Restore landing and navigation presentation.
- Revert quest query integration while retaining the existing `/proof` route.
- Revert Game Master/Arena labels while retaining the Coach and GameForge contracts.
- Do not alter historical artifacts, XP, verdicts, levels, commitments, objectives, or identity records.

## Next safest move

Keep this work as an unpromoted `/game` release candidate. After the current strict release gate permits the work, open the app in a visible browser, have Tristan sign in manually, and verify the full quest → artifact → verdict → XP → HUD transaction at 375, 390, 414, 768, and 1280 px. Deploy and verify the Coach function as a separate action. Promote `/game` to `/dashboard` only after those evidence lines pass.

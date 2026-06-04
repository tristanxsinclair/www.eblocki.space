# External AI / Dev Tool Protocol — Eblocki

This document defines how external tools (Codex, Cursor, Replit, GitHub edits,
manual contributors, or other AI agents) must operate on the Eblocki repo so
that work integrates cleanly with Lovable and Supabase.

## Stack (do not change)

- React 18 + Vite + TypeScript
- React Router (client-side routing — **not Next.js**)
- Tailwind CSS v3 + shadcn/ui
- Supabase (auth, Postgres, edge functions, storage) via `@/integrations/supabase/client`
- PostHog analytics
- Capacitor mobile shell
- Lovable project metadata (`.lovable/`, project id in code comments)

## Hard rules

1. **Inspect first.** Read `src/App.tsx`, `supabase/migrations/`, `src/integrations/supabase/types.ts`, and the relevant feature directory before editing.
2. **No framework migration.** Do not introduce Next.js, server-only routes, or Node-only runtime code on the frontend.
3. **Never edit generated files:** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`.
4. **Never edit existing migrations** under `supabase/migrations/`. Add a new timestamped migration instead.
5. **Additive migrations only.** New columns must be nullable or have defaults. New tables require explicit `GRANT` statements + RLS policies in the same migration.
6. **No secrets in code.** Service role keys, API keys, tokens must live in Supabase Function secrets, never in `src/`, never logged.
7. **No duplicate systems.** Before creating a new module, search for existing Eblocki equivalents (proof scoring, Court of Evidence, identity ledger, level engine, GameForge, Sentinel/Cortex). Extend, do not parallel-build.
8. **Preserve Lovable compatibility.** Keep `vite.config.ts`, the React Router setup in `src/App.tsx`, shadcn primitives, and the existing `AuthProvider` pattern.
9. **No fake QA.** Only claim a feature works if `npm run build` passes and the route was opened.

## Required pre-handoff checks

```
npm install
npm run lint       # may have legacy warnings — keep newly touched files clean
npm run test
npm run build
npm audit          # report, do not auto --force
```

## Eblocki canonical modules (do not duplicate)

| Concern | Canonical location |
| --- | --- |
| Proof scoring | `src/lib/eblocki/proof-scoring.ts` + DB trigger `cle_after_proof_insert` |
| Court of Evidence verdict | DB function `cle_court` + `court_verdicts` table |
| Level / XP engine | `src/lib/eblocki/level-engine.ts` + `xp_events`, `operator_level`, `domain_levels` |
| Identity ledger | `identity_ledger` table + `src/components/eblocki/IdentityLedger.tsx` |
| Momentum / states | `src/lib/eblocki/momentum.ts`, `src/lib/eblocki/states.ts` |
| GameForge | `src/lib/gameforge/*` + `src/components/gameforge/GameForgeShell.tsx` |
| Auth | `src/hooks/useAuth.tsx` |
| Supabase client | `src/integrations/supabase/client.ts` (do not re-create) |

## Conflict resolution priority

1. Build must pass.
2. Supabase schema must remain coherent with `types.ts`.
3. Prefer existing production module over a parallel re-implementation.
4. Preserve external work where it adds capability without breaking 1–3.

See also: `docs/AI_HANDOFF.md`, `docs/ARCHITECTURE_SNAPSHOT.md`, `docs/RELEASE_CHECKLIST.md`,
`docs/release/supabase-migration-checklist.md`.
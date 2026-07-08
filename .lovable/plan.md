## Root cause

- `src/lib/eblocki/system-forge.ts` (deterministic generator + verdict) and its tests already exist and pass.
- Migration file `supabase/migrations/20260707090000_system_forge_v0.sql` exists but the tables `public.custom_systems` and `public.system_reps` **do not exist in the database** (verified via read_query). The migration was authored but never applied, then `src/pages/Systems.tsx` was replaced with a "System Forge is being rebuilt" stub and `Systems.test.tsx` was reduced to assert the stub.
- Result: the generator is orphaned, no route uses it, and users see "being rebuilt".

Case B + Case C: page exists as placeholder, backing tables absent, page-level flow missing.

## Fix scope

Rebuild the `/systems` page around the existing generator, apply the missing migration with proper GRANTs, and wire a minimal end-to-end flow: create system → start first rep → submit proof → verdict + next upgrade. No new architecture, no AI, no Stripe, no dashboard redesign.

## Steps

**1. Migration (new file, additive)**
Re-run the System Forge v0 schema with the GRANTs it was missing (required by project doctrine). New migration file so history stays append-only:
- `CREATE TABLE IF NOT EXISTS public.custom_systems` (same shape as authored migration)
- `CREATE TABLE IF NOT EXISTS public.system_reps`
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` for both tables
- Enable RLS + owner-scoped policies (select/insert/update own; system_reps insert also verifies the system belongs to the user and proof_id, if present, belongs to the user)
- `updated_at` trigger on `custom_systems` using existing `public.set_updated_at()`
- Verdict CHECK covers the four `EvidenceStrength` values (`weak|moderate|strong|elite`) the generator returns.

Types file regenerates automatically after approval.

**2. Rebuild `src/pages/Systems.tsx`**
Replace the stub with the real page inside `AppShell`. Sections (mobile-first, single-column at 390px, `min-w-0` + `break-words` on generated strings):

1. Hero card — "System Forge / Build a proof-based training system for anything."
2. **Active system panel** (only if one exists): shows name, domain, active command, artifact type, minimum viable rep, latest rep result if any. Primary CTA: **Start First Rep**.
3. **Create system form** (visible when no active system, or via "Forge new system" toggle): domain, improvement_goal, desired_outcome, current_bottleneck, available_minutes_per_day. Submit → `generateSystemForgeDraft` → insert into `custom_systems` (marking any prior active row inactive first) → show generated system.
4. **First-rep card**: shows `activeCommand`, artifact type expectation, textarea for proof content, optional self-score (1–10). Submit → `evaluateSystemForgeRep` → insert into `system_reps` with verdict/weakness/next_upgrade. Show verdict card with `verdict`, `why`, `weakness`, `nextUpgrade`. Error copy on save failure: "Could not save proof. Nothing was claimed."
5. **Past reps list** (last 5 for active system), collapsed on mobile.

Advanced generated details (weekly structure, rubric, progression levels) live in a shadcn `Accordion` — collapsed on mobile.

Copy uses "Generated from your inputs." Never "AI generated." Buttons: **Forge My System**, **Start First Rep**, **Submit Proof**.

**3. Data access helper** — `src/lib/eblocki/system-forge-store.ts`
Small typed wrapper around Supabase for: `fetchActiveSystem(userId)`, `createSystem(userId, draft)`, `deactivatePriorSystems(userId)`, `submitRep(userId, systemId, evaluation, proofContent, selfScore)`, `listRecentReps(systemId, limit)`. Handles null/legacy rows and returns typed errors.

**4. Tests**
- Keep and extend existing `system-forge.test.ts` — already covers generator + verdict cases required by the brief.
- Replace stub `src/pages/__tests__/Systems.test.tsx` with a smoke test: with `supabase` mocked to return no active system, page renders hero, form; submitting form calls `generateSystemForgeDraft` and renders "Start First Rep".

**5. No dashboard change this pass** — a link/card can come next; the brief allows skipping to avoid regressions.

## Files

Created:
- `supabase/migrations/<ts>_system_forge_v0_apply.sql`
- `src/lib/eblocki/system-forge-store.ts`

Modified:
- `src/pages/Systems.tsx` (replace stub with full page)
- `src/pages/__tests__/Systems.test.tsx` (replace stub test)
- `src/integrations/supabase/types.ts` — regenerated automatically after migration approval

Untouched (verified safe):
- Proof, Coach, Dashboard, GameForge, auth, `supabase/client.ts`, mobile shell.

## Verification

- `bun run test` (expect 294 existing + updated Systems test to pass; extended generator tests already green)
- `bun run build`
- Manual: signed-in user at `/systems` on 390px: form → generated system → start rep → submit proof → verdict card. No horizontal overflow (checked via Playwright screenshot).

## Risks / not verified

- Migration approval is user-gated; if declined, page falls back to gracefully showing "Could not load systems" but doesn't fake success.
- Types file only refreshes after migration runs; component uses a local `SystemRow` interface until then to avoid a broken import.
- Browser Playwright pass will run only after code lands.

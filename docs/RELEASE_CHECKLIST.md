# Release Checklist — Eblocki

Run before publishing or merging external work.

## 1. Install & static checks
- [ ] `npm install` clean
- [ ] `npm run lint` — no **new** errors in touched files
- [ ] `npm run test` — all pass (`src/lib/eblocki/__tests__`, `src/test`)
- [ ] `npm run build` — succeeds
- [ ] `npm audit` — record high/critical count, do not `--force` fix

## 2. Supabase
- [ ] All new migrations in `supabase/migrations/` follow naming `<UTC timestamp>_<slug>.sql`
- [ ] Every new `public` table has `GRANT`s + `ENABLE ROW LEVEL SECURITY` + policies in the same migration
- [ ] `src/integrations/supabase/types.ts` regenerated (Lovable does this automatically post-migration)
- [ ] Edge function changes deployed (Lovable auto-deploys)
- [ ] Secrets present: `LOVABLE_API_KEY`, `FCM_SERVICE_ACCOUNT_JSON`, plus any new ones
- [ ] Linter clean: run `supabase--linter` tool / Cloud → Database → Linter

## 3. Smoke routes (signed in)
- [ ] `/` — landing renders
- [ ] `/auth` — sign in / sign up flow
- [ ] `/dashboard` — loads with **zero proofs** AND with prior data
- [ ] `/operator` — verdict feed + ledger
- [ ] `/proof` — submit a proof, confirm XP/verdict written
- [ ] `/gameforge` — start a demo pack, complete one question
- [ ] `/coach` — receives AI response
- [ ] `/settings` — preferences persist

## 4. Resilience
- [ ] New user (no rows) does not crash dashboard
- [ ] Proof insert failure shows error toast (no fake success)
- [ ] Mobile width (375px) renders without overflow

## 5. Publish
- [ ] Lovable preview reviewed
- [ ] Publish via Lovable
- [ ] Verify production URL: https://eblocki.lovable.app + custom domains
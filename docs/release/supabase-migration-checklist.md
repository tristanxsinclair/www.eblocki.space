# Supabase Migration Checklist

Use whenever a new file is added to `supabase/migrations/`.

## Naming
- Format: `YYYYMMDDHHMMSS_<slug>.sql` (UTC). Lovable-generated files use a UUID slug; manual files should use a kebab-case slug.
- Never edit a migration that has already been applied. Add a new one.

## Per-migration checklist
- [ ] Filename and order (lexicographic = apply order)
- [ ] Purpose documented in a top-of-file SQL comment
- [ ] Every new `public.<table>`:
  - [ ] `CREATE TABLE` with `id uuid primary key default gen_random_uuid()`, `user_id` FK (if user-owned), `created_at`/`updated_at`
  - [ ] `GRANT` block (authenticated + service_role; add anon only if a policy allows it)
  - [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - [ ] `CREATE POLICY` for each access path
  - [ ] Trigger for `updated_at` if mutable
- [ ] New columns are nullable or have a default (do not break existing rows)
- [ ] No `ALTER DATABASE postgres`
- [ ] No secrets / no service-role keys in SQL
- [ ] Roles stored in `user_roles` (never on `profiles`)
- [ ] Validation via TRIGGER, not CHECK constraint, when comparing against `now()`

## Post-application
- [ ] `src/integrations/supabase/types.ts` regenerated and committed by Lovable
- [ ] Code that writes to the table uses only valid columns/enums (grep for the table name)
- [ ] Supabase linter run (no new errors)
- [ ] Smoke test the affected route
- [ ] If table is realtime-published: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` is in the same migration

## Rollback
There is no automatic rollback. Write a follow-up migration. Avoid `DROP TABLE` on tables that already hold user data without an export step.

## Current migration inventory

See `supabase/migrations/` directory. Notable recent files:
- `20260520031109_email_infra.sql` — pgmq queues + email_send_log/state
- `20260520031545_*.sql`, `20260520031609_*.sql` — email infra follow-ups
- `20260516*` series — CLE (Compound Level Engine): proof_artifacts, xp_events, court_verdicts, identity_ledger, operator_level, domain_levels + `cle_*` functions + `cle_after_proof_insert` trigger
- `20260513_personalised_user_modes.sql` — per-user modes
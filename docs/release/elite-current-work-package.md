# Work Package WP-001 — Confine AI infra IDs in account export

- Governing control: **P0-CONFINE-AI-EXPORT** (Phase 0)
- Master-plan sections: Trust/Security/Reliability; 300-Control Register (infra confinement)

## Objective
Ensure ordinary users cannot retrieve AI infrastructure identifiers (OpenAI
model name, vector store ID) via the account-data export endpoint.

## User problem
The Settings UI hides `model` and `vector_store_id`, but a user requesting an
account export receives the raw `performance_os_config` row containing any
historical values written to those columns. This re-exposes the infrastructure
the confinement effort removed from the UI.

## Commercial / trust harm
- Breaks the "no infra visible to users" containment guarantee.
- Leaks server-side routing metadata that competitors or bad actors could
  enumerate; a stored `vs_...` ID is an operational identifier.

## Current behaviour
`GET export-data` returns `performance_os_config: [{ ..., model, vector_store_id, ... }]`.

## Expected behaviour
`performance_os_config` in the export archive omits `model` and
`vector_store_id` entirely. All other columns and tables are unchanged.

## Scope
- Edit `supabase/functions/export-data/index.ts` only.
- Redact the two fields at the edge-function boundary (defence in depth even
  if a future migration drops the columns).

## Non-scope
- No DB migration this turn (columns stay for backward compatibility).
- No changes to Coach, Settings UI, or Stripe surfaces.
- No new logging or analytics.

## Dependencies
None. Coach still routes via server env vars.

## Files touched
- `supabase/functions/export-data/index.ts`

## Data / schema implications
None. Pure read-side redaction.

## Security implications
Reduces PII+infra surface in exported archives. No auth changes.

## Mobile / a11y / analytics implications
None.

## Acceptance criteria
1. Running the export as an ordinary user produces JSON where
   `performance_os_config[*]` has no `model` and no `vector_store_id` keys.
2. All other exported fields remain byte-identical.
3. Function still returns 200 for authenticated users, 401 without auth.

## Verification
- Static: `rg -n 'vector_store_id|"model"' supabase/functions/export-data/`
  should only match the redaction destructure.
- Runtime: after deploy, `curl` the function with a test JWT and confirm the
  archive omits both keys.

## Rollback
Revert the single-file patch — no data written, no schema change.

## Evidence
Patch on `supabase/functions/export-data/index.ts` (this turn).

## Completion gate
When redeployed and one export archive has been inspected and confirmed
clean, mark P0-CONFINE-AI-EXPORT VERIFIED COMPLETE in the ledger and advance
to P0-CONFINE-AI-BUNDLE-SCAN.

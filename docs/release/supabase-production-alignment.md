# Supabase Production Alignment — Phase 7

## Migrations

No new migrations required for Phase 7 beta. Schema inspection results:

- `proof_artifacts` — fields used by `Proof.tsx` (`artifact_type`, `attachment_*`, `pressure_flag`, `transfer_flag`, `temporal_snapshot`, `proof_tier`) already exist.
- `interest_signals` — `signal_type` is free text. Reused values: `proof_week_join`, `verdict_feedback`.
- `court_verdicts`, `identity_ledger`, `xp_events` — written server-side by the `cle_after_proof_insert` trigger. No client changes.

If any future field is added, follow `docs/release/supabase-migration-checklist.md`: additive only, nullable defaults, GRANT to the roles actually used.

## Edge functions

`coach` function — NOT deployed by this pass.

Deploy command (run from repo root with the production project linked):

```bash
supabase functions deploy coach
```

Required Supabase secrets (already configured; do not log values): `LOVABLE_API_KEY`, plus any provider-specific keys the current `supabase/functions/coach/index.ts` reads.

## Smoke prompt A

Prompt:

```text
Eblocki Proof Plan: BLAW1003 + LAWS1004 Mastery
```

Expected:
- `route intent: academic_proof_plan`
- `mode: academic_operating_system`
- recommended artifact: `source-bank entries`
- proof standard: `law_source_bank_standard` or `academic_proof_plan_standard` (source-bank-first)
- proof contract requires source-bank entries
- no premature IRAC requirement

## Smoke prompt B

Prompt:

```text
Review this Eblocki coach output. It routed an academic proof plan as law reasoning and created mismatched proof contracts.
```

Expected:
- `route intent: product_system_review`
- standard: `product_system_review_standard`
- missing standard asks for: implementation evidence, measurable test, route acceptance criterion, UI/behaviour proof
- identity escalation: blocked until implementation or external test evidence exists
- must not show law-answer criteria (jurisdiction, text-context-purpose, AGLC4, binding/persuasive)

## Rollback

If a post-deploy smoke test fails:

1. Redeploy the previous `coach` function from the last known good commit.
2. Record: failing prompt, response, timestamp, rollback commit hash.
3. Open a release note pointing at this file.

## Production verification

Record before claiming the function is deployed:

- Deploy command output + timestamp.
- Smoke prompt A response.
- Smoke prompt B response.
- Signed-in user can submit a proof artifact end-to-end against the deployed function.

Do not mark the gate PASS without all four.
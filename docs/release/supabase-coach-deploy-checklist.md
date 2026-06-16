# Supabase Coach Function Deploy Checklist

Function name: `coach`

Deployment status: not deployed by this checklist. Do not mark deployed until the Supabase CLI command succeeds against the production project.

## Expected changed behaviour

- BLAW1003 + LAWS1004 mastery prompts route to `academic_proof_plan` / `academic_operating_system`.
- The immediate proof artifact is source-bank entries, not a premature IRAC paragraph.
- Product-system reviews route to `product_system_review`.
- Product-system review verdict standards ask for implementation/test evidence, not statutory interpretation criteria.
- Proof Action and Proof Contract require the same artifact type.

## Deploy command placeholder

```bash
supabase functions deploy coach
```

Run from the repository root with the correct Supabase project linked and authenticated.

## Smoke test prompt 1

Prompt:

```text
Eblocki Proof Plan: BLAW1003 + LAWS1004 Mastery
```

Expected output:

- route intent: `academic_proof_plan`
- mode: `academic_operating_system`
- recommended artifact: `source_bank_entries`
- proof standard: `law_source_bank_standard` or `academic_proof_plan_standard` with a source-bank first task
- proof contract: one contract requiring source-bank entries
- must not require an IRAC paragraph before authority/source-bank work exists

## Smoke test prompt 2

Prompt:

```text
Review this Eblocki coach output. It routed an academic proof plan as law reasoning and created mismatched proof contracts.
```

Expected output:

- route intent: `product_system_review`
- standard: `product_system_review_standard`
- missing standard: implementation evidence, measurable test, route acceptance criterion, UI or behaviour proof
- identity escalation: blocked until implementation or external test evidence exists
- must not show law-answer criteria such as jurisdiction, text-context-purpose, AGLC4, or binding/persuasive source standards

## Post-deploy proof required

Record the function deployment command output, timestamp, and the two smoke-test responses before claiming production behaviour changed.

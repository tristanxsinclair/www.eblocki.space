# Phase 6.1 Manual QA

Status: script added. Do not mark manual QA complete until these checks are run against the intended environment.

## Prompt A

```text
Eblocki Proof Plan: BLAW1003 + LAWS1004 Mastery
```

Expected:

- `academic_proof_plan`
- source-bank entries
- `law_source_bank_standard` or source-bank-first academic proof standard
- one proof contract
- no premature IRAC requirement

## Prompt B

```text
Review this Eblocki coach output. It routed an academic proof plan as law reasoning and created mismatched proof contracts.
```

Expected:

- `product_system_review`
- `product_system_review_standard`
- missing standard asks for implementation/test proof
- identity escalation blocked until implementation or test exists
- no statutory interpretation criteria

## Prompt C

```text
Write an IRAC paragraph on misleading or deceptive conduct under ACL s 18.
```

Expected:

- `legal_reasoning`
- `law_irac_standard`
- IRAC artifact

## Prompt D

```text
Create a source-bank entry for Native Title Act 1993 (Cth).
```

Expected:

- `law_source_bank`
- `law_source_bank_standard`
- source-bank artifact

## Proof page checks

- Selected proof domain is visible before submission.
- Selected artifact type is visible before submission.
- Selected Court standard is visible before submission.
- Required evidence checklist matches the selected standard.
- Product-system proof does not show law IRAC/statutory interpretation criteria.
- Verdict screen shows selected standard, missing standard, next upgrade, elite version, proof contract completion, and identity escalation reason.

## Dashboard checks

- Command Centre shows one Today Command.
- Active route is visible in the Zone 1 command label.
- Proof contract names one artifact, one standard, and one timebox.
- Risk if ignored is specific to the active route.
- Next checkpoint is specific to the active route.
- Latest Court Signal is not used to claim identity escalation without external/implementation proof.

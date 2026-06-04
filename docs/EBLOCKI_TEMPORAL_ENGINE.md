# Eblocki Temporal Intelligence Engine

## What it is
A deterministic behavioural trajectory projector. Calculates four possible
futures (current / corrected / decay / escalation) across 24h, 7d, 30d, 90d,
and 1y horizons from observed proof artifacts, court verdicts, identity
ledger entries, and active domains.

## What it predicts
- Future Power Score (0–100) — projected behavioural capacity.
- Drift / shallow / overload / neglect risk vectors.
- Identity escalation chance.
- Domain-level neglect.
- The single proof artifact that bends the corrected path upward.

## What it refuses to claim
- No guarantees. No destiny language.
- No identity escalation without `accepted_strong`/`elite`/`transfer` evidence.
- No future change without a new artifact. **No proof, no future change.**

## Data inputs
- `proof_artifacts` (quality, evidence_strength, transfer/pressure flags, tier, domain, created_at)
- `court_verdicts` (verdict, created_at)
- `identity_ledger` (kind, domain, created_at)
- `user_modes` (active domains)
- `daily_control_sheets.state` (latest)

All extractors are null-safe. Legacy rows missing metadata never throw.

## Uncertainty
`confidence = dataVolume + recentConsistency + signalClarity − missingDataPenalty − legacyPenalty`,
normalised to [0,1] and bucketed `low | moderate | high`. The visual renders
an explicit uncertainty band around the corrected path.

## Proof changes trajectory
The engine emits a single `FutureIntervention { command, blocked, timebox,
artifactRequired }`. Producing that artifact within the timebox is the only
input that shifts the corrected path's vector. Planning does not count.

## Visualisation
`src/components/eblocki/TemporalMap.tsx` — pure SVG, semantic Tailwind
tokens, no charting library. Upper half = growth, lower half = risk.
Solid line = corrected path; dashed = current / escalation / decay.

## Coach context
`src/lib/eblocki/temporal-coach-context.ts` prepares an AI-ready payload
(`primaryPath`, four vectors, `proofRequired`, `forbiddenClaims`,
`uncertaintyWarning`). The engine itself **never calls an AI provider**.
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

## Model versioning
Every `TemporalResult`, snapshot, calibration, and coach context carries
`TEMPORAL_MODEL_VERSION` (currently `temporal-v1.1-calibrated`). Forecasts
remain auditable when weights change.

## Snapshot persistence
`proof_artifacts.temporal_snapshot` (jsonb, nullable) holds the
`TemporalForecastSnapshot` that was active when an artifact was submitted.
Long text is stripped. Snapshot failure never blocks proof submission.

## Calibration engine
See `src/lib/eblocki/temporal-calibration.ts` and
`docs/EBLOCKI_TEMPORAL_CALIBRATION.md`. Compares forecast vs reality and
returns an advisory `TemporalCalibrationResult`.

## Reality check logic
`runTemporalRealityCheck(snapshot, outcome)` returns
`accurate | partially_accurate | inaccurate | insufficient_data`, signal
strength, and the next observation target.

## Confidence explainability
`TemporalConfidence` now includes `reasons`, `dataVolumeSignal`,
`signalClaritySignal`, `missingDataPenalty`, `legacyRowPenalty`, and an
`uncertaintyWarning`. Low data → low confidence, always.

## Intervention memory
`src/lib/eblocki/intervention-memory.ts` aggregates calibration history to
identify the most reliable intervention archetype.

## Temporal Intelligence Score
`src/lib/eblocki/temporal-intelligence-score.ts` produces a 0–100 system
calibration score with level: `dormant | forming | learning | sharp |
highly_calibrated`. It measures how much the system knows about the user,
not the user's intelligence.

## What the model learns
- Which intervention archetypes drive proof improvements.
- Whether confidence was appropriate per forecast.
- Which risks systematically over- or under-predicted.
- The neglected domain that erodes domain coverage.

## What the model refuses to claim
- Guaranteed outcomes.
- Destiny language.
- Identity escalation without `accepted_strong`/`elite`/`transfer` evidence.
- Praise without proof.
- High confidence under low data.

## Future tuning
Bump `TEMPORAL_MODEL_VERSION` whenever weights or thresholds change so old
snapshots remain comparable but clearly versioned.
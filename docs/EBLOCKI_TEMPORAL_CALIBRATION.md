# Eblocki Temporal Calibration

## What this is
A deterministic, advisory reality-feedback layer for the Temporal Engine.
Forecasts (`TemporalForecastSnapshot`) are stored on the proof artifact that
triggered them. Later evidence is compared against the snapshot to produce a
`TemporalCalibrationResult`.

## How forecasts are generated
Every accepted proof submission produces a `TemporalResult` via
`computeTemporal(...)` and a coarse `TemporalForecastSnapshot` via
`buildTemporalSnapshot(result)`. The snapshot is written to
`proof_artifacts.temporal_snapshot` (jsonb, additive migration).

## What the snapshot stores
Only coarse, privacy-safe fields: `modelVersion`, `generatedAt`,
`predictionId`, `primaryPath`, `recommendedPath`, `confidenceScore`,
`confidenceLevel`, `mainRisk`, `mainRiskScore`, `mainOpportunity`,
`proofRequired` (truncated), `artifactRequired`, `domain`, `horizonScores`,
`evidenceCount`, `trajectoryScores`. **Never** long proof descriptions,
secrets, or personal free text.

## How outcomes are compared
`calibrateForecast(snapshot, outcome)` and `runTemporalRealityCheck(...)`
compare the required artifact, target domain, verdicts, and quality of
evidence produced after the snapshot timestamp.

## What accuracy means
`accuracyScore ∈ [0, 100]` is derived from `realityCheck.verdict` plus
whether the predicted risk occurred and whether proof quality rose. It is
a calibration signal, not a guarantee.

## Why weights are advisory only
`suggestedWeightAdjustments` are returned for human/system inspection. The
kernel never self-modifies its weights. Tuning happens via deliberate code
changes with a new `TEMPORAL_MODEL_VERSION`.

## How to interpret low confidence
Low confidence almost always means insufficient data — submit proof. The
system refuses to escalate identity or claim certainty until evidence
exists.

## How to debug predictions
1. Read the snapshot on the relevant artifact.
2. Re-run `computeTemporal` with the same inputs at `generatedAt`.
3. Run `calibrateForecast` against later evidence.
4. Inspect `realityCheck` + `suggestedWeightAdjustments`.

## Data that must never be stored
- Long content fields.
- Attachments or OCR text.
- Coach transcripts.
- API keys / secrets.
# Eblocki Temporal Calibration

## What This Is
A deterministic, advisory reality-feedback layer for the Temporal Engine. Forecast snapshots are stored on proof artifacts, then compared against later proof evidence. The result is a `TemporalCalibrationResult`, not a guarantee.

## Operational Loop
The production loop is:
forecast → snapshot → later proof → calibration → reality check → intervention memory → intelligence score → next command.

The loop is considered operational only when all links can run on real evidence without fake certainty.

## Snapshot Boundary
Use `src/lib/eblocki/temporal-snapshot.ts` for all snapshot reads and writes.

Rules:
- `modelVersion` is required.
- `generatedAt` is required.
- path names normalise to `current_path | corrected_path | decay_path | escalation_path`.
- confidence normalises to `low | moderate | high`.
- null/legacy rows do not crash.
- output must be JSONB-safe.
- raw proof text, notes, OCR, attachments, coach transcripts, and secrets are excluded.

## Writing Snapshots
`Proof.tsx` files proof first. Snapshot persistence is secondary and best-effort. If the proof insert fails, no success is claimed. If the snapshot update fails, the proof remains filed and the UI does not pretend calibration happened.

Use:
- `buildTemporalSnapshotPayload(result)`
- `stripSensitiveTemporalSnapshotFields(payload)`

## Reading Snapshots
Dashboard, feedback, intelligence, and audit code must read snapshots through:
- `normaliseTemporalSnapshot(row.temporal_snapshot)`
- `getTemporalSnapshotSummary(row.temporal_snapshot)`

Do not cast `temporal_snapshot` directly in page/component code.

## Calibration History
`src/lib/eblocki/temporal-calibration-history.ts` exposes `buildTemporalCalibrationHistory(proofs, verdicts)`.

It returns:
- `totalForecasts`
- `calibratedForecasts`
- `averageAccuracy`
- `bestForecast`
- `weakestForecast`
- `mostCommonRisk`
- `mostReliablePath`
- `confidenceTrend`
- `summary`

TemporalIntelligencePanel uses this to distinguish real calibrated history from a forming signal.

## Loop Audit
`src/lib/eblocki/temporal-loop-audit.ts` checks whether the system can:
1. Generate a Temporal forecast.
2. Build a snapshot.
3. Confirm snapshot privacy safety.
4. Read snapshot rows.
5. Compare later proof against a snapshot.
6. Classify calibration outcome.
7. Run a reality check.
8. Build intervention memory.
9. Calculate Temporal Intelligence Score.
10. Show dashboard empty states.

Statuses:
- `inactive`: waiting for proof evidence.
- `partial`: forecast exists but needs later proof/calibration.
- `operational`: comparing prediction against reality.
- `degraded`: invalid or legacy snapshot data detected.

## Model Audit UI
`TemporalModelAuditPanel` is compact and secondary. It shows model version, loop status, snapshot status, calibration status, confidence, data quality, next fix, and developer-safe detail on demand.

It must never claim sentience, certainty, or guaranteed prediction.

## Privacy-Safe Analytics
Only safe metadata is logged:
- `temporal_snapshot_created`
- `temporal_loop_audit_status`
- `temporal_calibration_completed`
- `dashboard_section_opened`

Allowed properties include model version, confidence level, loop status, risk kind, recommended path, accuracy bucket, intelligence level, and section name. Never send proof descriptions, notes, full snapshots, raw JSON, or secrets.

## Debugging Predictions
1. Confirm proof insert succeeded.
2. Confirm `temporal_snapshot` exists on the proof row.
3. Run `getTemporalSnapshotSummary()`.
4. If degraded, inspect whether the row is legacy or malformed.
5. Confirm later proof exists after `created_at` of the snapshot artifact.
6. Run `calibrateForecast(snapshot, outcome)`.
7. Check `realityCheck.verdict` and `nextObservationTarget`.
8. Check intervention memory and intelligence score.

## Advisory Weights Only
`suggestedWeightAdjustments` are diagnostics. The model never self-modifies. Weight changes require deliberate code changes and a model version bump.

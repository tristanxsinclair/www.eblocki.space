# Eblocki Temporal Intelligence Engine

## What It Is
A deterministic behavioural trajectory projector. It calculates four possible futures (`current_path`, `corrected_path`, `decay_path`, `escalation_path`) across 24h, 7d, 30d, 90d, and 1y horizons from observed proof artifacts, court verdicts, identity ledger entries, active domains, and latest behavioural state.

It is not fortune-telling. It is an evidence-weighted operating signal.

## Product Law
- No proof, no future change.
- No identity escalation without `accepted_strong`, `elite`, or transfer evidence.
- No guarantees, destiny language, or fake certainty.
- Every command must require an artifact.
- Low evidence always means low confidence.

## Core Files
- `src/lib/eblocki/temporal-engine.ts` — deterministic forecast model.
- `src/lib/eblocki/temporal-snapshot.ts` — type-safe JSONB snapshot boundary.
- `src/lib/eblocki/temporal-calibration.ts` — forecast vs later proof comparison.
- `src/lib/eblocki/temporal-calibration-history.ts` — aggregate calibration history summary.
- `src/lib/eblocki/temporal-loop-audit.ts` — operational audit of the full loop.
- `src/lib/eblocki/intervention-memory.ts` — intervention effectiveness memory.
- `src/lib/eblocki/temporal-intelligence-score.ts` — system calibration score.
- `src/components/eblocki/TemporalModelAuditPanel.tsx` — compact model status UI.

## Snapshot Type-Safety Rule
All `proof_artifacts.temporal_snapshot` reads and writes must pass through `src/lib/eblocki/temporal-snapshot.ts`.

The helper exports:
- `TEMPORAL_SNAPSHOT_VERSION`
- `TemporalSnapshotPayload`
- `TemporalSnapshotPathName`
- `TemporalSnapshotConfidenceLevel`
- `isTemporalSnapshotPayload()`
- `normaliseTemporalSnapshot()`
- `buildTemporalSnapshotPayload()`
- `stripSensitiveTemporalSnapshotFields()`
- `getTemporalSnapshotSummary()`

Do not scatter casts around dashboard/proof code. Generated Supabase types already expose `temporal_snapshot: Json | null`; runtime validation protects old or malformed rows.

## Privacy-Safe Snapshot Fields
Snapshots store only coarse operational fields:
`modelVersion`, `generatedAt`, `predictionId`, paths, confidence, risk kind, required artifact, domain, horizon scores, evidence count, and trajectory scores.

Snapshots must never store:
- long proof content
- personal notes or reflections
- raw proof descriptions
- OCR text or attachment content
- coach transcripts
- secrets, tokens, or keys

## Loop Audit
`auditTemporalLoop()` answers whether the Temporal loop is actually working.

Statuses:
- `inactive` — waiting for proof evidence.
- `partial` — forecast/snapshot exists but later proof or calibration is missing.
- `operational` — comparing prediction against later proof and producing calibration signals.
- `degraded` — invalid, legacy, or missing snapshot data was detected.

The audit checks forecast generation, snapshot build/read/privacy, later proof comparison, calibration, reality check, intervention memory, intelligence score, and dashboard empty states.

## Dashboard Hierarchy
The dashboard now uses progressive disclosure:
- Zone 1: `Command` — one hero command, proof required, highest risk.
- Zone 2: `Forecast` — TemporalMap, calibration, intelligence, audit panel behind tabs.
- Zone 3: `Evidence` — proof/court/identity summaries, weekly detail collapsed by default.

This keeps the command centre readable while preserving the intelligence systems.

## Debugging Temporal Loop Issues
1. Open the Model Audit panel on `/dashboard`.
2. Check `status`, `missingPieces`, and `nextFix`.
3. Inspect the latest `proof_artifacts.temporal_snapshot` shape.
4. Pass the row through `normaliseTemporalSnapshot()` before calibration.
5. Confirm later proof exists after the snapshot timestamp.
6. Run `calibrateForecast(snapshot, outcome)`.
7. Review `TemporalFeedbackPanel` and `TemporalIntelligencePanel` history summary.

## What Counts As Operational
The loop is operational only when:
forecast → privacy-safe snapshot → later proof → calibration → reality check → intervention memory → intelligence score → next command all execute without fake certainty.

## Model Versioning
Every forecast and snapshot carries `TEMPORAL_MODEL_VERSION` plus `TEMPORAL_SNAPSHOT_VERSION`. Bump the model version when behavioural weights or thresholds change so old forecasts remain auditable.

-- Safe additive migration for Expected vs Actual judgment feedback
-- Adds nullable columns only. No destructive changes.

alter table public.proof_artifacts
  add column if not exists expected_strength text null,
  add column if not exists calibration_result text null;
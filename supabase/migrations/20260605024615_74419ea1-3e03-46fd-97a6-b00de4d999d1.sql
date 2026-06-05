ALTER TABLE public.proof_artifacts
  ADD COLUMN IF NOT EXISTS temporal_snapshot jsonb;
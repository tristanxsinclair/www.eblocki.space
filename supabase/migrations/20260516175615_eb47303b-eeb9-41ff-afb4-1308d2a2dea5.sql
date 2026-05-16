ALTER TABLE public.daily_objectives
  ADD COLUMN IF NOT EXISTS completion_proof_text text,
  ADD COLUMN IF NOT EXISTS completion_hard_part text,
  ADD COLUMN IF NOT EXISTS completion_upgrade text;
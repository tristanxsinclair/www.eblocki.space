-- WP0 production truth gate: one authoritative XP settlement per proof.
-- Non-proof XP events remain permitted because NULL values are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS xp_events_one_settlement_per_proof
  ON public.xp_events (proof_id)
  WHERE proof_id IS NOT NULL;

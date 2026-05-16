-- Momentum state: daily snapshot of behavioural momentum per user
CREATE TABLE public.momentum_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  state_date DATE NOT NULL DEFAULT CURRENT_DATE,
  momentum_score INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  freeze_tokens INTEGER NOT NULL DEFAULT 0,
  freeze_tokens_earned_total INTEGER NOT NULL DEFAULT 0,
  freeze_tokens_used_total INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'cold',
  identity_signal TEXT,
  last_proof_at TIMESTAMPTZ,
  proofs_today INTEGER NOT NULL DEFAULT 0,
  resistance_overcome INTEGER NOT NULL DEFAULT 0,
  avg_quality NUMERIC(4,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT momentum_state_user_date_unique UNIQUE (user_id, state_date),
  CONSTRAINT momentum_state_state_chk CHECK (state IN ('cold','warming','momentum','at_risk','recovery','elite')),
  CONSTRAINT momentum_state_score_chk CHECK (momentum_score BETWEEN 0 AND 100)
);

ALTER TABLE public.momentum_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "momentum own"
ON public.momentum_state
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_momentum_user_date ON public.momentum_state (user_id, state_date DESC);

CREATE TRIGGER momentum_state_set_updated_at
BEFORE UPDATE ON public.momentum_state
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily objectives: adaptive missions
CREATE TABLE public.daily_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  objective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  mode_id TEXT,
  kind TEXT NOT NULL DEFAULT 'mission',
  resistance_level INTEGER NOT NULL DEFAULT 3,
  focus_minutes INTEGER NOT NULL DEFAULT 25,
  reward_value INTEGER NOT NULL DEFAULT 10,
  streak_impact INTEGER NOT NULL DEFAULT 1,
  identity_alignment INTEGER NOT NULL DEFAULT 3,
  proof_required BOOLEAN NOT NULL DEFAULT true,
  why_it_matters TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  proof_artifact_id UUID,
  proof_commitment_id UUID,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_objectives_kind_chk CHECK (kind IN ('mission','streak_save','recovery','boss','quick_win')),
  CONSTRAINT daily_objectives_status_chk CHECK (status IN ('pending','active','completed','skipped','failed')),
  CONSTRAINT daily_objectives_resistance_chk CHECK (resistance_level BETWEEN 1 AND 5),
  CONSTRAINT daily_objectives_identity_chk CHECK (identity_alignment BETWEEN 1 AND 5)
);

ALTER TABLE public.daily_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objectives own"
ON public.daily_objectives
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_objectives_user_date ON public.daily_objectives (user_id, objective_date DESC, position);
CREATE INDEX idx_objectives_status ON public.daily_objectives (user_id, status, objective_date DESC);

CREATE TRIGGER daily_objectives_set_updated_at
BEFORE UPDATE ON public.daily_objectives
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
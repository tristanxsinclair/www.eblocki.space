
-- ============ Schema extensions ============

ALTER TABLE public.proof_artifacts
  ADD COLUMN IF NOT EXISTS proof_tier smallint,
  ADD COLUMN IF NOT EXISTS pressure_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_hash
  ON public.proof_artifacts(user_id, content_hash, created_at DESC);

-- ============ New tables ============

CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  proof_id uuid,
  domain text NOT NULL,
  tier smallint NOT NULL,
  quality smallint NOT NULL,
  base_xp integer NOT NULL,
  quality_mult numeric NOT NULL DEFAULT 1,
  streak_mult numeric NOT NULL DEFAULT 1,
  pressure_mult numeric NOT NULL DEFAULT 1,
  transfer_mult numeric NOT NULL DEFAULT 1,
  diminishing_mult numeric NOT NULL DEFAULT 1,
  final_xp integer NOT NULL,
  verdict text NOT NULL,
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_time ON public.xp_events(user_id, created_at DESC);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events select own" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.domain_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp_in_level integer NOT NULL DEFAULT 0,
  rank text NOT NULL DEFAULT 'Initiate',
  current_standard text,
  next_requirement text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);
ALTER TABLE public.domain_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "domain_levels select own" ON public.domain_levels FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.operator_level (
  user_id uuid PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp_in_level integer NOT NULL DEFAULT 0,
  rank text NOT NULL DEFAULT 'Initiate',
  title text NOT NULL DEFAULT 'Emerging Operator',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operator_level ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operator_level select own" ON public.operator_level FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.identity_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  proof_id uuid,
  domain text NOT NULL,
  kind text NOT NULL, -- compound | escalation | rejection
  summary text NOT NULL,
  verdict text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user_time ON public.identity_ledger(user_id, created_at DESC);
ALTER TABLE public.identity_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger select own" ON public.identity_ledger FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.court_verdicts (
  proof_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  verdict text NOT NULL,
  reasoning text,
  observer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.court_verdicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verdicts select own" ON public.court_verdicts FOR SELECT USING (auth.uid() = user_id);

-- ============ Pure helper functions ============

-- Map free-form domain → canonical 7
CREATE OR REPLACE FUNCTION public.cle_canon_domain(d text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE lower(coalesce(d,'general'))
    WHEN 'law' THEN 'law'
    WHEN 'psychology' THEN 'psychology'
    WHEN 'sales' THEN 'sales'
    WHEN 'sport' THEN 'soccer'
    WHEN 'soccer' THEN 'soccer'
    WHEN 'finance' THEN 'finance'
    WHEN 'career_money' THEN 'finance'
    WHEN 'career' THEN 'finance'
    WHEN 'eblocki' THEN 'eblocki'
    WHEN 'brand' THEN 'life'
    WHEN 'discipline' THEN 'life'
    WHEN 'life' THEN 'life'
    ELSE 'life'
  END
$$;

-- Exponential level threshold
CREATE OR REPLACE FUNCTION public.cle_level_threshold(lvl integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(100, floor(100 * power(1.55, GREATEST(lvl,1) - 1))::int)
$$;

-- Rank for level
CREATE OR REPLACE FUNCTION public.cle_rank_for(lvl integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lvl <= 5  THEN 'Initiate'
    WHEN lvl <= 10 THEN 'Structured Operator'
    WHEN lvl <= 20 THEN 'Compound Builder'
    WHEN lvl <= 35 THEN 'Tactical Performer'
    WHEN lvl <= 50 THEN 'Identity Architect'
    WHEN lvl <= 75 THEN 'Elite Operator'
    ELSE 'System Sovereign'
  END
$$;

CREATE OR REPLACE FUNCTION public.cle_operator_title(lvl integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lvl <= 2  THEN 'Emerging Operator'
    WHEN lvl <= 5  THEN 'Structured Operator'
    WHEN lvl <= 10 THEN 'Compound Operator'
    WHEN lvl <= 20 THEN 'Tactical Operator'
    WHEN lvl <= 35 THEN 'Identity Operator'
    WHEN lvl <= 50 THEN 'Elite Operator'
    ELSE 'Sovereign Operator'
  END
$$;

-- Base XP per tier (midpoint of band)
CREATE OR REPLACE FUNCTION public.cle_base_xp(tier integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE tier
    WHEN 1 THEN 3
    WHEN 2 THEN 10
    WHEN 3 THEN 25
    WHEN 4 THEN 55
    WHEN 5 THEN 110
    WHEN 6 THEN 300
    ELSE 1
  END
$$;

-- Streak multiplier
CREATE OR REPLACE FUNCTION public.cle_streak_mult(streak integer)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN streak >= 90 THEN 2.2
    WHEN streak >= 30 THEN 1.6
    WHEN streak >= 14 THEN 1.3
    WHEN streak >= 7  THEN 1.15
    WHEN streak >= 3  THEN 1.05
    ELSE 1.0
  END
$$;

-- Heuristic tier classification
CREATE OR REPLACE FUNCTION public.cle_classify_tier(
  content text, evidence text, transfer boolean, pressure boolean, quality integer
) RETURNS smallint LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  len int := length(coalesce(content,''));
BEGIN
  IF transfer AND quality >= 4 THEN RETURN 5; END IF;
  IF evidence = 'elite' AND quality = 5 AND len >= 400 THEN RETURN 6; END IF;
  IF pressure AND quality >= 3 THEN RETURN 4; END IF;
  IF (evidence IN ('strong','elite')) OR (quality >= 4 AND len >= 250) THEN RETURN 3; END IF;
  IF len >= 80 OR evidence = 'moderate' THEN RETURN 2; END IF;
  RETURN 1;
END $$;

-- Court verdict from tier + quality + duplicate
CREATE OR REPLACE FUNCTION public.cle_court(
  tier integer, quality integer, is_duplicate boolean, vague boolean
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN is_duplicate THEN 'rejected'
    WHEN vague AND quality < 3 THEN 'rejected'
    WHEN quality <= 1 THEN 'rejected'
    WHEN quality = 2 THEN 'accepted_minimum'
    WHEN tier >= 5 AND quality >= 4 THEN 'elite'
    WHEN tier >= 3 AND quality >= 4 THEN 'accepted_strong'
    WHEN quality = 3 THEN 'accepted_useful'
    WHEN quality >= 4 THEN 'accepted_strong'
    ELSE 'accepted_minimum'
  END
$$;

-- Verdict multiplier
CREATE OR REPLACE FUNCTION public.cle_verdict_mult(v text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE v
    WHEN 'rejected' THEN 0
    WHEN 'accepted_minimum' THEN 0.5
    WHEN 'accepted_useful' THEN 1.0
    WHEN 'accepted_strong' THEN 1.25
    WHEN 'elite' THEN 1.6
    ELSE 0
  END
$$;

-- ============ Main trigger ============

CREATE OR REPLACE FUNCTION public.cle_after_proof_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_domain text;
  v_tier smallint;
  v_quality int;
  v_streak int := 0;
  v_dup boolean := false;
  v_vague boolean := false;
  v_verdict text;
  v_base int;
  v_qmult numeric;
  v_smult numeric;
  v_pmult numeric;
  v_tmult numeric;
  v_dmult numeric := 1.0;
  v_final int;
  v_today_count int;
  v_hash text;
  v_dom_row public.domain_levels%ROWTYPE;
  v_op_row public.operator_level%ROWTYPE;
  v_new_xp int;
  v_threshold int;
  v_levels_gained int := 0;
  v_old_level int;
  v_reasoning text;
BEGIN
  v_domain := public.cle_canon_domain(NEW.domain);
  v_quality := COALESCE(NEW.quality_score, 1);

  -- content hash for dup detection
  v_hash := COALESCE(NEW.content_hash, md5(lower(coalesce(NEW.content,'') || '|' || coalesce(NEW.title,''))));
  NEW.content_hash := v_hash;

  -- duplicate within 7 days?
  SELECT EXISTS (
    SELECT 1 FROM public.proof_artifacts
    WHERE user_id = NEW.user_id
      AND content_hash = v_hash
      AND id <> NEW.id
      AND created_at > now() - interval '7 days'
  ) INTO v_dup;

  -- vague check
  v_vague := length(coalesce(NEW.content,'')) < 40;

  -- classify
  v_tier := public.cle_classify_tier(NEW.content, NEW.evidence_strength, NEW.transfer_flag, NEW.pressure_flag, v_quality);
  NEW.proof_tier := v_tier;

  -- court
  v_verdict := public.cle_court(v_tier, v_quality, v_dup, v_vague);
  v_reasoning := CASE
    WHEN v_dup THEN 'Duplicate of prior artifact within 7 days.'
    WHEN v_vague AND v_quality < 3 THEN 'Vague output, insufficient evidence.'
    WHEN v_verdict = 'rejected' THEN 'Quality below acceptance threshold.'
    WHEN v_verdict = 'elite' THEN 'Elite evidence accepted by the Court.'
    WHEN v_verdict = 'accepted_strong' THEN 'Strong evidence raises standard.'
    WHEN v_verdict = 'accepted_useful' THEN 'Useful evidence recorded.'
    ELSE 'Minimum acceptable evidence.'
  END;

  -- multipliers
  v_qmult := GREATEST(0.2, v_quality::numeric / 3.0);
  -- streak from momentum_state
  SELECT COALESCE(streak_days,0) INTO v_streak FROM public.momentum_state
    WHERE user_id = NEW.user_id ORDER BY state_date DESC LIMIT 1;
  v_smult := public.cle_streak_mult(v_streak);
  v_pmult := CASE WHEN NEW.pressure_flag THEN 1.3 ELSE 1.0 END;
  v_tmult := CASE WHEN NEW.transfer_flag THEN 1.4 ELSE 1.0 END;

  -- diminishing returns: >5 proofs/day same domain
  SELECT count(*) INTO v_today_count FROM public.proof_artifacts
    WHERE user_id = NEW.user_id
      AND public.cle_canon_domain(domain) = v_domain
      AND created_at::date = now()::date
      AND id <> NEW.id;
  IF v_today_count >= 8 THEN v_dmult := 0.25;
  ELSIF v_today_count >= 5 THEN v_dmult := 0.5;
  END IF;

  v_base := public.cle_base_xp(v_tier);
  v_final := floor(
    v_base * v_qmult * v_smult * v_pmult * v_tmult * v_dmult
            * public.cle_verdict_mult(v_verdict)
  )::int;
  IF v_verdict = 'rejected' THEN v_final := 0; END IF;

  -- write xp event
  INSERT INTO public.xp_events(
    user_id, proof_id, domain, tier, quality, base_xp,
    quality_mult, streak_mult, pressure_mult, transfer_mult, diminishing_mult,
    final_xp, verdict, reasoning
  ) VALUES (
    NEW.user_id, NEW.id, v_domain, v_tier, v_quality, v_base,
    v_qmult, v_smult, v_pmult, v_tmult, v_dmult,
    v_final, v_verdict, v_reasoning
  );

  -- write verdict
  INSERT INTO public.court_verdicts(proof_id, user_id, verdict, reasoning, observer)
  VALUES (NEW.id, NEW.user_id, v_verdict, v_reasoning,
    CASE v_domain WHEN 'law' THEN 'Law Marker' WHEN 'psychology' THEN 'Psychology Tutor'
      WHEN 'sales' THEN 'Sales Manager' WHEN 'soccer' THEN 'Coach'
      WHEN 'finance' THEN 'Life Operator' WHEN 'eblocki' THEN 'Product User'
      ELSE 'Future Self' END)
  ON CONFLICT (proof_id) DO NOTHING;

  -- ledger
  INSERT INTO public.identity_ledger(user_id, proof_id, domain, kind, summary, verdict)
  VALUES (NEW.user_id, NEW.id, v_domain,
    CASE WHEN v_verdict = 'rejected' THEN 'rejection'
         WHEN v_verdict IN ('elite','accepted_strong') THEN 'escalation'
         ELSE 'compound' END,
    CASE WHEN v_verdict = 'rejected'
         THEN format('Rejected — %s. %s', v_domain, v_reasoning)
         ELSE format('%s — tier %s, %s proof accepted (+%s XP).', upper(v_domain), v_tier, v_verdict, v_final)
    END,
    v_verdict);

  IF v_final > 0 THEN
    -- update domain_levels (upsert)
    SELECT * INTO v_dom_row FROM public.domain_levels
      WHERE user_id = NEW.user_id AND domain = v_domain FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.domain_levels(user_id, domain, total_xp, level, xp_in_level, rank)
      VALUES (NEW.user_id, v_domain, 0, 1, 0, 'Initiate')
      RETURNING * INTO v_dom_row;
    END IF;
    v_old_level := v_dom_row.level;
    v_new_xp := v_dom_row.xp_in_level + v_final;
    v_threshold := public.cle_level_threshold(v_dom_row.level);
    WHILE v_new_xp >= v_threshold LOOP
      v_new_xp := v_new_xp - v_threshold;
      v_dom_row.level := v_dom_row.level + 1;
      v_threshold := public.cle_level_threshold(v_dom_row.level);
      v_levels_gained := v_levels_gained + 1;
    END LOOP;
    UPDATE public.domain_levels SET
      total_xp = total_xp + v_final,
      xp_in_level = v_new_xp,
      level = v_dom_row.level,
      rank = public.cle_rank_for(v_dom_row.level),
      updated_at = now()
    WHERE user_id = NEW.user_id AND domain = v_domain;

    IF v_levels_gained > 0 THEN
      INSERT INTO public.identity_ledger(user_id, proof_id, domain, kind, summary, verdict)
      VALUES (NEW.user_id, NEW.id, v_domain, 'escalation',
        format('%s level up — L%s → L%s (%s).', upper(v_domain), v_old_level, v_dom_row.level, public.cle_rank_for(v_dom_row.level)),
        v_verdict);
    END IF;

    -- update operator_level
    SELECT * INTO v_op_row FROM public.operator_level WHERE user_id = NEW.user_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.operator_level(user_id) VALUES (NEW.user_id) RETURNING * INTO v_op_row;
    END IF;
    v_old_level := v_op_row.level;
    v_levels_gained := 0;
    v_new_xp := v_op_row.xp_in_level + v_final;
    v_threshold := public.cle_level_threshold(v_op_row.level);
    WHILE v_new_xp >= v_threshold LOOP
      v_new_xp := v_new_xp - v_threshold;
      v_op_row.level := v_op_row.level + 1;
      v_threshold := public.cle_level_threshold(v_op_row.level);
      v_levels_gained := v_levels_gained + 1;
    END LOOP;
    UPDATE public.operator_level SET
      total_xp = total_xp + v_final,
      xp_in_level = v_new_xp,
      level = v_op_row.level,
      rank = public.cle_rank_for(v_op_row.level),
      title = public.cle_operator_title(v_op_row.level),
      updated_at = now()
    WHERE user_id = NEW.user_id;

    IF v_levels_gained > 0 THEN
      INSERT INTO public.identity_ledger(user_id, proof_id, domain, kind, summary, verdict)
      VALUES (NEW.user_id, NEW.id, 'operator', 'escalation',
        format('Operator level up — L%s → L%s (%s).', v_old_level, v_op_row.level, public.cle_operator_title(v_op_row.level)),
        v_verdict);
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_cle_after_proof_insert ON public.proof_artifacts;
CREATE TRIGGER trg_cle_after_proof_insert
  BEFORE INSERT ON public.proof_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.cle_after_proof_insert();

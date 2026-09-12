
CREATE TABLE IF NOT EXISTS public.custom_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  goal TEXT NOT NULL,
  outcome TEXT NOT NULL,
  bottleneck TEXT NOT NULL,
  available_minutes_per_day INTEGER NOT NULL CHECK (available_minutes_per_day BETWEEN 1 AND 1440),
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_loop TEXT NOT NULL,
  weekly_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  minimum_viable_rep TEXT NOT NULL,
  proof_artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  progression_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_cycle TEXT NOT NULL,
  first_command TEXT NOT NULL,
  active_command TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_systems TO authenticated;
GRANT ALL ON public.custom_systems TO service_role;

ALTER TABLE public.custom_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_systems select own" ON public.custom_systems;
CREATE POLICY "custom_systems select own" ON public.custom_systems FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_systems insert own" ON public.custom_systems;
CREATE POLICY "custom_systems insert own" ON public.custom_systems FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_systems update own" ON public.custom_systems;
CREATE POLICY "custom_systems update own" ON public.custom_systems FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_custom_systems_user_active ON public.custom_systems(user_id, is_active, created_at DESC);

DROP TRIGGER IF EXISTS trg_custom_systems_updated ON public.custom_systems;
CREATE TRIGGER trg_custom_systems_updated BEFORE UPDATE ON public.custom_systems FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.system_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.custom_systems(id) ON DELETE CASCADE,
  proof_id UUID REFERENCES public.proof_artifacts(id) ON DELETE SET NULL,
  command TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  proof_content TEXT,
  self_score INTEGER CHECK (self_score BETWEEN 1 AND 10),
  score INTEGER CHECK (score BETWEEN 1 AND 10),
  verdict TEXT CHECK (verdict IN ('weak','moderate','strong','elite')),
  weakness TEXT,
  next_upgrade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_reps TO authenticated;
GRANT ALL ON public.system_reps TO service_role;

ALTER TABLE public.system_reps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_reps select own" ON public.system_reps;
CREATE POLICY "system_reps select own" ON public.system_reps FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "system_reps insert own" ON public.system_reps;
CREATE POLICY "system_reps insert own" ON public.system_reps FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.custom_systems s WHERE s.id = system_reps.system_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "system_reps update own" ON public.system_reps;
CREATE POLICY "system_reps update own" ON public.system_reps FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_system_reps_user_system_time ON public.system_reps(user_id, system_id, created_at DESC);

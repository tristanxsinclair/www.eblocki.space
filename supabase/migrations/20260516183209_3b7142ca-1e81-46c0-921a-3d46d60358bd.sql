ALTER TABLE public.user_onboarding_profiles
ADD COLUMN IF NOT EXISTS seen_welcome boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('friction','confusing','feature_request','behaviour_inaccurate')),
  body text NOT NULL,
  route text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta feedback insert own" ON public.beta_feedback;
DROP POLICY IF EXISTS "beta feedback select own" ON public.beta_feedback;
DROP POLICY IF EXISTS "beta feedback admin select" ON public.beta_feedback;

CREATE POLICY "beta feedback insert own"
ON public.beta_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "beta feedback select own"
ON public.beta_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "beta feedback admin select"
ON public.beta_feedback FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS beta_feedback_created_idx ON public.beta_feedback (created_at DESC);
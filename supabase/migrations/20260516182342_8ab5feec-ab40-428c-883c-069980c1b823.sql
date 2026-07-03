ALTER TABLE public.daily_objectives
ADD COLUMN IF NOT EXISTS completion_quality_self_rating integer;

ALTER TABLE public.daily_objectives
DROP CONSTRAINT IF EXISTS daily_objectives_quality_rating_range;

ALTER TABLE public.daily_objectives
ADD CONSTRAINT daily_objectives_quality_rating_range
CHECK (completion_quality_self_rating IS NULL OR (completion_quality_self_rating BETWEEN 1 AND 5));
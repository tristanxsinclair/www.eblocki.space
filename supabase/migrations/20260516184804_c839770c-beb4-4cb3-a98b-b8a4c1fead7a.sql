-- notification_preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  streak_rescue boolean NOT NULL DEFAULT true,
  depth_nudge boolean NOT NULL DEFAULT true,
  recovery_reminder boolean NOT NULL DEFAULT true,
  milestone boolean NOT NULL DEFAULT true,
  coach_prompt boolean NOT NULL DEFAULT true,
  quiet_hours_start smallint NOT NULL DEFAULT 22 CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end smallint NOT NULL DEFAULT 9 CHECK (quiet_hours_end BETWEEN 0 AND 23),
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np select own" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "np insert own" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "np update own" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER np_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- push_delivery_log
CREATE TABLE public.push_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_log_id uuid,
  push_token_id uuid,
  platform text,
  status text NOT NULL CHECK (status IN ('sent','delivered','failed','suppressed','disabled','clicked','opened','ignored')),
  failure_reason text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdl select own" ON public.push_delivery_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_push_delivery_log_user_time ON public.push_delivery_log (user_id, attempted_at DESC);
CREATE INDEX idx_push_delivery_log_notif ON public.push_delivery_log (notification_log_id);

-- notification_log new columns
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- user_onboarding_profiles timezone metadata
ALTER TABLE public.user_onboarding_profiles
  ADD COLUMN IF NOT EXISTS timezone_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone_source text NOT NULL DEFAULT 'default'
    CHECK (timezone_source IN ('default','browser','manual'));

-- push_tokens lifecycle columns
ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_reason text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens (user_id) WHERE is_active = true;
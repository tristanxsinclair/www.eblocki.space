
-- Notification log: one row per notification the system decides to send.
-- Used by the notify-momentum scheduler for rate-limiting and dedup.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,                    -- e.g. 'streak_at_risk', 'depth_nudge', 'recovery', 'freeze_milestone'
  dedup_key text NOT NULL,               -- e.g. 'streak_at_risk:2026-05-16' — unique per logical event/day
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered integer DEFAULT 0,
  total_targets integer DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx
  ON public.notification_log (user_id, sent_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS notification_log_user_dedup_idx
  ON public.notification_log (user_id, dedup_key);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_log select own"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- No client INSERT policy on purpose: only the service role (edge function)
-- writes here, which bypasses RLS.

-- Timezone for sensible local-time windows.
ALTER TABLE public.user_onboarding_profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';


CREATE TABLE public.interest_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('proof_week_join','pro_waitlist','founder_waitlist','would_pay','feedback')),
  preferred_price_cents INTEGER,
  currency TEXT DEFAULT 'AUD',
  note TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.interest_signals TO authenticated;
GRANT INSERT ON public.interest_signals TO anon;
GRANT ALL ON public.interest_signals TO service_role;

ALTER TABLE public.interest_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own signal" ON public.interest_signals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon insert signal" ON public.interest_signals
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND email IS NOT NULL AND length(email) <= 255);

CREATE POLICY "Users read own signal" ON public.interest_signals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all signals" ON public.interest_signals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_interest_signals_user ON public.interest_signals(user_id);
CREATE INDEX idx_interest_signals_type ON public.interest_signals(signal_type);

-- Add subscription tracking columns to the profiles table.
-- The Stripe webhook edge function already writes to these columns via the
-- service-role key; this migration makes them official schema.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_level  text NOT NULL DEFAULT 'free'
    CHECK (access_level IN ('free', 'pro', 'founder')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

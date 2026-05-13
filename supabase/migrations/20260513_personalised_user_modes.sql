-- Eblocki Personalised User Modes + Onboarding
-- Purpose:
-- Move Eblocki from Tristan-specific hardcoded modes into a user-personalised
-- behavioural performance OS, while preserving existing Tristan modes.

create table if not exists public.user_onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  identity_summary text,
  roles text[] default '{}',
  goals text[] default '{}',
  coaching_style text default 'direct',
  strictness_level integer default 7 check (strictness_level between 1 and 10),
  prefers_detailed_analysis boolean default true,
  challenge_avoidance boolean default true,
  auto_create_proof_contracts boolean default true,
  completed_onboarding boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_modes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode_id text not null,
  display_name text not null,
  description text,
  keywords text[] default '{}',
  proof_examples text[] default '{}',
  weak_evidence_examples text[] default '{}',
  strong_evidence_examples text[] default '{}',
  elite_evidence_examples text[] default '{}',
  preferred_response_framework text default 'Bottom Line Up Front → Analysis → Actionable System → HD/Elite Upgrade',
  scoring_criteria jsonb default '{}'::jsonb,
  research_needs text[] default '{}',
  tone_adjustments text,
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, mode_id)
);

create table if not exists public.user_research_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode_id text not null,
  topic text not null,
  research_summary text,
  verified_sources jsonb default '[]'::jsonb,
  source_quality_notes text,
  last_researched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.anonymised_learning_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_type text not null,
  domain text,
  problem_description text,
  intervention_summary text,
  effectiveness_notes text,
  evidence_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_onboarding_profiles enable row level security;
alter table public.user_modes enable row level security;
alter table public.user_research_profiles enable row level security;
alter table public.anonymised_learning_patterns enable row level security;

drop policy if exists "Users can view own onboarding profile" on public.user_onboarding_profiles;
create policy "Users can view own onboarding profile"
on public.user_onboarding_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own onboarding profile" on public.user_onboarding_profiles;
create policy "Users can insert own onboarding profile"
on public.user_onboarding_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own onboarding profile" on public.user_onboarding_profiles;
create policy "Users can update own onboarding profile"
on public.user_onboarding_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view own modes" on public.user_modes;
create policy "Users can view own modes"
on public.user_modes
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own modes" on public.user_modes;
create policy "Users can insert own modes"
on public.user_modes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own modes" on public.user_modes;
create policy "Users can update own modes"
on public.user_modes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own modes" on public.user_modes;
create policy "Users can delete own modes"
on public.user_modes
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own research profiles" on public.user_research_profiles;
create policy "Users can view own research profiles"
on public.user_research_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own research profiles" on public.user_research_profiles;
create policy "Users can insert own research profiles"
on public.user_research_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own research profiles" on public.user_research_profiles;
create policy "Users can update own research profiles"
on public.user_research_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can view anonymised learning patterns" on public.anonymised_learning_patterns;
create policy "Authenticated users can view anonymised learning patterns"
on public.anonymised_learning_patterns
for select
to authenticated
using (true);

-- Inserts/updates to anonymised_learning_patterns should be done server-side only.
-- Do not expose private user data here.

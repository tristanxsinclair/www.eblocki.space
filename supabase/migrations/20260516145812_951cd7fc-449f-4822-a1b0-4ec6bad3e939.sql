
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  platform text not null check (platform in ('ios','android','web')),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "push_tokens own" on public.push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event text not null,
  properties jsonb default '{}'::jsonb,
  session_id text,
  platform text,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
create policy "analytics insert own" on public.analytics_events for insert with check (auth.uid() = user_id or user_id is null);
create policy "analytics select own" on public.analytics_events for select using (auth.uid() = user_id);
create index if not exists analytics_events_user_event_idx on public.analytics_events (user_id, event, created_at desc);

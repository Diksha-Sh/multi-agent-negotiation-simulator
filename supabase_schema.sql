-- ============================================================================
-- Supabase Schema for Multi-Agent Negotiation Simulator
-- ============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It configures the 'simulations' table and Row-Level Security (RLS) policies.
-- ============================================================================

-- 1. Create the simulations table
create table if not exists public.simulations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  status text not null check (status in ('accepted', 'rejected', 'deadlock', 'ongoing')),
  winner text,
  total_rounds integer not null default 0,
  total_turns integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  turns jsonb not null default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Performance indexes
create index if not exists idx_simulations_user_id on public.simulations(user_id);
create index if not exists idx_simulations_scenario_id on public.simulations(scenario_id);
create index if not exists idx_simulations_created_at on public.simulations(created_at desc);

-- 3. Enable Row-Level Security (RLS)
alter table public.simulations enable row level security;

-- 4. RLS Policy: Users can view their own simulations or anonymous runs
create policy "Users can view own simulations"
  on public.simulations
  for select
  using (
    auth.uid() = user_id 
    or user_id is null
  );

-- 5. RLS Policy: Users can insert their own simulation runs
create policy "Users can insert own simulations"
  on public.simulations
  for insert
  with check (
    auth.uid() = user_id 
    or user_id is null
  );

-- 6. RLS Policy: Users can delete their own simulation runs
create policy "Users can delete own simulations"
  on public.simulations
  for delete
  using (auth.uid() = user_id);

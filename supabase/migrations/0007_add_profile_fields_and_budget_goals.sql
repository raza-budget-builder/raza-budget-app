-- Add name/main-goal fields to the existing profiles table, and a new
-- budget_goals table for per-category monthly spending caps.
alter table public.profiles
  add column if not exists name text,
  add column if not exists main_goal text;

create table if not exists public.budget_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_cap numeric(12, 2) not null check (monthly_cap > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table public.budget_goals enable row level security;

create policy "Users manage their own budget goals"
  on public.budget_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

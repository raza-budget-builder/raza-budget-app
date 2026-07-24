-- Cache for the Goals tab's AI-generated monthly summary, so it's only
-- regenerated when the underlying goals/spend actually change (new goal set,
-- cap changed, or spend moved) instead of on every page load.
create table if not exists public.monthly_goal_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  -- Deterministic snapshot of "category:cap:spend" for every goal at
  -- generation time — a plain string compare is enough to detect staleness,
  -- no need for a real hash.
  signature text not null,
  summary text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.monthly_goal_summaries enable row level security;

create policy "Users manage their own monthly goal summaries"
  on public.monthly_goal_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

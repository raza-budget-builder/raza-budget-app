-- Cache for the Insights tab's AI-generated weekly narrative summary, so it's
-- only regenerated when new transactions show up that week (or a new week
-- starts) instead of on every page load.
create table if not exists public.weekly_narrative_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  transaction_count integer not null,
  summary text not null,
  tip text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_narrative_summaries enable row level security;

create policy "Users manage their own weekly narrative summaries"
  on public.weekly_narrative_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

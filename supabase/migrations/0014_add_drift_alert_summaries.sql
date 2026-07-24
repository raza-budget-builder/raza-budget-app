-- Cache for the Insights tab's AI-generated "Drift alerts" section, so it's
-- only regenerated when the underlying spend-drift signals actually change
-- instead of on every page load. Mirrors monthly_goal_summaries.
create table if not exists public.drift_alert_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  -- Deterministic snapshot of the computed drift/new-subscription/price-
  -- increase signals at generation time — a plain string compare is enough
  -- to detect staleness, no need for a real hash.
  signature text not null,
  bullets jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.drift_alert_summaries enable row level security;

drop policy if exists "Users manage their own drift alert summaries" on public.drift_alert_summaries;

create policy "Users manage their own drift alert summaries"
  on public.drift_alert_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- recurring_groups is the canonical "series" entity: the template (amount,
-- category, description, interval) used to generate future occurrences, and
-- the active/inactive (stopped) state. Individual transactions still link to
-- a group via transactions.recurring_group_id for history/display, but the
-- template and active flag live here, not smeared across transaction rows.
create table if not exists public.recurring_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  cleaned_description text,
  amount numeric(12, 2) not null,
  category uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  interval text not null check (interval in ('weekly', 'biweekly', 'monthly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring_groups enable row level security;

drop policy if exists "Users manage their own recurring groups" on public.recurring_groups;

create policy "Users manage their own recurring groups"
  on public.recurring_groups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Backfill: earlier AI-confirmed series stamped a bare random uuid onto
-- transactions.recurring_group_id with no group entity behind it. Give each
-- of those distinct ids a real row here (using its most recent confirmed
-- transaction as the initial template) so they keep working under the new
-- architecture instead of silently disappearing.
insert into public.recurring_groups
  (id, user_id, description, cleaned_description, amount, category, type, interval, active)
select distinct on (t.recurring_group_id)
  t.recurring_group_id,
  t.user_id,
  t.description,
  t.cleaned_description,
  t.amount,
  t.category,
  t.type,
  t.recurring_interval,
  true
from public.transactions t
where t.recurring_group_id is not null
  and t.status = 'confirmed'
  and t.recurring_interval is not null
order by t.recurring_group_id, t.date desc
on conflict (id) do nothing;

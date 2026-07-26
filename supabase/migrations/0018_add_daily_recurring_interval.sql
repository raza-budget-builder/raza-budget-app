-- Run this in the Supabase SQL Editor. Adds 'daily' as an allowed
-- recurring interval, alongside the existing weekly/biweekly/monthly.
alter table public.transactions drop constraint if exists transactions_recurring_interval_check;
alter table public.transactions
  add constraint transactions_recurring_interval_check
  check (recurring_interval in ('daily', 'weekly', 'biweekly', 'monthly'));

alter table public.recurring_groups drop constraint if exists recurring_groups_interval_check;
alter table public.recurring_groups
  add constraint recurring_groups_interval_check
  check (interval in ('daily', 'weekly', 'biweekly', 'monthly'));

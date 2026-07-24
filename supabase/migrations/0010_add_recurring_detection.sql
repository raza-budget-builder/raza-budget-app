-- Passive recurring-transaction detection: a shared group id links matched
-- transactions together, with the detected cadence stored alongside.
alter table public.transactions
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurring_group_id uuid,
  add column if not exists recurring_interval text
    check (recurring_interval in ('weekly', 'biweekly', 'monthly'));

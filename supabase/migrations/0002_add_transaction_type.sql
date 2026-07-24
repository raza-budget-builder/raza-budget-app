-- Run this in the Supabase SQL Editor. Adds an explicit income/expense type
-- to each transaction, independent of whatever category it's tagged with.
alter table public.transactions
  add column if not exists type text not null default 'expense'
  check (type in ('income', 'expense'));

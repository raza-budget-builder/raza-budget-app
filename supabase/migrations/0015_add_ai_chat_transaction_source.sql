-- Lets the "Ask your budget" chat record transactions the user describes in
-- natural language (e.g. "I spent $40.22 at Walmart on groceries"), tagged
-- with their own source so they're distinguishable from manual entries and
-- CSV imports.
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check check (source in ('manual', 'csv', 'ai_chat'));

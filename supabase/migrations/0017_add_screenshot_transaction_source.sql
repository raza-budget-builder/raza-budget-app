-- Run this in the Supabase SQL Editor. Adds 'screenshot' as an allowed
-- transactions.source value, for transactions extracted from an uploaded
-- screenshot (email receipt, payment-app transaction list, bank statement,
-- spreadsheet, etc.) via Claude vision — distinct from a typed CSV import.
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check check (source in ('manual', 'csv', 'ai_chat', 'screenshot'));

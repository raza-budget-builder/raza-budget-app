-- Cleaned/normalized description alongside the raw one — stripped of payment
-- method tags, phone numbers, and trailing city/province noise. Populated
-- during CSV import; left null for manual entries.
alter table public.transactions
  add column if not exists cleaned_description text;

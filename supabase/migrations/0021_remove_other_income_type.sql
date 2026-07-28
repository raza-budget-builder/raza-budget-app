-- Run this in the Supabase SQL Editor. "Other" was removed as an income
-- type option (too vague to tailor anything to) — strip any existing
-- selections of it before tightening the constraint, so the update itself
-- can't fail against live data.
update public.profiles
  set income_type = array_remove(income_type, 'other')
  where income_type is not null;

alter table public.profiles drop constraint if exists profiles_income_type_check;
alter table public.profiles
  add constraint profiles_income_type_check
  check (income_type <@ array['salaried', 'freelance', 'business_owner']::text[]);

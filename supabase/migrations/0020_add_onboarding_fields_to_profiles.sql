-- Run this in the Supabase SQL Editor. Adds the fields the new-user
-- onboarding flow collects:
--   income_type — multi-select, used later to tailor cash-flow/insight
--     framing toward steady vs. variable income.
--   onboarding_completed_at — marks the flow done, whether the user filled
--     it in or explicitly skipped. Checked once in the (app) layout to
--     decide whether to route a signed-in user to /onboarding before
--     anything else, rather than duplicating the check per page.
alter table public.profiles
  add column if not exists income_type text[],
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles drop constraint if exists profiles_income_type_check;
alter table public.profiles
  add constraint profiles_income_type_check
  check (income_type <@ array['salaried', 'freelance', 'business_owner', 'other']::text[]);

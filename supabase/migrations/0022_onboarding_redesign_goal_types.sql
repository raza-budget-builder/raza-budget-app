-- Run this in the Supabase SQL Editor. Two changes for the onboarding
-- redesign:
--   1. Income type reinstates "other" (removed in 0021) and adds a new
--      "mixed" option (salary + side income) — the redesigned card-based
--      selector treats these as first-class options rather than expecting
--      users to multi-select salaried + freelance to express "mixed."
--   2. goal_types — the new guided, multi-select goal picker. main_goal
--      (existing free-text column) is repurposed as the optional
--      "add more detail" field rather than removed, so both persist.
alter table public.profiles drop constraint if exists profiles_income_type_check;
alter table public.profiles
  add constraint profiles_income_type_check
  check (income_type <@ array['salaried', 'freelance', 'business_owner', 'mixed', 'other']::text[]);

alter table public.profiles
  add column if not exists goal_types text[];

alter table public.profiles drop constraint if exists profiles_goal_types_check;
alter table public.profiles
  add constraint profiles_goal_types_check
  check (goal_types <@ array[
    'reduce_spending', 'save_more', 'retire_comfortably', 'invest_more',
    'give_more', 'big_purchase', 'get_out_of_debt', 'clearer_picture'
  ]::text[]);

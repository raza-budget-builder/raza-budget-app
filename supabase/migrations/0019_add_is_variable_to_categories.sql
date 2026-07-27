-- Run this in the Supabase SQL Editor. Adds `is_variable` to categories —
-- a hardcoded, developer-defined classification of whether a category's
-- monthly spend naturally fluctuates (Groceries, Dining Out) vs. is a
-- known/committed amount each month (Rent/Mortgage, Insurance). Used to
-- gate the "pace projection" AI insight (computePaceProjections in
-- src/lib/dashboard-insights.ts) and its "Adjust goal" action, which don't
-- make sense for a fixed expense — there's no meaningful "on track to hit
-- $X by month-end" for a payment that's the same every month. Null for
-- income categories (goals/pace projections never apply to income) and,
-- by design, for any category not covered below — the default is
-- exclusion, not inclusion, so a category added later never gets a
-- nonsensical projection just because it went unclassified.

alter table public.categories add column if not exists is_variable boolean;

update public.categories c
set is_variable = m.is_variable
from (values
  ('Rent/Mortgage', false),
  ('Utilities', false),
  ('Groceries', true),
  ('Dining Out', true),
  ('Transportation', true),
  ('Insurance', false),
  ('Health & Medical', true),
  ('Personal Care', true),
  ('Subscriptions', false),
  ('Entertainment', true),
  ('Shopping', true),
  ('Debt Payments', false),
  ('Childcare & Education', false),
  ('Travel', true),
  ('Gifts & Donations', true),
  ('Pet Care', true),
  ('Home Maintenance', true),
  ('Business Expenses', true),
  ('Taxes', false),
  ('Other Expense', false),
  ('Savings & Investments', false),
  ('Tithing', false)
) as m(name, is_variable)
where c.name = m.name and c.type = 'expense';

create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, budget_group, is_variable) values
    (new.id, 'Salary', 'income', null, null),
    (new.id, 'Freelance Income', 'income', null, null),
    (new.id, 'Business Revenue', 'income', null, null),
    (new.id, 'Investment Income', 'income', null, null),
    (new.id, 'Gifts', 'income', null, null),
    (new.id, 'Other Income', 'income', null, null),
    (new.id, 'Rent/Mortgage', 'expense', 'needs', false),
    (new.id, 'Utilities', 'expense', 'needs', false),
    (new.id, 'Groceries', 'expense', 'needs', true),
    (new.id, 'Dining Out', 'expense', 'wants', true),
    (new.id, 'Transportation', 'expense', 'needs', true),
    (new.id, 'Insurance', 'expense', 'needs', false),
    (new.id, 'Health & Medical', 'expense', 'needs', true),
    (new.id, 'Personal Care', 'expense', 'wants', true),
    (new.id, 'Subscriptions', 'expense', 'wants', false),
    (new.id, 'Entertainment', 'expense', 'wants', true),
    (new.id, 'Shopping', 'expense', 'wants', true),
    (new.id, 'Debt Payments', 'expense', 'needs', false),
    (new.id, 'Childcare & Education', 'expense', 'needs', false),
    (new.id, 'Travel', 'expense', 'wants', true),
    (new.id, 'Gifts & Donations', 'expense', 'wants', true),
    (new.id, 'Pet Care', 'expense', 'needs', true),
    (new.id, 'Home Maintenance', 'expense', 'needs', true),
    (new.id, 'Business Expenses', 'expense', 'excluded', true),
    (new.id, 'Taxes', 'expense', 'excluded', false),
    (new.id, 'Other Expense', 'expense', 'excluded', false),
    (new.id, 'Savings & Investments', 'expense', 'savings', false),
    (new.id, 'Tithing', 'expense', 'excluded', false);
  return new;
end;
$$;

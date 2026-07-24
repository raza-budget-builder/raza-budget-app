-- Run this in the Supabase SQL Editor. Adds a "Savings & Investments" expense
-- category and a budget_group field (needs/wants/savings/excluded) used for
-- a 50/30/20-style budget split. Income categories are left with a null
-- budget_group — the split only applies to expenses.

alter table public.categories
  add column if not exists budget_group text
  check (budget_group in ('needs', 'wants', 'savings', 'excluded'));

-- Backfill budget_group on every existing expense category, matched by name.
update public.categories c
set budget_group = m.budget_group
from (values
  ('Rent/Mortgage', 'needs'),
  ('Utilities', 'needs'),
  ('Groceries', 'needs'),
  ('Transportation', 'needs'),
  ('Insurance', 'needs'),
  ('Health & Medical', 'needs'),
  ('Debt Payments', 'needs'),
  ('Childcare & Education', 'needs'),
  ('Home Maintenance', 'needs'),
  ('Pet Care', 'needs'),
  ('Dining Out', 'wants'),
  ('Personal Care', 'wants'),
  ('Subscriptions', 'wants'),
  ('Entertainment', 'wants'),
  ('Shopping', 'wants'),
  ('Travel', 'wants'),
  ('Gifts & Donations', 'wants'),
  ('Savings & Investments', 'savings'),
  ('Taxes', 'excluded'),
  ('Business Expenses', 'excluded'),
  ('Other Expense', 'excluded')
) as m(name, budget_group)
where c.name = m.name and c.type = 'expense';

-- Add the new "Savings & Investments" category for every existing user who
-- doesn't already have one.
insert into public.categories (user_id, name, type, budget_group)
select u.id, 'Savings & Investments', 'expense', 'savings'
from auth.users u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id and c.name = 'Savings & Investments'
);

-- Update the signup trigger so future users get the new category and
-- budget_group assignments from day one.
create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, budget_group) values
    (new.id, 'Salary', 'income', null),
    (new.id, 'Freelance Income', 'income', null),
    (new.id, 'Business Revenue', 'income', null),
    (new.id, 'Investment Income', 'income', null),
    (new.id, 'Gifts', 'income', null),
    (new.id, 'Other Income', 'income', null),
    (new.id, 'Rent/Mortgage', 'expense', 'needs'),
    (new.id, 'Utilities', 'expense', 'needs'),
    (new.id, 'Groceries', 'expense', 'needs'),
    (new.id, 'Dining Out', 'expense', 'wants'),
    (new.id, 'Transportation', 'expense', 'needs'),
    (new.id, 'Insurance', 'expense', 'needs'),
    (new.id, 'Health & Medical', 'expense', 'needs'),
    (new.id, 'Personal Care', 'expense', 'wants'),
    (new.id, 'Subscriptions', 'expense', 'wants'),
    (new.id, 'Entertainment', 'expense', 'wants'),
    (new.id, 'Shopping', 'expense', 'wants'),
    (new.id, 'Debt Payments', 'expense', 'needs'),
    (new.id, 'Childcare & Education', 'expense', 'needs'),
    (new.id, 'Travel', 'expense', 'wants'),
    (new.id, 'Gifts & Donations', 'expense', 'wants'),
    (new.id, 'Pet Care', 'expense', 'needs'),
    (new.id, 'Home Maintenance', 'expense', 'needs'),
    (new.id, 'Business Expenses', 'expense', 'excluded'),
    (new.id, 'Taxes', 'expense', 'excluded'),
    (new.id, 'Other Expense', 'expense', 'excluded'),
    (new.id, 'Savings & Investments', 'expense', 'savings');
  return new;
end;
$$;

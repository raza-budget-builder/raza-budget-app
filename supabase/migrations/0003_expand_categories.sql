-- Run this in the Supabase SQL Editor. Expands the default category set.
-- Every old category name is a subset of the new list, so nothing is
-- renamed or removed — existing transactions keep their category
-- assignment untouched.

create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type) values
    (new.id, 'Salary', 'income'),
    (new.id, 'Freelance Income', 'income'),
    (new.id, 'Business Revenue', 'income'),
    (new.id, 'Investment Income', 'income'),
    (new.id, 'Gifts', 'income'),
    (new.id, 'Other Income', 'income'),
    (new.id, 'Rent/Mortgage', 'expense'),
    (new.id, 'Utilities', 'expense'),
    (new.id, 'Groceries', 'expense'),
    (new.id, 'Dining Out', 'expense'),
    (new.id, 'Transportation', 'expense'),
    (new.id, 'Insurance', 'expense'),
    (new.id, 'Health & Medical', 'expense'),
    (new.id, 'Personal Care', 'expense'),
    (new.id, 'Subscriptions', 'expense'),
    (new.id, 'Entertainment', 'expense'),
    (new.id, 'Shopping', 'expense'),
    (new.id, 'Debt Payments', 'expense'),
    (new.id, 'Childcare & Education', 'expense'),
    (new.id, 'Travel', 'expense'),
    (new.id, 'Gifts & Donations', 'expense'),
    (new.id, 'Pet Care', 'expense'),
    (new.id, 'Home Maintenance', 'expense'),
    (new.id, 'Business Expenses', 'expense'),
    (new.id, 'Taxes', 'expense'),
    (new.id, 'Other Expense', 'expense');
  return new;
end;
$$;

-- Backfill: give every existing user any new category they don't already
-- have (matched by name), without touching categories they already have.
insert into public.categories (user_id, name, type)
select u.id, cat.name, cat.type
from auth.users u
cross join (values
  ('Salary', 'income'),
  ('Freelance Income', 'income'),
  ('Business Revenue', 'income'),
  ('Investment Income', 'income'),
  ('Gifts', 'income'),
  ('Other Income', 'income'),
  ('Rent/Mortgage', 'expense'),
  ('Utilities', 'expense'),
  ('Groceries', 'expense'),
  ('Dining Out', 'expense'),
  ('Transportation', 'expense'),
  ('Insurance', 'expense'),
  ('Health & Medical', 'expense'),
  ('Personal Care', 'expense'),
  ('Subscriptions', 'expense'),
  ('Entertainment', 'expense'),
  ('Shopping', 'expense'),
  ('Debt Payments', 'expense'),
  ('Childcare & Education', 'expense'),
  ('Travel', 'expense'),
  ('Gifts & Donations', 'expense'),
  ('Pet Care', 'expense'),
  ('Home Maintenance', 'expense'),
  ('Business Expenses', 'expense'),
  ('Taxes', 'expense'),
  ('Other Expense', 'expense')
) as cat(name, type)
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id and c.name = cat.name
);

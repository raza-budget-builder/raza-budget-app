-- Run this in the Supabase SQL Editor. Adds a "Tithing" expense category,
-- tracked separately from the general "Gifts & Donations" bucket. Excluded
-- from the 50/30/20 split (like Taxes/Business Expenses) rather than filed
-- under "wants" — an increase here shouldn't push the wants meter off
-- target, since giving more isn't a lifestyle overspend. The AI insight
-- prompts (drift alerts, weekly narrative, goal summary, chat) separately
-- treat increases in this category, and in the existing "Debt Payments"
-- category, as something to celebrate rather than flag.

insert into public.categories (user_id, name, type, budget_group)
select u.id, 'Tithing', 'expense', 'excluded'
from auth.users u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id and c.name = 'Tithing'
);

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
    (new.id, 'Savings & Investments', 'expense', 'savings'),
    (new.id, 'Tithing', 'expense', 'excluded');
  return new;
end;
$$;

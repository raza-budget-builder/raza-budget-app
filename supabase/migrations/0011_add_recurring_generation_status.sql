-- Distinguishes a real (confirmed) transaction from an auto-generated
-- prediction of a recurring group's next occurrence, awaiting the user's
-- confirmation. Independent of the existing `confirmed` column, which is
-- about category-confirmation for ambiguous CSV imports.
alter table public.transactions
  add column if not exists status text not null default 'confirmed'
    check (status in ('confirmed', 'pending'));

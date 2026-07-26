-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- It creates the categories/transactions tables, locks them down with row-level
-- security so users can only ever see their own rows, and seeds a starter set
-- of categories whenever a new user signs up.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  -- 50/30/20-style budgeting bucket. Only meaningful for expense categories —
  -- income categories leave this null. Nullable rather than defaulted, since
  -- "excluded" is a real, deliberate choice, not the same as "unset".
  budget_group text check (budget_group in ('needs', 'wants', 'savings', 'excluded')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'entrepreneur')),
  name text,
  main_goal text,
  created_at timestamptz not null default now()
);

-- Tracks each CSV import batch (the original file text + a row count) so the
-- Profile page's Imports section can show what was imported, offer the file
-- back for download, and let the user revert (undo) an import as one action.
create table if not exists public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  raw_content text not null,
  row_count integer not null,
  imported_at timestamptz not null default now(),
  -- Null until reverted. The row (and its raw_content) stays around after a
  -- revert so the CSV is still downloadable and the batch stays visible in
  -- history — only the transactions it created are deleted.
  reverted_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  -- Cleaned/normalized description (payment-method tags, phone numbers, and
  -- trailing city/province noise stripped) alongside the raw one. Populated
  -- during CSV import; left null for manual entries.
  cleaned_description text,
  amount numeric(12, 2) not null,
  category uuid references public.categories(id) on delete set null,
  type text not null default 'expense' check (type in ('income', 'expense')),
  source text not null default 'manual' check (source in ('manual', 'csv', 'ai_chat', 'screenshot')),
  confirmed boolean not null default true,
  -- Passive recurring-transaction detection — a shared group id links
  -- matched transactions together, with the detected cadence alongside.
  is_recurring boolean not null default false,
  recurring_group_id uuid,
  recurring_interval text check (recurring_interval in ('daily', 'weekly', 'biweekly', 'monthly')),
  -- 'pending' = an auto-generated prediction of a recurring group's next
  -- occurrence, awaiting the user's confirmation. Independent of `confirmed`
  -- above, which is about category-confirmation for ambiguous CSV imports
  -- and unsure AI-chat-recorded transactions.
  status text not null default 'confirmed' check (status in ('confirmed', 'pending')),
  -- Which CSV import batch created this row, if any — lets a revert find
  -- and delete exactly the rows that batch created. Null for manual entries.
  import_id uuid references public.csv_imports(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Cache for the Insights tab's AI-generated weekly narrative summary, so it's
-- only regenerated when new transactions show up that week (or a new week
-- starts) instead of on every page load.
create table if not exists public.weekly_narrative_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  transaction_count integer not null,
  summary text not null,
  tip text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Per-category monthly spending caps the user sets from their Profile page,
-- surfaced as progress bars in the Insights tab.
create table if not exists public.budget_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_cap numeric(12, 2) not null check (monthly_cap > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

-- Cache for the Goals tab's AI-generated monthly summary, so it's only
-- regenerated when the underlying goals/spend actually change (new goal set,
-- cap changed, or spend moved) instead of on every page load.
create table if not exists public.monthly_goal_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  -- Deterministic snapshot of "category:cap:spend" for every goal at
  -- generation time — a plain string compare is enough to detect staleness,
  -- no need for a real hash.
  signature text not null,
  summary text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, month)
);

-- Cache for the Insights tab's AI-generated "Drift alerts" section, so it's
-- only regenerated when the underlying spend-drift signals actually change
-- instead of on every page load.
create table if not exists public.drift_alert_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  -- Deterministic snapshot of the computed drift/new-subscription/price-
  -- increase signals at generation time — a plain string compare is enough
  -- to detect staleness, no need for a real hash.
  signature text not null,
  bullets jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, month)
);

-- recurring_groups is the canonical "series" entity: the template (amount,
-- category, description, interval) used to generate future occurrences, and
-- the active/inactive (stopped) state. Individual transactions still link to
-- a group via transactions.recurring_group_id for history/display, but the
-- template and active flag live here, not smeared across transaction rows.
create table if not exists public.recurring_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  cleaned_description text,
  amount numeric(12, 2) not null,
  category uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  interval text not null check (interval in ('daily', 'weekly', 'biweekly', 'monthly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.profiles enable row level security;
alter table public.weekly_narrative_summaries enable row level security;
alter table public.budget_goals enable row level security;
alter table public.monthly_goal_summaries enable row level security;
alter table public.recurring_groups enable row level security;
alter table public.csv_imports enable row level security;
alter table public.drift_alert_summaries enable row level security;

create policy "Users manage their own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage their own weekly narrative summaries"
  on public.weekly_narrative_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own budget goals"
  on public.budget_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own monthly goal summaries"
  on public.monthly_goal_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own recurring groups"
  on public.recurring_groups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own csv imports"
  on public.csv_imports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own drift alert summaries"
  on public.drift_alert_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Give every new user a starter set of categories so the transaction form
-- has something to select from immediately after signup.
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

drop trigger if exists on_auth_user_created_categories on auth.users;
create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_categories();

-- Give every new user a profile row (defaulting to the free tier) so
-- tier-gated features have something to check against immediately.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tier) values (new.id, 'free');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Run this in the Supabase SQL Editor. Adds a profiles table with a simple
-- `tier` field ('free' | 'entrepreneur'), used to gate the new Business
-- section. Every existing user gets backfilled to 'free'.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'entrepreneur')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

-- Backfill: give every existing user a profile row if they don't have one.
insert into public.profiles (id, tier)
select u.id, 'free'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

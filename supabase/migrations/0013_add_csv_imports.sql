-- csv_imports tracks each CSV import batch so the Profile page's Imports
-- section can show what was imported, offer the original file back for
-- download, and let the user revert (undo) an import in one action instead
-- of hunting down and deleting rows by hand.
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

alter table public.csv_imports enable row level security;

drop policy if exists "Users manage their own csv imports" on public.csv_imports;

create policy "Users manage their own csv imports"
  on public.csv_imports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Links each imported transaction back to the batch it came from, so a
-- revert can find (and delete) exactly the rows that batch created. Null
-- for manually-added transactions and anything imported before this column
-- existed.
alter table public.transactions
  add column if not exists import_id uuid references public.csv_imports(id) on delete set null;

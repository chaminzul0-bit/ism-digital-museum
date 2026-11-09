-- v2 шинэчлэл: schema.sql-г өмнө нь ажиллуулсан бол Supabase SQL Editor дээр зөвхөн энэ файлыг ажиллуулна.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists major text;
alter table public.profiles add column if not exists github_url text;

create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  title text not null, category text, summary text, content jsonb,
  source_url text not null unique, source_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  fetched_at timestamptz, reviewed_at timestamptz, created_at timestamptz default now()
);
alter table public.import_items enable row level security;
drop policy if exists "import_items read" on public.import_items;
drop policy if exists "import_items admin update" on public.import_items;
drop policy if exists "import_items admin delete" on public.import_items;
create policy "import_items read" on public.import_items for select using (status = 'approved' or public.is_admin());
create policy "import_items admin update" on public.import_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "import_items admin delete" on public.import_items for delete to authenticated using (public.is_admin());

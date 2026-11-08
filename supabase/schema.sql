-- ISM Digital Museum: Supabase SQL Editor дээр бүтнээр нь ажиллуулна.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,   -- PK, auth.users-тэй 1:1
  display_name text not null,
  avatar_url text,
  role text not null default 'creator' check (role in ('creator','admin')),
  created_at timestamptz default now()
);
create table public.exhibition_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, description text, created_at timestamptz default now()
);
create table public.exhibits (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, image_url text,
  category_id uuid references public.exhibition_categories(id) on delete set null,  -- FK: ангилал
  technology_stack text[] default '{}',
  year_created int check (year_created between 1990 and 2100),
  creator_id uuid not null references public.profiles(id) on delete cascade,        -- FK: бүтээгч
  demo_url text, github_url text,
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz default now()
);
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null, position text, courses text, bio text, photo_url text, created_at timestamptz default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null, event_date date not null, description text, cover_image_url text, created_at timestamptz default now()
);
create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,            -- FK: арга хэмжээ
  image_url text not null, caption text, created_at timestamptz default now()
);
create table public.history_entries (   -- ISM Time Machine-ийн түүхэн үе шат
  id uuid primary key default gen_random_uuid(),
  year int not null, title text not null, description text, created_at timestamptz default now()
);

-- Шинэ хэрэглэгч бүртгүүлэхэд profile автоматаар үүснэ
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.exhibition_categories enable row level security;
alter table public.exhibits enable row level security;
alter table public.teachers enable row level security;
alter table public.events enable row level security;
alter table public.event_photos enable row level security;
alter table public.history_entries enable row level security;

create policy "profiles read" on public.profiles for select using (true);
-- Хэрэглэгч өөрийн нэр/avatar-аа засаж болно. Role өөрчлөхийг trigger хориглоно.
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create function public.prevent_role_escalation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Only an administrator can change a user role';
  end if;
  return new;
end $$;
create trigger protect_profile_role before update on public.profiles
for each row execute function public.prevent_role_escalation();

create policy "exhibits read" on public.exhibits for select using (status = 'published' or creator_id = auth.uid() or public.is_admin());
create policy "exhibits insert own" on public.exhibits for insert to authenticated with check (creator_id = auth.uid());
create policy "exhibits update own" on public.exhibits for update to authenticated using (creator_id = auth.uid() or public.is_admin()) with check (creator_id = auth.uid() or public.is_admin());
create policy "exhibits delete own" on public.exhibits for delete to authenticated using (creator_id = auth.uid() or public.is_admin());

do $$ declare t text; begin
  foreach t in array array['exhibition_categories','teachers','events','event_photos','history_entries'] loop
    execute format('create policy "%1$s read" on public.%1$s for select using (true)', t);
    execute format('create policy "%1$s admin write" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- STORAGE: нийтэд харагдана, зөвхөн өөрийн хавтас руу (uid/...) оруулна
insert into storage.buckets (id, name, public) values ('images','images', true) on conflict do nothing;
create policy "images public read" on storage.objects for select using (bucket_id = 'images');
create policy "images upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Жишиг өгөгдөл
insert into public.exhibition_categories(name, description) values
 ('Вэб аппликейшн','Вэб дээр суурилсан төслүүд'),('Гар утасны апп','iOS / Android аппликейшн'),
 ('Өгөгдлийн шинжилгээ','Дашборд, судалгаа, ML'),('Судалгаа','Эрдэм шинжилгээний бүтээл');
insert into public.history_entries(year, title, description) values
 (2010,'Тэнхим байгуулагдсан','ISM тэнхимийн анхны элсэлт болон сургалтын хөтөлбөр эхэлсэн (жишиг мэдээлэл — өөрчилнө үү).'),
 (2016,'Хөтөлбөр шинэчлэгдсэн','Вэб болон өгөгдлийн сангийн хичээлүүд өргөжсөн (жишиг).'),
 (2024,'Дижитал музей санаачилга','Тэнхимийн түүх, бүтээлийг дижитал хэлбэрт шилжүүлэх төсөл эхэлсэн.');
-- Админ болгох: update public.profiles set role='admin' where id = '<таны auth user id>';

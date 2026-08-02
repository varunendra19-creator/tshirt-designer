-- ============================================================================
-- Campus Mode — user profiles + roles (run once in Supabase SQL Editor)
-- ============================================================================

-- one row per auth user, carrying their role
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       text not null default 'customer' check (role in ('customer','staff','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- a user can read (and later update) their own profile; role changes stay server-side
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

-- auto-create a profile whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill profiles for users who already signed up
insert into public.profiles (id, email, name)
select id, email, raw_user_meta_data->>'name'
from auth.users
on conflict (id) do nothing;

-- ── make yourself admin (edit the email) ──
-- update public.profiles set role = 'admin' where email = 'you@example.com';

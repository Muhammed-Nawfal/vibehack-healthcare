-- Mira patient profiles (run in Supabase SQL Editor or via Supabase CLI)

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  gestation_weeks int not null check (gestation_weeks >= 0 and gestation_weeks <= 42),
  nhs_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Optional: auto-create profile row when email confirmation completes (if you
-- pass gestation_weeks / nhs_number via signUp metadata). The frontend currently
-- inserts the profile row immediately after signUp instead.

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

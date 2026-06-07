-- Allow signed-in users to access their own profile through PostgREST.
grant select, insert, update on table public.profiles to authenticated;
revoke all on table public.profiles from anon;

-- Create the profile in the database transaction that creates the auth user.
-- This also works when email confirmation means the browser has no session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    gestation_weeks,
    nhs_number
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'gestation_weeks')::int,
    new.raw_user_meta_data ->> 'nhs_number'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users created after the frontend started sending complete metadata.
insert into public.profiles (id, full_name, gestation_weeks, nhs_number)
select
  id,
  raw_user_meta_data ->> 'full_name',
  (raw_user_meta_data ->> 'gestation_weeks')::int,
  raw_user_meta_data ->> 'nhs_number'
from auth.users
where raw_user_meta_data ? 'full_name'
  and raw_user_meta_data ? 'gestation_weeks'
  and raw_user_meta_data ? 'nhs_number'
on conflict (id) do nothing;

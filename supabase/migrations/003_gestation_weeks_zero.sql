-- Expand the accepted pregnancy-week range for existing projects.
alter table public.profiles
  drop constraint if exists profiles_gestation_weeks_check;

alter table public.profiles
  add constraint profiles_gestation_weeks_check
  check (gestation_weeks >= 0 and gestation_weeks <= 42);

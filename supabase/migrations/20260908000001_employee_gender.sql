-- Employee gender (self-reported attribute for the profile page)
alter table public.employees
  add column if not exists gender text;

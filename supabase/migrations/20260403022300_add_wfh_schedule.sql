create table if not exists public.wfh_schedule (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  week_start date not null,
  wfh_days text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wfh_schedule_employee_id_week_start_key
  on public.wfh_schedule (employee_id, week_start);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wfh_schedule_employee_id_week_start_unique'
  ) then
    alter table public.wfh_schedule
      add constraint wfh_schedule_employee_id_week_start_unique
      unique using index wfh_schedule_employee_id_week_start_key;
  end if;
end $$;

alter table public.wfh_schedule enable row level security;

drop policy if exists "Anyone can read wfh_schedule" on public.wfh_schedule;
create policy "Anyone can read wfh_schedule"
  on public.wfh_schedule
  for select
  using (true);

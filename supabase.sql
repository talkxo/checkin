create extension if not exists pgcrypto;
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text unique generated always as (regexp_replace(lower(full_name),'[^a-z0-9]+','-','g')) stored,
  email text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  checkin_ts timestamptz not null default now(),
  checkout_ts timestamptz,
  mode text not null check (mode in ('office','remote')),
  ip inet,
  user_agent text
);
create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);
create index if not exists sessions_emp_checkin_idx on public.sessions(employee_id, checkin_ts desc);
-- Ensure at most one open session per employee
create unique index if not exists uniq_open_session_per_employee on public.sessions(employee_id) where checkout_ts is null;
alter table public.employees enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;
create policy employees_read on public.employees for select using (true);
create policy sessions_read on public.sessions for select using (true);
create policy sessions_insert on public.sessions for insert with check (true);
create policy sessions_update on public.sessions for update using (true);
create policy settings_rw on public.settings for all using (true) with check (true);
create or replace function public.today_sessions(start_ts timestamptz, end_ts timestamptz)
returns table(full_name text, mode text, checkin_ts timestamptz) language sql stable as $$
  with latest as (
    select distinct on (employee_id) employee_id, mode, checkin_ts
    from public.sessions
    where checkin_ts between start_ts and end_ts
    order by employee_id, checkin_ts desc
  )
  select e.full_name, l.mode, l.checkin_ts
  from latest l join public.employees e on e.id = l.employee_id
  order by e.full_name asc;
$$;



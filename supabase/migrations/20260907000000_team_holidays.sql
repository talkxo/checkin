-- Team-wide public holidays. Not per-employee: every member of the team sees
-- the same list, and the calendar timeline tints these days.
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists holidays_name_date_key
  on public.holidays (name, date);

alter table public.holidays enable row level security;

drop policy if exists "Anyone can read holidays" on public.holidays;
create policy "Anyone can read holidays"
  on public.holidays
  for select
  using (true);

-- Seed with the fixed-date holidays for the current cycle. Floating festivals
-- (Diwali, Holi, Eid) are added per year by the admin.
insert into public.holidays (name, date) values
  ('Independence Day', '2026-08-15'),
  ('Gandhi Jayanti', '2026-10-02'),
  ('Diwali', '2026-11-08'),
  ('Christmas', '2026-12-25'),
  ('Republic Day', '2027-01-26')
on conflict (name, date) do nothing;

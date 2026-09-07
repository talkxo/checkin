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

-- Seed with the official 2026 holiday list. Next year's list (floating
-- festivals included) is inserted by the admin in the holidays table.
insert into public.holidays (name, date) values
  ('Republic Day', '2026-01-26'),
  ('Holi', '2026-03-04'),
  ('Id-Ul-Fitr', '2026-03-21'),
  ('Ram Navmi', '2026-03-26'),
  ('Independence Day', '2026-08-15'),
  ('Raksha Bandhan', '2026-08-28'),
  ('Janmashtami', '2026-09-04'),
  ('Mahatma Gandhi Jayanti', '2026-10-02'),
  ('Dussehra', '2026-10-20'),
  ('Diwali (Deepavali)', '2026-11-08'),
  ('Goverdhan Puja', '2026-11-09'),
  ('Guru Nanak Dev Jayanti', '2026-11-24'),
  ('Christmas Day', '2026-12-25')
on conflict (name, date) do nothing;

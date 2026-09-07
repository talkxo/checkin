-- People system: richer employee attributes + document links.
-- Documents are LINKS (Drive/Dropbox etc.) — no storage bucket; access
-- control lives in the linked folder's sharing settings.
alter table public.employees
  add column if not exists date_of_birth date,
  add column if not exists phone text,
  add column if not exists emergency_contact text;

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  label text not null,
  url text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists employee_documents_employee_id_idx
  on public.employee_documents (employee_id);

alter table public.employee_documents enable row level security;

drop policy if exists "Authenticated users manage employee_documents" on public.employee_documents;
create policy "Authenticated users manage employee_documents"
  on public.employee_documents
  for all
  using (true)
  with check (true);

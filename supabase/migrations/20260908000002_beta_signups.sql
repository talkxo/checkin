-- Beta program signups: organisations asking for their own INSYDE instance.
-- Written to by the public /api/beta-signup route (service role), reviewed by ops.

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8)),
  status text not null default 'submitted' check (status in ('submitted','in_review','provisioned','archived')),

  -- Primary contact (the person setting up the workspace)
  contact_name text not null,
  contact_email text not null,
  contact_role text,
  contact_phone text,

  -- Organisation
  company_name text not null,
  website text,
  industry text,
  company_size text,
  work_model text check (work_model in ('office','remote','hybrid')),

  -- Work rhythm
  work_days text[] not null default '{}',
  work_start_time text,
  work_end_time text,
  timezone text not null default 'Asia/Kolkata',

  -- Team & tooling
  team_members jsonb not null default '[]'::jsonb,
  tools text[] not null default '{}',

  notes text,
  source text not null default 'wizard',

  created_at timestamptz not null default now()
);

create index if not exists beta_signups_created_idx on public.beta_signups (created_at desc);

-- RLS on, no public policies: the table is only reachable through the
-- service role key (API routes / ops dashboard). Anon key can neither
-- read nor write, so the public wizard can only submit via /api/beta-signup.
alter table public.beta_signups enable row level security;

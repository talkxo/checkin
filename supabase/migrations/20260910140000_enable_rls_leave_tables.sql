-- Enable RLS on the remaining tables that never had it captured in a migration
-- (leave_requests, leave_balances, leave_accruals, leave_types, saved_responses).
-- Same policy as 20260910120000_login_attempts: RLS on, no policies — every
-- access goes through the app's service role, which bypasses RLS, so nothing
-- breaks; anonymous/anon-key reads are blocked.

alter table public.leave_requests   enable row level security;
alter table public.leave_balances   enable row level security;
alter table public.leave_accruals   enable row level security;
alter table public.leave_types      enable row level security;
alter table public.saved_responses  enable row level security;

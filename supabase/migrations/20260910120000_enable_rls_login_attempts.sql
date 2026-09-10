-- Security hardening — Supabase alert rls_disabled_in_public (31 Aug 2026):
-- login_attempts was created manually in the dashboard without Row-Level
-- Security, leaving every recorded login attempt (IP address, username,
-- timestamps) publicly readable, editable, and deletable by anyone with the
-- project URL.
--
-- All access flows through the service role (verify-pin + admin-login rate
-- limiting), which bypasses RLS — so enabling it with no additional policies
-- locks anon/authenticated out without affecting the app.

alter table public.login_attempts enable row level security;

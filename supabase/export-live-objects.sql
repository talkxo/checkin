-- NOT a migration. Run in the Supabase SQL editor to export the CREATE
-- statements of live DB objects that have no migration file yet (the
-- "created in the dashboard" trap). Paste the output into a new file under
-- supabase/migrations/ so the repo is the source of truth.
--
-- Known untracked as of 2026-09-10: functions get_employee_leave_balance,
-- increment_leave_balance_pending (both called from app code).

select '-- FUNCTION ' || p.proname || E'\n' ||
       pg_get_functiondef(p.oid) || ';' as capture
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_employee_leave_balance', 'increment_leave_balance_pending');

-- Safety net: any public table still missing RLS (should return zero rows).
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by 1;

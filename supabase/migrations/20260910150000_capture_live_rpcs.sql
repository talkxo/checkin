-- Capture of two live-dashboard-created functions that app code calls but no
-- migration ever tracked (exported via supabase/export-live-objects.sql on
-- 2026-09-10, definitions taken verbatim from production). Idempotent:
-- CREATE OR REPLACE, safe on environments that already have them.

CREATE OR REPLACE FUNCTION public.get_employee_leave_balance(emp_id uuid, target_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE))
 RETURNS TABLE(leave_type_name text, total_entitlement integer, used_leaves integer, pending_leaves integer, available_leaves integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    lt.name as leave_type_name,
    lb.total_entitlement,
    lb.used_leaves,
    lb.pending_leaves,
    (lb.total_entitlement - lb.used_leaves - lb.pending_leaves) as available_leaves
  FROM public.leave_balances lb
  JOIN public.leave_types lt ON lb.leave_type_id = lt.id
  WHERE lb.employee_id = emp_id AND lb.year = target_year
  ORDER BY lt.name;
$function$;

CREATE OR REPLACE FUNCTION public.increment_leave_balance_pending(emp_id uuid, type_id uuid, target_year integer, amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.leave_balances
  SET
    pending_leaves = pending_leaves + amount,
    updated_at = NOW()
  WHERE employee_id = emp_id
    AND leave_type_id = type_id
    AND year = target_year;
END;
$function$;

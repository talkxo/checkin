-- Fix process_leave_balance — the previous definition updated a column
-- "available_leaves" that does not exist on leave_balances (schema drift:
-- the real columns are total_entitlement / used_leaves / pending_leaves),
-- so EVERY call failed with 42703 and no approval ever moved a balance.
--
-- Semantics preserved: approve moves days from pending to used; reject just
-- releases them from pending. Params match what the API sends.

CREATE OR REPLACE FUNCTION public.process_leave_balance(
  emp_id uuid,
  type_id uuid,
  target_year integer,
  amount integer,
  is_approved boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.leave_balances
  SET
    used_leaves = CASE
      WHEN is_approved THEN used_leaves + amount
      ELSE used_leaves
    END,
    pending_leaves = GREATEST(pending_leaves - amount, 0),
    updated_at = now()
  WHERE employee_id = emp_id
    AND leave_type_id = type_id
    AND year = target_year;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'process_leave_balance: no leave_balances row for employee %, type %, year %', emp_id, type_id, target_year;
  END IF;
END;
$$;

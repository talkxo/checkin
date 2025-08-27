-- Leave Management System Migration
-- This migration adds leave management functionality to the existing attendance system

-- Create leave types table
CREATE TABLE IF NOT EXISTS public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create leave balances table to track employee leave balances
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  total_entitlement integer NOT NULL DEFAULT 0,
  used_leaves integer NOT NULL DEFAULT 0,
  pending_leaves integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Create leave requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES public.employees(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create leave accrual history table to track bonus leave accruals
CREATE TABLE IF NOT EXISTS public.leave_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  extra_office_days integer NOT NULL DEFAULT 0,
  accrued_leaves integer NOT NULL DEFAULT 0,
  calculation_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year, month)
);

-- Insert default leave types
INSERT INTO public.leave_types (name, description) VALUES
  ('Privilege Leave', 'Standard annual privilege leaves'),
  ('Sick Leave', 'Medical and health-related leaves'),
  ('Bonus Leave', 'Leaves earned from extra office attendance')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS leave_balances_emp_year_idx ON public.leave_balances(employee_id, year);
CREATE INDEX IF NOT EXISTS leave_requests_emp_status_idx ON public.leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS leave_requests_date_range_idx ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS leave_accruals_emp_year_month_idx ON public.leave_accruals(employee_id, year, month);

-- Enable RLS on new tables
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_accruals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY leave_types_read ON public.leave_types FOR SELECT USING (true);
CREATE POLICY leave_balances_read ON public.leave_balances FOR SELECT USING (true);
CREATE POLICY leave_balances_insert ON public.leave_balances FOR INSERT WITH CHECK (true);
CREATE POLICY leave_balances_update ON public.leave_balances FOR UPDATE USING (true);
CREATE POLICY leave_requests_read ON public.leave_requests FOR SELECT USING (true);
CREATE POLICY leave_requests_insert ON public.leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY leave_requests_update ON public.leave_requests FOR UPDATE USING (true);
CREATE POLICY leave_accruals_read ON public.leave_accruals FOR SELECT USING (true);
CREATE POLICY leave_accruals_insert ON public.leave_accruals FOR INSERT WITH CHECK (true);

-- Function to calculate extra office days for an employee in a given month
CREATE OR REPLACE FUNCTION public.calculate_extra_office_days(
  emp_id uuid,
  target_year integer,
  target_month integer
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  expected_office_days integer := 12; -- 3 days per week * 4 weeks
  actual_office_days integer;
BEGIN
  -- Count actual office days in the month
  SELECT COUNT(DISTINCT DATE(checkin_ts))
  INTO actual_office_days
  FROM public.sessions
  WHERE employee_id = emp_id
    AND mode = 'office'
    AND EXTRACT(YEAR FROM checkin_ts) = target_year
    AND EXTRACT(MONTH FROM checkin_ts) = target_month
    AND checkout_ts IS NOT NULL; -- Only count completed sessions
    
  -- Return extra days (can be negative if less than expected)
  RETURN GREATEST(0, actual_office_days - expected_office_days);
END;
$$;

-- Function to calculate bonus leaves based on extra office days
CREATE OR REPLACE FUNCTION public.calculate_bonus_leaves(
  extra_office_days integer
) RETURNS integer LANGUAGE plpgsql AS $$
BEGIN
  -- For every 3 extra office days, add 1 bonus leave
  -- Enforce yearly cap of 15 days
  RETURN LEAST(FLOOR(extra_office_days / 3.0), 15);
END;
$$;

-- Function to get employee leave balance
CREATE OR REPLACE FUNCTION public.get_employee_leave_balance(
  emp_id uuid,
  target_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS TABLE(
  leave_type_name text,
  total_entitlement integer,
  used_leaves integer,
  pending_leaves integer,
  available_leaves integer
) LANGUAGE sql STABLE AS $$
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
$$;

-- Function to process monthly leave accrual
CREATE OR REPLACE FUNCTION public.process_monthly_leave_accrual(
  target_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  target_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  emp_record RECORD;
  extra_days integer;
  bonus_leaves integer;
  bonus_leave_type_id uuid;
BEGIN
  -- Get bonus leave type ID
  SELECT id INTO bonus_leave_type_id FROM public.leave_types WHERE name = 'Bonus Leave';
  
  -- Process each employee
  FOR emp_record IN SELECT id FROM public.employees WHERE active = true
  LOOP
    -- Calculate extra office days
    extra_days := public.calculate_extra_office_days(emp_record.id, target_year, target_month);
    
    -- Calculate bonus leaves
    bonus_leaves := public.calculate_bonus_leaves(extra_days);
    
    -- Insert or update accrual record
    INSERT INTO public.leave_accruals (
      employee_id, leave_type_id, year, month, 
      extra_office_days, accrued_leaves, calculation_date
    ) VALUES (
      emp_record.id, bonus_leave_type_id, target_year, target_month,
      extra_days, bonus_leaves, CURRENT_DATE
    ) ON CONFLICT (employee_id, leave_type_id, year, month)
    DO UPDATE SET
      extra_office_days = EXCLUDED.extra_office_days,
      accrued_leaves = EXCLUDED.accrued_leaves,
      calculation_date = EXCLUDED.calculation_date;
    
    -- Update leave balance if bonus leaves were earned
    IF bonus_leaves > 0 THEN
      INSERT INTO public.leave_balances (
        employee_id, leave_type_id, year, total_entitlement
      ) VALUES (
        emp_record.id, bonus_leave_type_id, target_year, bonus_leaves
      ) ON CONFLICT (employee_id, leave_type_id, year)
      DO UPDATE SET
        total_entitlement = public.leave_balances.total_entitlement + EXCLUDED.total_entitlement,
        updated_at = CURRENT_TIMESTAMP;
    END IF;
  END LOOP;
END;
$$;

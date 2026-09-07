-- Leave Management System Migration
-- Adds leave types, balances, requests, and accruals

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
CREATE POLICY leave_accruals_update ON public.leave_accruals FOR UPDATE USING (true);

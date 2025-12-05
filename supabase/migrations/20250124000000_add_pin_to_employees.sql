-- Add pin_hash column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Add pin_change_required column to track if user needs to change PIN on first login
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pin_change_required BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN employees.pin_hash IS 'Bcrypt hash of 4-digit PIN for employee authentication';
COMMENT ON COLUMN employees.pin_change_required IS 'Set to true if user must change PIN on first login (e.g., default PIN)';


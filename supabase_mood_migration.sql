-- Add mood tracking columns to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS mood text CHECK (mood IN ('great', 'good', 'challenging', 'exhausted', 'productive')),
ADD COLUMN IF NOT EXISTS mood_comment text;

-- Add index for mood analysis
CREATE INDEX IF NOT EXISTS sessions_mood_idx ON public.sessions(mood, checkin_ts);

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.mood IS 'Employee mood at checkout: great, good, challenging, exhausted, productive';
COMMENT ON COLUMN public.sessions.mood_comment IS 'Optional comment about the day or mood';

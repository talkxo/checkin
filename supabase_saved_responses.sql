-- Create saved responses table
CREATE TABLE IF NOT EXISTS public.saved_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, -- Admin user identifier
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS saved_responses_user_id_idx ON public.saved_responses(user_id);
CREATE INDEX IF NOT EXISTS saved_responses_tags_idx ON public.saved_responses USING GIN(tags);
CREATE INDEX IF NOT EXISTS saved_responses_created_at_idx ON public.saved_responses(created_at);

-- Enable RLS
ALTER TABLE public.saved_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY saved_responses_read ON public.saved_responses FOR SELECT USING (true);
CREATE POLICY saved_responses_insert ON public.saved_responses FOR INSERT WITH CHECK (true);
CREATE POLICY saved_responses_update ON public.saved_responses FOR UPDATE USING (true);
CREATE POLICY saved_responses_delete ON public.saved_responses FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE public.saved_responses IS 'Saved AI chat responses for admin reference';
COMMENT ON COLUMN public.saved_responses.tags IS 'Array of tags for filtering and organization';

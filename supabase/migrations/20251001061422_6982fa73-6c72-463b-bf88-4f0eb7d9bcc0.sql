-- Update jobs table to track which user posted the job
ALTER TABLE public.jobs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to require authentication for posting jobs
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;

CREATE POLICY "Authenticated users can create jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Keep public viewing
-- "Anyone can view jobs" policy already exists
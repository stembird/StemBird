-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('employer', 'candidate', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (job_id, user_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_applications
CREATE POLICY "Users can view their own applications"
ON public.job_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view applications for their jobs"
ON public.job_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_applications.job_id
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all applications"
ON public.job_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidates can create applications"
ON public.job_applications FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.has_role(auth.uid(), 'candidate')
);

CREATE POLICY "Users can delete their own applications"
ON public.job_applications FOR DELETE
USING (auth.uid() = user_id);

-- Create saved_jobs table
CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (job_id, user_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_jobs
CREATE POLICY "Users can view their own saved jobs"
ON public.saved_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
ON public.saved_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
ON public.saved_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Update jobs table RLS policies
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;

CREATE POLICY "Employers and admins can create jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    public.has_role(auth.uid(), 'employer') 
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Employers can update their own jobs"
ON public.jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all jobs"
ON public.jobs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employers can delete their own jobs"
ON public.jobs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all jobs"
ON public.jobs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
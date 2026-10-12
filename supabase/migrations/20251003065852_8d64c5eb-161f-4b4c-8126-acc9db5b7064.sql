-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  industry TEXT,
  location TEXT,
  size TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Anyone can view companies"
  ON public.companies
  FOR SELECT
  USING (true);

CREATE POLICY "Employers can create their own company"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    has_role(auth.uid(), 'employer'::app_role)
  );

CREATE POLICY "Employers can update their own company"
  ON public.companies
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Employers can delete their own company"
  ON public.companies
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create any company"
  ON public.companies
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any company"
  ON public.companies
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any company"
  ON public.companies
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add company_id to jobs table
ALTER TABLE public.jobs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
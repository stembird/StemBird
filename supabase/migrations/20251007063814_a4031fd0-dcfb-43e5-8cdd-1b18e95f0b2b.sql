-- Fix function search path security warnings

-- Update generate_job_slug function with security definer and search_path
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.jobs WHERE job_slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.job_slug := final_slug;
  RETURN NEW;
END;
$$;

-- Update generate_job_identifier function with security definer and search_path
CREATE OR REPLACE FUNCTION public.generate_job_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.identifier IS NULL THEN
    NEW.identifier := NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$;
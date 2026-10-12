-- Allow admins to create multiple companies by removing unique constraint on user_id
-- and enforce uniqueness on company name (case-insensitive) to avoid duplicates.

-- Drop UNIQUE(user_id) constraint if it exists
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_key;

-- Add case-insensitive unique index on company name
CREATE UNIQUE INDEX IF NOT EXISTS companies_name_unique ON public.companies (LOWER(name));

-- Note: RLS policies already allow admins to insert any company.
-- Employers can still create their own company; multiple by same user_id are now allowed.


-- Allow Career Tools as an application method.
-- The original CHECK only permitted profile / cv / external, which rejects
-- job_applications rows created from Apply with Career Tools CV.

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_application_method_check;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_application_method_check
  CHECK (
    application_method IS NULL
    OR application_method IN ('profile', 'cv', 'external', 'career_tools')
  );

COMMENT ON COLUMN public.job_applications.application_method IS
  'How the candidate applied: profile, uploaded cv, career_tools builder PDF, or external.';

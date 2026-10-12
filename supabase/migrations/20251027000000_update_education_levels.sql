-- Update education levels with comprehensive list
BEGIN;

-- Clear existing education levels
DELETE FROM public.education_levels;

-- Insert comprehensive education levels
INSERT INTO public.education_levels (name, slug)
VALUES
  ('No Formal Education', 'no-formal-education'),
  ('Primary Certificate (KCPE / CBA)', 'primary-certificate'),
  ('Junior Secondary Certificate (Grade 9 / Equivalent)', 'junior-secondary'),
  ('KCSE / Senior Secondary Certificate', 'kcse'),
  ('Artisan Certificate / Trade Test', 'artisan-certificate'),
  ('Craft Certificate (Certificate Level)', 'craft-certificate'),
  ('Diploma', 'diploma'),
  ('Higher National Diploma (HND)', 'hnd'),
  ('Bachelor’s Degree', 'bachelors'),
  ('Postgraduate Diploma', 'postgraduate-diploma'),
  ('Master’s Degree', 'masters'),
  ('Doctorate (PhD)', 'phd'),
  ('Post-Doctoral / Professional Fellowship', 'post-doctoral')
ON CONFLICT (name) DO NOTHING;

COMMIT;
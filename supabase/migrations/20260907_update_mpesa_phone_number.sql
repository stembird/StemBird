-- Correct the default Send Money number to +254795564135.
UPDATE public.app_settings
SET value = replace(value, '254795565135', '254795564135'),
    updated_at = now()
WHERE key = 'mpesa_settings'
  AND value LIKE '%254795565135%';

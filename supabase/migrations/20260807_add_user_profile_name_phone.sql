-- Add signup name/phone fields to user_profiles and restore accurate signup dates.
-- The admin "Joined" column reads user_profiles.created_at, but the 20260614
-- candidate-profile backfill stamped every existing row with the migration
-- timestamp. Restore the real signup date from auth.users.

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Restore real signup dates from auth.users (safe to re-run)
UPDATE public.user_profiles up
SET created_at = au.created_at
FROM auth.users au
WHERE up.id = au.id
  AND up.created_at IS DISTINCT FROM au.created_at;

-- Backfill first/last name from full_name where it looks like a real name
UPDATE public.user_profiles
SET first_name = split_part(full_name, ' ', 1),
    last_name = NULLIF(substr(full_name, strpos(full_name, ' ') + 1), '')
WHERE full_name IS NOT NULL
  AND strpos(full_name, ' ') > 0
  AND (first_name IS NULL OR first_name = '');

-- Backfill phone from candidate_profiles where available
UPDATE public.user_profiles up
SET phone = cp.phone
FROM public.candidate_profiles cp
WHERE cp.user_id = up.id
  AND up.phone IS NULL
  AND cp.phone IS NOT NULL
  AND cp.phone <> '';

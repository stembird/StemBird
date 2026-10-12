-- Align user_profiles.role with canonical user_roles, and stop clients from
-- self-escalating via profile role updates or user_roles inserts.

BEGIN;

-- 1) Sync denormalized profile role from user_roles (admin > employer > candidate)
UPDATE public.user_profiles up
SET role = sub.primary_role,
    updated_at = NOW()
FROM (
  SELECT
    ur.user_id,
    CASE
      WHEN bool_or(ur.role = 'admin') THEN 'admin'
      WHEN bool_or(ur.role = 'employer') THEN 'employer'
      ELSE 'candidate'
    END AS primary_role
  FROM public.user_roles ur
  GROUP BY ur.user_id
) sub
WHERE up.id = sub.user_id
  AND COALESCE(up.role, '') IS DISTINCT FROM sub.primary_role;

-- 2) Prefer admin when get_user_role is used (was LIMIT 1 with no priority)
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
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'employer' THEN 2
    ELSE 3
  END
  LIMIT 1;
$$;

-- 3) Block non-admin clients from changing user_profiles.role
CREATE OR REPLACE FUNCTION public.prevent_user_profiles_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Updating user_profiles.role is not allowed';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Creating an admin user_profiles row is not allowed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_profiles_role_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profiles_role_escalation
  BEFORE INSERT OR UPDATE OF role ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profiles_role_escalation();

-- 4) Block authenticated clients from inserting an admin row into user_roles.
-- Signup trigger is SECURITY DEFINER so it still works.
CREATE OR REPLACE FUNCTION public.prevent_user_roles_admin_self_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'
     AND auth.role() = 'authenticated'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Granting admin role is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_roles_admin_self_grant ON public.user_roles;
CREATE TRIGGER trg_prevent_user_roles_admin_self_grant
  BEFORE INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_roles_admin_self_grant();

-- 5) Signup metadata must never self-assign admin
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested text;
  assigned public.app_role;
BEGIN
  requested := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'));
  IF requested IN ('employer', 'candidate') THEN
    assigned := requested::public.app_role;
  ELSE
    assigned := 'candidate'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 6) Optional: ensure known CareerSasa admin accounts stay admins.
-- Safe to re-run. Uses auth.users emails (service-role / SQL editor only).
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::public.app_role
FROM auth.users au
WHERE lower(au.email) IN (
  'ejuma90@gmail.com',
  'comfonex@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.user_profiles up
SET role = 'admin',
    updated_at = NOW()
FROM auth.users au
WHERE up.id = au.id
  AND lower(au.email) IN (
    'ejuma90@gmail.com',
    'comfonex@gmail.com'
  )
  AND COALESCE(up.role, '') IS DISTINCT FROM 'admin';

COMMIT;

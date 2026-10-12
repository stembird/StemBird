-- ############################################################################
-- ⚠⚠⚠  DANGER — READ FIRST  ⚠⚠⚠
-- This DROPS everything in the `public` schema (tables, views, matviews,
-- sequences, enum/domain types, and functions). Run it ONLY on the EMPTY new
-- project (qhfdjccudtqnlkbtsjgg) to clear the partial schema left by the
-- failed run. NEVER run it on a project that holds real data.
--
-- After this succeeds, run SCHEMA-FRESH-INSTALL.sql.
-- ############################################################################

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relkind, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  LOOP
    EXECUTE format('DROP %s IF EXISTS public.%I CASCADE',
      CASE r.relkind
        WHEN 'r' THEN 'TABLE'
        WHEN 'p' THEN 'TABLE'
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'S' THEN 'SEQUENCE'
        WHEN 'f' THEN 'FOREIGN TABLE'
      END, r.relname);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  -- Enum / domain types not bound to a (now-dropped) table.
  FOR r IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'd')
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END $$;

-- Sanity check: should return 0 rows (public schema is empty again).
SELECT c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'S');

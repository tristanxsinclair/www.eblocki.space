
-- Revoke EXECUTE from anon/public on all SECURITY DEFINER functions in public schema.
-- Keep has_role executable by authenticated (used by RLS policies).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.name, r.args);
  END LOOP;
END $$;

-- Re-grant only what the app needs from a signed-in client.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Migration: set owner for SECURE functions to admin role to ensure SECURITY DEFINER bypasses RLS
-- Date: 2025-11-13
-- NOTE: Replace 'supabase_admin' with your actual admin role if different.

DO $$
BEGIN
  -- share_client_to_cabinet_with_url(uuid, uuid, text, text, text, text)
  IF EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.proname = 'share_client_to_cabinet_with_url'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.share_client_to_cabinet_with_url(uuid, uuid, text, text, text, text) OWNER TO supabase_admin';
    EXCEPTION WHEN undefined_function THEN
      -- ignore if signature differs or function missing
      RAISE NOTICE 'share_client_to_cabinet_with_url not altered (not found with expected signature)';
    END;
  END IF;

  -- share_client_to_cabinet(uuid, uuid, uuid)
  IF EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.proname = 'share_client_to_cabinet'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.share_client_to_cabinet(uuid, uuid, uuid) OWNER TO supabase_admin';
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'share_client_to_cabinet not altered (not found with expected signature)';
    END;
  END IF;

  -- get_cabinet_clients(uuid)
  IF EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.proname = 'get_cabinet_clients'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.get_cabinet_clients(uuid) OWNER TO supabase_admin';
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'get_cabinet_clients not altered (not found with expected signature)';
    END;
  END IF;

  -- get_cabinet_client_details(uuid)
  IF EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.proname = 'get_cabinet_client_details'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.get_cabinet_client_details(uuid) OWNER TO supabase_admin';
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'get_cabinet_client_details not altered (not found with expected signature)';
    END;
  END IF;

END$$;

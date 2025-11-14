-- Migration: add RPC to share a client into a cabinet
-- Date: 2025-11-12

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.share_client_to_cabinet(
  p_client_id uuid,
  p_cabinet_id uuid,
  p_shared_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Sharing disabled: share_client_to_cabinet has been removed.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_client_to_cabinet(uuid, uuid, uuid) TO authenticated;

-- Notes:
-- - This function is idempotent and uses SECURITY DEFINER; consider setting the owner to an admin role
--   in your Supabase project so it can bypass RLS safely when needed.

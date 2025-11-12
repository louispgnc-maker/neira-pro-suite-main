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
DECLARE
  v_id uuid;
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.cabinet_clients (id, cabinet_id, client_id, shared_by, shared_at, created_at, updated_at)
  VALUES (gen_random_uuid(), p_cabinet_id, p_client_id, p_shared_by, v_now, v_now, v_now)
  ON CONFLICT (client_id, cabinet_id) DO UPDATE
    SET shared_by = EXCLUDED.shared_by,
        shared_at = EXCLUDED.shared_at,
        updated_at = v_now
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.cabinet_clients WHERE client_id = p_client_id AND cabinet_id = p_cabinet_id LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_client_to_cabinet(uuid, uuid, uuid) TO authenticated;

-- Notes:
-- - This function is idempotent and uses SECURITY DEFINER; consider setting the owner to an admin role
--   in your Supabase project so it can bypass RLS safely when needed.

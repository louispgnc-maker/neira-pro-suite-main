-- Migration: make share_client_to_cabinet_with_url accept multiple param names for compatibility
-- Date: 2025-11-13

BEGIN;

-- Replace function to accept either p_cabinet_id / p_client_id or cabinet_id_param / client_id_param
DROP FUNCTION IF EXISTS public.share_client_to_cabinet_with_url(uuid, uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION public.share_client_to_cabinet_with_url(
  p_cabinet_id uuid DEFAULT NULL,
  cabinet_id_param uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  client_id_param uuid DEFAULT NULL,
  file_url_param text DEFAULT NULL,
  description_param text DEFAULT NULL,
  file_name_param text DEFAULT NULL,
  file_type_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cabinet_id uuid := COALESCE(p_cabinet_id, cabinet_id_param);
  v_client_id uuid := COALESCE(p_client_id, client_id_param);
  v_shared_id uuid;
  v_now timestamptz := now();
BEGIN
  IF v_cabinet_id IS NULL OR v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing cabinet or client id';
  END IF;

  -- Vérifie que l'appelant est un membre actif du cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = v_cabinet_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this cabinet';
  END IF;

  INSERT INTO public.cabinet_clients (
    cabinet_id, client_id, shared_by, shared_at, created_at, updated_at, file_url, file_name, file_type, description
  ) VALUES (
    v_cabinet_id, v_client_id, auth.uid(), v_now, v_now, v_now, file_url_param, COALESCE(file_name_param, ''), COALESCE(file_type_param, ''), description_param
  )
  ON CONFLICT (client_id, cabinet_id) DO UPDATE
    SET shared_by = EXCLUDED.shared_by,
        shared_at = EXCLUDED.shared_at,
        updated_at = v_now,
        file_url = EXCLUDED.file_url,
        file_name = EXCLUDED.file_name,
        file_type = EXCLUDED.file_type,
        description = EXCLUDED.description
  RETURNING id INTO v_shared_id;

  IF v_shared_id IS NULL THEN
    SELECT id INTO v_shared_id FROM public.cabinet_clients WHERE client_id = v_client_id AND cabinet_id = v_cabinet_id LIMIT 1;
  END IF;

  RETURN v_shared_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_client_to_cabinet_with_url(uuid, uuid, uuid, uuid, text, text, text, text) TO authenticated;

COMMIT;

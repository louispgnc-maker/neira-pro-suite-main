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
BEGIN
  RAISE EXCEPTION 'Sharing disabled: share_client_to_cabinet_with_url has been removed.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_client_to_cabinet_with_url(uuid, uuid, uuid, uuid, text, text, text, text) TO authenticated;

COMMIT;

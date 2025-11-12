-- Migration: make get_cabinet_clients_with_names accept both p_cabinet_id and cabinet_id_param for compatibility
-- Date: 2025-11-13

BEGIN;

-- Replace function to accept both parameter names (both optional) and use the first non-null value.
DROP FUNCTION IF EXISTS public.get_cabinet_clients_with_names(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_cabinet_clients_with_names(
  p_cabinet_id uuid DEFAULT NULL,
  cabinet_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  name text,
  prenom text,
  nom text,
  shared_at timestamptz,
  shared_by uuid,
  file_url text,
  file_name text,
  file_type text,
  raw_profile jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cabinet_id uuid := COALESCE(p_cabinet_id, cabinet_id_param);
BEGIN
  IF v_cabinet_id IS NULL THEN
    RAISE EXCEPTION 'Missing cabinet id';
  END IF;

  -- Ensure caller is an active member of the cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = v_cabinet_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this cabinet';
  END IF;

  RETURN QUERY
  SELECT
    cc.id,
    cc.client_id,
    COALESCE(
      NULLIF(p.full_name, ''),
      NULLIF(TRIM(CONCAT_WS(' ', p.prenom, p.nom)), ''),
      NULLIF(NULLIF(c.name, ''), NULL),
      NULLIF(NULLIF(c.full_name, ''), NULL),
      NULLIF(TRIM(CONCAT_WS(' ', c.prenom, c.nom)), ''),
      cc.client_id::text
    )::text AS name,
    p.prenom,
    p.nom,
    cc.shared_at,
    cc.shared_by,
    cc.file_url,
    cc.file_name,
    cc.file_type,
    to_jsonb(p.*) - 'password'
  FROM public.cabinet_clients cc
  LEFT JOIN public.clients c ON c.id = cc.client_id
  LEFT JOIN public.profiles p ON p.id = cc.client_id
  WHERE cc.cabinet_id = v_cabinet_id
  ORDER BY cc.shared_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cabinet_clients_with_names(uuid, uuid) TO authenticated;

COMMIT;

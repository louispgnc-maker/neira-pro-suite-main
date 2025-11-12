-- Migration: add RPC get_cabinet_clients_with_names to return cabinet_clients with a normalized display name
-- Date: 2025-11-13

BEGIN;

-- Return a stable normalized name for each cabinet_client row so the frontend
-- doesn't need to guess fields or perform additional RPC calls per row.
-- The function checks that the caller is an active member of the cabinet.
DROP FUNCTION IF EXISTS public.get_cabinet_clients_with_names(uuid);
CREATE OR REPLACE FUNCTION public.get_cabinet_clients_with_names(
  p_cabinet_id uuid
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
BEGIN
  -- Ensure caller is an active member of the cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = p_cabinet_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this cabinet';
  END IF;

  RETURN QUERY
  SELECT
    cc.id,
    cc.client_id,
    -- Priority for display name:
    -- 1. profile.full_name
    -- 2. profile.prenom + ' ' + profile.nom
    -- 3. clients.name or clients.full_name
    -- 4. clients.prenom + ' ' + clients.nom
    -- 5. fallback to client_id
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
    -- expose profile for debugging (omit sensitive fields if present in your schema)
    to_jsonb(p.*) - 'password'
  FROM public.cabinet_clients cc
  LEFT JOIN public.clients c ON c.id = cc.client_id
  LEFT JOIN public.profiles p ON p.id = cc.client_id
  WHERE cc.cabinet_id = p_cabinet_id
  ORDER BY cc.shared_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cabinet_clients_with_names(uuid) TO authenticated;

COMMIT;

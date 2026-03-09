-- Créer la fonction RPC get_cabinet_clients_with_names
DROP FUNCTION IF EXISTS public.get_cabinet_clients_with_names(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_cabinet_clients_with_names(uuid);

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
  v_cabinet_id uuid;
BEGIN
  -- Accepte les deux paramètres pour compatibilité
  v_cabinet_id := COALESCE(p_cabinet_id, cabinet_id_param);

  IF v_cabinet_id IS NULL THEN
    RAISE EXCEPTION 'cabinet_id requis';
  END IF;

  -- Vérifie que l'appelant est un membre actif du cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = v_cabinet_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Non membre de ce cabinet';
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

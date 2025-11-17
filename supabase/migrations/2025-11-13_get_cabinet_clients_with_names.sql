-- Migration : ajouter la RPC get_cabinet_clients_with_names pour renvoyer les lignes de cabinet_clients
-- avec un nom affiché normalisé
-- Date : 2025-11-13

BEGIN;

-- Retourne un nom affiché stable et normalisé pour chaque ligne cabinet_client afin que
-- le frontend n'ait pas à deviner les champs ni à effectuer des appels RPC par ligne.
-- La fonction vérifie que l'appelant est un membre actif du cabinet.
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
  -- Vérifie que l'appelant est un membre actif du cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = p_cabinet_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Non membre de ce cabinet';
  END IF;

  RETURN QUERY
  SELECT
    cc.id,
    cc.client_id,
  -- Priorité pour le nom affiché :
  -- 1. profile.full_name
  -- 2. profile.prenom + ' ' + profile.nom
  -- 3. clients.name ou clients.full_name
  -- 4. clients.prenom + ' ' + clients.nom
  -- 5. sinon, fallback sur client_id
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
  -- expose le profil pour le débogage (omettez les champs sensibles si présents dans votre schéma)
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

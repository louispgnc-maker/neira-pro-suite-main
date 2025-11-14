-- Migration : ajouter les champs file_url à cabinet_clients et RPC pour créer cabinet_clients avec une URL publique fournie
-- Date : 2025-11-13

BEGIN;

-- Ajouter des métadonnées de fichier optionnelles à cabinet_clients afin de pouvoir stocker une URL de copie partagée (comme cabinet_documents)
ALTER TABLE public.cabinet_clients
  ADD COLUMN IF NOT EXISTS file_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_type text DEFAULT NULL;

COMMIT;


BEGIN;

DROP FUNCTION IF EXISTS public.share_client_to_cabinet_with_url(uuid, uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION public.share_client_to_cabinet_with_url(
  cabinet_id_param uuid,
  client_id_param uuid,
  file_url_param text,
  description_param text default null,
  file_name_param text default null,
  file_type_param text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_shared_id uuid;
BEGIN
  RAISE EXCEPTION 'Sharing disabled: share_client_to_cabinet_with_url has been removed.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_client_to_cabinet_with_url(uuid, uuid, text, text, text, text) TO authenticated;

COMMIT;

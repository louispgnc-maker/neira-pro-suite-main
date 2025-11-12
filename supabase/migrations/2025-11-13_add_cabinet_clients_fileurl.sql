-- Migration : ajouter les champs file_url à cabinet_clients et RPC pour créer cabinet_clients avec une URL publique fournie
-- Date : 2025-11-13

BEGIN;

-- Ajouter des métadonnées de fichier optionnelles à cabinet_clients afin de pouvoir stocker une URL de copie partagée (comme cabinet_documents)
ALTER TABLE public.cabinet_clients
  ADD COLUMN IF NOT EXISTS file_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_type text DEFAULT NULL;

COMMIT;

-- RPC : insérer une ligne dans cabinet_clients, en utilisant une URL publique de fichier fournie (pour les fichiers attachés au client)
-- Cela reflète le modèle share_document_to_cabinet_with_url : le frontend téléverse/copier le
-- fichier dans un bucket partagé/public puis appelle cette RPC pour créer l'entrée au niveau du cabinet.

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
  v_now timestamptz := now();
begin
  -- Vérifie que l'appelant est un membre actif du cabinet
  if not exists (
    select 1 from cabinet_members
    where cabinet_id = cabinet_id_param
      and user_id = auth.uid()
      and status = 'active'
  ) then
  raise exception 'Pas membre de ce cabinet';
  end if;

  insert into public.cabinet_clients (
    cabinet_id, client_id, shared_by, shared_at, created_at, updated_at, file_url, file_name, file_type
  ) values (
    cabinet_id_param, client_id_param, auth.uid(), v_now, v_now, v_now, file_url_param, coalesce(file_name_param, ''), coalesce(file_type_param, '')
  )
  ON CONFLICT (client_id, cabinet_id) DO UPDATE
    SET shared_by = EXCLUDED.shared_by,
        shared_at = EXCLUDED.shared_at,
        updated_at = v_now,
        file_url = EXCLUDED.file_url,
        file_name = EXCLUDED.file_name,
        file_type = EXCLUDED.file_type
  RETURNING id INTO v_shared_id;

  IF v_shared_id IS NULL THEN
    SELECT id INTO v_shared_id FROM public.cabinet_clients WHERE client_id = client_id_param AND cabinet_id = cabinet_id_param LIMIT 1;
  END IF;

  return v_shared_id;
end;
$$;

GRANT EXECUTE ON FUNCTION public.share_client_to_cabinet_with_url(uuid, uuid, text, text, text, text) TO authenticated;

COMMIT;

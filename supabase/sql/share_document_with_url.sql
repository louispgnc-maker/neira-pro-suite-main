-- Insère une ligne dans la table cabinet_documents en utilisant une file_url publique fournie
-- Cela permet au client d'uploader d'abord dans un bucket partagé/public, puis d'appeler cette RPC
-- afin que l'entrée partagée soit immédiatement visible par les autres membres.

-- Sharing RPC removed: this function previously created a cabinet_documents row from a public file URL.
-- To fully disable sharing, the implementation is replaced with a stub that raises an explicit error.

BEGIN;

DROP FUNCTION IF EXISTS public.share_document_to_cabinet_with_url(uuid, uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.share_document_to_cabinet_with_url(
  cabinet_id_param uuid,
  document_id_param uuid,
  title_param text,
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
BEGIN
  RAISE EXCEPTION 'Sharing disabled: share_document_to_cabinet_with_url has been removed.';
END;
$$;

COMMIT;

-- Insère une ligne dans la table cabinet_documents en utilisant une file_url publique fournie
-- Cela permet au client d'uploader d'abord dans un bucket partagé/public, puis d'appeler cette RPC
-- afin que l'entrée partagée soit immédiatement visible par les autres membres.

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
declare
  v_shared_doc_id uuid;
begin
  -- Vérifier que l'utilisateur est membre actif du cabinet
  if not exists (
    select 1 from cabinet_members
    where cabinet_id = cabinet_id_param
      and user_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'Not a member of this cabinet';
  end if;

  -- Optionnel : vérifier que le document existe et appartient à l'utilisateur (au mieux)
  -- Si document_id_param est null ou n'appartient pas à l'appelant, nous autorisons néanmoins l'insertion
  -- pour supporter les uploads directs où la propriété peut différer.

  insert into cabinet_documents (
    cabinet_id, document_id, title, description,
    file_url, file_name, file_type, shared_by
  ) values (
    cabinet_id_param, document_id_param, title_param, description_param,
    file_url_param, coalesce(file_name_param, ''), coalesce(file_type_param, ''), auth.uid()
  ) returning id into v_shared_doc_id;

  return v_shared_doc_id;
end;
$$;

COMMIT;

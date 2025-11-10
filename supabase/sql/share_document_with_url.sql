-- Insert a cabinet_documents row using a provided public file_url
-- This lets the client upload to a shared/public bucket first, then call this RPC
-- so the shared entry is immediately viewable by other members.

BEGIN;

DROP FUNCTION IF EXISTS public.share_document_to_cabinet_with_url(uuid, uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.share_document_to_cabinet_with_url(
  cabinet_id_param uuid,
  document_id_param uuid,
  title_param text,
  description_param text default null,
  file_url_param text,
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

  -- Optionnel : ensure document exists and belongs to user (best-effort)
  -- If document_id_param is null or not owned by caller, we still allow insertion
  -- to support direct uploads where ownership may differ.

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

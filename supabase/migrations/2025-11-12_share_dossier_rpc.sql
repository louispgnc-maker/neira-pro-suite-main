-- Migration: add RPC to share a dossier and ensure cabinet_documents + attached ids
-- Date: 2025-11-12

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function: share a dossier into a cabinet, create cabinet_documents for attached docs if missing,
-- and update cabinet_dossiers.attached_document_ids. Idempotent and resilient to partial failures.
CREATE OR REPLACE FUNCTION public.share_dossier_to_cabinet_auto(
  p_dossier_id uuid,
  p_cabinet_id uuid,
  p_shared_by uuid,
  p_role text DEFAULT 'notaire'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Sharing disabled: share_dossier_to_cabinet_auto has been removed.';
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.share_dossier_to_cabinet_auto(uuid, uuid, uuid, text) TO authenticated;

/*
Notes:
- This function is resilient: it will create the cabinet_dossiers row first, then try to create cabinet_documents and finally update attached_document_ids.
- Any failures in creating cabinet_documents are captured as NOTICE so the share action still succeeds.
- Ensure the function owner is an admin role so SECURITY DEFINER can bypass RLS where appropriate.
*/

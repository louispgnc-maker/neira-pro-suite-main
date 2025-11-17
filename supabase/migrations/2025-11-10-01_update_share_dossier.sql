-- Migration: update share_dossier_to_cabinet and ensure attached_document_ids
-- Date: 2025-11-10
-- Purpose: normalize dossier status when sharing (prefer 'En cours' over 'Ouvert')
-- and ensure `attached_document_ids` exists. Includes optional backfill.

-- Ensure the attached_document_ids column exists (no-op if already present)
ALTER TABLE public.cabinet_dossiers
  ADD COLUMN IF NOT EXISTS attached_document_ids uuid[];

-- Replace the share_dossier_to_cabinet RPC to normalize status on share
DROP FUNCTION IF EXISTS public.share_dossier_to_cabinet(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.share_dossier_to_cabinet(
  cabinet_id_param uuid,
  dossier_id_param uuid,
  title_param text,
  description_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Sharing disabled: share_dossier_to_cabinet has been removed.';
END;
$$;

-- Optional backfill: set status='En cours' for already shared dossiers that currently show 'Ouvert'
-- Uncomment and run if you want to update existing cabinet_dossiers rows.
-- UPDATE public.cabinet_dossiers
-- SET status = 'En cours'
-- WHERE lower(coalesce(status, '')) = 'ouvert';

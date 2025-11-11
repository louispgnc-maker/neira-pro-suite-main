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
DECLARE
  v_shared_dossier_id uuid;
  v_status text;
BEGIN
  -- Vérifier que l'utilisateur est membre actif du cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = cabinet_id_param
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this cabinet';
  END IF;

  -- Récupérer les infos du dossier
  SELECT status
  INTO v_status
  FROM dossiers
  WHERE id = dossier_id_param AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dossier not found or access denied';
  END IF;

  -- Créer le dossier partagé
  INSERT INTO cabinet_dossiers (
    cabinet_id, dossier_id, title, description,
    status, shared_by
  ) VALUES (
    cabinet_id_param, dossier_id_param, title_param, description_param,
    -- normalize status: prefer 'En cours' rather than 'Ouvert' for shared items
    CASE WHEN lower(coalesce(v_status,'')) = 'ouvert' THEN 'En cours' ELSE v_status END,
    auth.uid()
  ) RETURNING id INTO v_shared_dossier_id;

  RETURN v_shared_dossier_id;
END;
$$;

-- Optional backfill: set status='En cours' for already shared dossiers that currently show 'Ouvert'
-- Uncomment and run if you want to update existing cabinet_dossiers rows.
-- UPDATE public.cabinet_dossiers
-- SET status = 'En cours'
-- WHERE lower(coalesce(status, '')) = 'ouvert';

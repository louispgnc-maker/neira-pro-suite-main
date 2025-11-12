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
DECLARE
  v_id uuid;
  v_now timestamptz := now();
BEGIN
  -- Insert or update the cabinet_dossiers row (idempotent)
  INSERT INTO public.cabinet_dossiers (
    id, cabinet_id, dossier_id, shared_by, shared_at, created_at, updated_at, attached_document_ids
  ) VALUES (
    gen_random_uuid(), p_cabinet_id, p_dossier_id, p_shared_by, v_now, v_now, v_now, '{}'::uuid[]
  )
  ON CONFLICT (dossier_id, cabinet_id) DO UPDATE
    SET shared_by = EXCLUDED.shared_by,
        shared_at = EXCLUDED.shared_at,
        updated_at = v_now
  RETURNING id INTO v_id;

  -- Fallback: if not returned, fetch existing id
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.cabinet_dossiers
    WHERE dossier_id = p_dossier_id AND cabinet_id = p_cabinet_id
    LIMIT 1;
  END IF;

  -- Attempt to create cabinet_documents for documents attached to the dossier but not yet shared.
  -- This is wrapped in an EXCEPTION block to avoid failing the whole share if some inserts are blocked by RLS/constraints.
  BEGIN
    -- Insert missing cabinet_documents for this cabinet/dossier
    INSERT INTO public.cabinet_documents (id, cabinet_id, document_id, shared_by, shared_at, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      p_cabinet_id,
      dd.document_id,
      p_shared_by,
      v_now,
      v_now,
      v_now
    FROM public.dossier_documents dd
    LEFT JOIN public.cabinet_documents cd
      ON cd.document_id = dd.document_id AND cd.cabinet_id = p_cabinet_id
    WHERE dd.dossier_id = p_dossier_id
      AND cd.id IS NULL
    ON CONFLICT DO NOTHING; -- in case of race

  EXCEPTION WHEN others THEN
    -- Log a notice and continue: inability to create cabinet_documents should not prevent sharing the dossier
    RAISE NOTICE 'share_dossier_to_cabinet_auto: warning while creating cabinet_documents for dossier %: %', p_dossier_id, SQLERRM;
  END;

  -- Aggregate any cabinet_documents that reference documents of this dossier and update attached_document_ids
  BEGIN
    WITH agg AS (
      SELECT dd.dossier_id AS dossier_id, array_agg(DISTINCT cd.id) AS ids
      FROM public.cabinet_documents cd
      JOIN public.dossier_documents dd ON cd.document_id = dd.document_id
      WHERE dd.dossier_id = p_dossier_id AND cd.cabinet_id = p_cabinet_id
      GROUP BY dd.dossier_id
    )
    UPDATE public.cabinet_dossiers tgt
    SET attached_document_ids = COALESCE(agg.ids, '{}'::uuid[])
    FROM agg
    WHERE tgt.dossier_id = agg.dossier_id AND tgt.cabinet_id = p_cabinet_id
      AND (tgt.attached_document_ids IS DISTINCT FROM COALESCE(agg.ids, '{}'::uuid[]));
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'share_dossier_to_cabinet_auto: warning while aggregating attached ids for dossier %: %', p_dossier_id, SQLERRM;
  END;

  -- Attempt to create cabinet_clients for clients attached to the dossier
  BEGIN
    INSERT INTO public.cabinet_clients (id, cabinet_id, client_id, shared_by, shared_at, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      p_cabinet_id,
      dc.client_id,
      p_shared_by,
      v_now,
      v_now,
      v_now
    FROM public.dossier_clients dc
    LEFT JOIN public.cabinet_clients cc
      ON cc.client_id = dc.client_id AND cc.cabinet_id = p_cabinet_id
    WHERE dc.dossier_id = p_dossier_id
      AND cc.id IS NULL
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'share_dossier_to_cabinet_auto: warning while creating cabinet_clients for dossier %: %', p_dossier_id, SQLERRM;
  END;

  -- Attempt to create cabinet_contrats for contrats attached to the dossier
  BEGIN
    INSERT INTO public.cabinet_contrats (id, cabinet_id, contrat_id, shared_by, shared_at, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      p_cabinet_id,
      dc.contrat_id,
      p_shared_by,
      v_now,
      v_now,
      v_now
    FROM public.dossier_contrats dc
    LEFT JOIN public.cabinet_contrats cc
      ON cc.contrat_id = dc.contrat_id AND cc.cabinet_id = p_cabinet_id
    WHERE dc.dossier_id = p_dossier_id
      AND cc.id IS NULL
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'share_dossier_to_cabinet_auto: warning while creating cabinet_contrats for dossier %: %', p_dossier_id, SQLERRM;
  END;

  RETURN v_id;
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

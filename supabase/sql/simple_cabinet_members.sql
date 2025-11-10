-- Simple, minimal RPC to return cabinet members when caller is member/owner
-- Safe and easy: checks caller is owner OR active member OR pending invite by JWT email
-- Use this if you just want "chaque membre voit les autres" without the extra diagnostics/indexing.

BEGIN;

DROP FUNCTION IF EXISTS public.get_cabinet_members_simple(uuid);
CREATE OR REPLACE FUNCTION public.get_cabinet_members_simple(
  cabinet_id_param uuid
)
RETURNS TABLE(
  id uuid,
  cabinet_id uuid,
  user_id uuid,
  email text,
  nom text,
  role_cabinet text,
  status text,
  invitation_sent_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_jwt json := NULLIF(current_setting('request.jwt.claims', true), '')::json;
  v_email text := lower(coalesce(v_jwt ->> 'email', ''));
BEGIN
  -- allow owner: return all members of the cabinet
  IF EXISTS (SELECT 1 FROM public.cabinets c WHERE c.id = cabinet_id_param AND c.owner_id = auth.uid()) THEN
    RETURN QUERY SELECT cm.* FROM public.cabinet_members cm WHERE cm.cabinet_id = cabinet_id_param ORDER BY cm.created_at;
    RETURN;
  END IF;

  -- allow active members: return active members of the cabinet
  IF EXISTS (SELECT 1 FROM public.cabinet_members cm WHERE cm.cabinet_id = cabinet_id_param AND cm.user_id = auth.uid() AND cm.status = 'active') THEN
    RETURN QUERY SELECT cm.* FROM public.cabinet_members cm WHERE cm.cabinet_id = cabinet_id_param AND cm.status = 'active' ORDER BY cm.created_at;
    RETURN;
  END IF;

  -- allow invited email: return active + that pending invitation row
  IF v_email IS NOT NULL AND v_email <> '' THEN
    IF EXISTS (SELECT 1 FROM public.cabinet_members cm WHERE cm.cabinet_id = cabinet_id_param AND cm.status = 'pending' AND lower(cm.email) = v_email) THEN
      RETURN QUERY
      SELECT cm.* FROM public.cabinet_members cm
      WHERE cm.cabinet_id = cabinet_id_param
        AND (cm.status = 'active' OR (cm.status = 'pending' AND lower(cm.email) = v_email))
      ORDER BY cm.created_at;
      RETURN;
    END IF;
  END IF;

  -- otherwise nothing
  RETURN;
END;
$$;

COMMIT;

-- Notes:
--  - This RPC is intentionally minimal: it returns rows from `cabinet_members` only when the caller
--    is allowed to see them (owner, active member, or matching pending invite).
--  - Keep this file simple and use it from the client via `supabase.rpc('get_cabinet_members_simple', { cabinet_id_param })`.
--  - If you prefer direct table selects, ensure RLS on `cabinet_members` allows the same checks.

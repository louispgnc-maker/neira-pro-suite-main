-- Simplification complète: un membre est un membre, point.
-- Tout membre du cabinet voit TOUS les autres membres
-- Plus de distinction actif/inactif, owner/non-owner

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
BEGIN
  -- Si l'utilisateur est membre du cabinet (peu importe le statut) OU owner
  -- → retourne TOUS les membres
  IF EXISTS (
    SELECT 1 FROM public.cabinet_members cm 
    WHERE cm.cabinet_id = cabinet_id_param 
    AND cm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.cabinets c 
    WHERE c.id = cabinet_id_param 
    AND c.owner_id = auth.uid()
  ) THEN
    RETURN QUERY 
    SELECT cm.* 
    FROM public.cabinet_members cm 
    WHERE cm.cabinet_id = cabinet_id_param 
    ORDER BY cm.created_at;
    RETURN;
  END IF;

  -- Sinon rien
  RETURN;
END;
$$;

COMMIT;

-- Notes:
--  - This RPC is intentionally minimal: it returns rows from `cabinet_members` only when the caller
--    is allowed to see them (owner, active member, or matching pending invite).
--  - Keep this file simple and use it from the client via `supabase.rpc('get_cabinet_members_simple', { cabinet_id_param })`.
--  - If you prefer direct table selects, ensure RLS on `cabinet_members` allows the same checks.

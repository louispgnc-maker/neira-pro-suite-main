-- Migration: add RPC to fetch client details for a cabinet_client (shared client)
-- Date: 2025-11-13

CREATE OR REPLACE FUNCTION public.get_cabinet_client_details(p_cabinet_client_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT to_jsonb(c.*) FROM public.clients c
  JOIN public.cabinet_clients cc ON cc.client_id = c.id
  WHERE cc.id = p_cabinet_client_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_cabinet_client_details(uuid) TO authenticated;

-- Note: This SECURITY DEFINER function returns the client row as JSONB so the frontend
-- can render the client fiche even when the original clients row is not directly readable
-- by the current user due to RLS. Consider setting the function owner to an admin role.

-- Get all clients belonging to a cabinet (not just shared ones)
-- Used for sharing documents to client spaces
-- Fix: use cabinet_clients junction table and correct column names
-- (profiles has first_name/last_name, clients has nom/prenom)

CREATE OR REPLACE FUNCTION public.get_all_cabinet_clients(
  p_cabinet_id uuid
)
RETURNS TABLE (
  id uuid,
  nom text,
  prenom text,
  email text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an active member of the cabinet
  IF NOT EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = p_cabinet_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this cabinet';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    c.id,
    COALESCE(c.nom, p.last_name, '') AS nom,
    COALESCE(c.prenom, p.first_name, '') AS prenom,
    COALESCE(c.email, p.email_pro) AS email,
    COALESCE(
      NULLIF(c.name, ''),
      NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
      NULLIF(TRIM(CONCAT_WS(' ', c.prenom, c.nom)), ''),
      c.id::text
    ) AS full_name
  FROM public.cabinet_clients cc
  INNER JOIN public.clients c ON c.id = cc.client_id
  LEFT JOIN public.profiles p ON p.id = c.id
  WHERE cc.cabinet_id = p_cabinet_id
  ORDER BY nom ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_cabinet_clients(uuid) TO authenticated;

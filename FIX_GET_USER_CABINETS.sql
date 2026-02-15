-- Recréer get_user_cabinets simplifié

DROP FUNCTION IF EXISTS get_user_cabinets();

CREATE FUNCTION get_user_cabinets()
RETURNS TABLE(
  id uuid,
  nom text,
  code_acces text,
  owner_id uuid,
  role text,
  raison_sociale text,
  adresse text,
  telephone text,
  email text,
  subscription_plan text,
  max_members integer,
  created_at timestamptz,
  updated_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT
    c.id,
    c.nom,
    c.code_acces,
    c.owner_id,
    c.role,
    c.raison_sociale,
    c.adresse,
    c.telephone,
    c.email,
    c.subscription_plan,
    c.max_members,
    c.created_at,
    c.updated_at,
    COALESCE(cm.status, 'active') as status
  FROM public.cabinets c
  LEFT JOIN public.cabinet_members cm ON cm.cabinet_id = c.id AND cm.user_id = auth.uid()
  WHERE c.owner_id = auth.uid()
     OR cm.user_id = auth.uid();
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_user_cabinets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cabinets() TO anon;

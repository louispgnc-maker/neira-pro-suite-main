-- Modifier la fonction get_cabinet_members_simple pour inclure first_name et last_name

-- D'abord supprimer l'ancienne version
DROP FUNCTION IF EXISTS get_cabinet_members_simple(uuid);

-- Recréer avec les nouveaux champs
CREATE OR REPLACE FUNCTION get_cabinet_members_simple(cabinet_id_param uuid)
RETURNS TABLE (
  id uuid,
  email text,
  nom text,
  first_name text,
  last_name text,
  role_cabinet text,
  status text,
  joined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.email,
    cm.nom,
    p.first_name,
    p.last_name,
    cm.role_cabinet,
    cm.status,
    cm.joined_at
  FROM cabinet_members cm
  LEFT JOIN profiles p ON cm.user_id = p.id
  WHERE cm.cabinet_id = cabinet_id_param
  ORDER BY 
    CASE cm.role_cabinet
      WHEN 'Fondateur' THEN 1
      WHEN 'Associé' THEN 2
      WHEN 'Avocat Associé' THEN 3
      WHEN 'Juriste' THEN 4
      ELSE 5
    END,
    cm.joined_at;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION get_cabinet_members_simple(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cabinet_members_simple(uuid) TO anon;

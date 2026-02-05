-- Fix permissions pour contact@neira.fr
-- 1. Mettre à jour le rôle dans profiles
-- 2. Mettre à jour le role_cabinet dans cabinet_members

-- Étape 1: Identifier l'utilisateur
DO $$
DECLARE
  v_user_id uuid;
  v_cabinet_id uuid;
BEGIN
  -- Trouver l'ID de l'utilisateur contact@neira.fr
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'contact@neira.fr';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Utilisateur contact@neira.fr non trouvé';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Utilisateur trouvé: %', v_user_id;
  
  -- Mettre à jour le rôle dans profiles (avocat ou notaire selon le choix)
  -- Vous pouvez changer 'avocat' en 'notaire' si nécessaire
  UPDATE profiles
  SET role = 'avocat'
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Profil mis à jour avec role = avocat';
  
  -- Trouver le cabinet de cet utilisateur
  SELECT cabinet_id INTO v_cabinet_id
  FROM cabinet_members
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_cabinet_id IS NULL THEN
    RAISE NOTICE 'Aucun cabinet trouvé pour cet utilisateur';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Cabinet trouvé: %', v_cabinet_id;
  
  -- Mettre à jour le role_cabinet en "Fondateur"
  UPDATE cabinet_members
  SET 
    role_cabinet = 'Fondateur',
    status = 'active',
    joined_at = COALESCE(joined_at, NOW())
  WHERE cabinet_id = v_cabinet_id
    AND user_id = v_user_id;
  
  RAISE NOTICE 'Permissions mises à jour: role_cabinet = Fondateur, status = active';
  
  -- Vérifier le résultat
  RAISE NOTICE '--- Résultat ---';
  PERFORM email, role_cabinet, status
  FROM cabinet_members
  WHERE user_id = v_user_id;
  
END $$;

-- Vérification finale
SELECT 
  u.email,
  p.role as "role_profile",
  cm.role_cabinet,
  cm.status,
  c.nom as "cabinet_name"
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN cabinet_members cm ON cm.user_id = u.id
LEFT JOIN cabinets c ON c.id = cm.cabinet_id
WHERE u.email = 'contact@neira.fr';

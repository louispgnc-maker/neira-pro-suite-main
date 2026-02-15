-- Vérifier les données du profil contact@neira.fr

-- 1. Vérifier dans auth.users
SELECT id, email, raw_user_meta_data
FROM auth.users 
WHERE email = 'contact@neira.fr';

-- 2. Vérifier dans profiles (par ID)
SELECT p.*, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'contact@neira.fr';

-- 3. Vérifier dans cabinet_members
SELECT cm.id, cm.email, cm.nom, cm.user_id, p.first_name, p.last_name
FROM cabinet_members cm
LEFT JOIN profiles p ON cm.user_id = p.id
WHERE cm.email = 'contact@neira.fr';

-- 4. Si le profil n'existe pas, le créer
INSERT INTO profiles (id, first_name, last_name, role, created_at, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'first_name', 'Louis'),
  COALESCE(raw_user_meta_data->>'last_name', 'Poignonec'),
  'avocat',
  created_at,
  updated_at
FROM auth.users
WHERE email = 'contact@neira.fr'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.users.id)
ON CONFLICT (id) DO UPDATE SET
  first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
  last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);

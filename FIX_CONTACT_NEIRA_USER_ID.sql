-- Vérifier pourquoi contact@neira.fr n'affiche pas le nom

-- 1. Voir le cabinet_member de contact@neira.fr
SELECT 
  cm.id,
  cm.email,
  cm.user_id,
  cm.nom,
  u.email as auth_email,
  p.first_name,
  p.last_name
FROM cabinet_members cm
LEFT JOIN auth.users u ON cm.user_id = u.id
LEFT JOIN profiles p ON cm.user_id = p.id
WHERE cm.email = 'contact@neira.fr';

-- 2. Mettre à jour le user_id si nécessaire
UPDATE cabinet_members
SET user_id = (SELECT id FROM auth.users WHERE email = 'contact@neira.fr')
WHERE email = 'contact@neira.fr'
  AND (user_id IS NULL OR user_id != (SELECT id FROM auth.users WHERE email = 'contact@neira.fr'));

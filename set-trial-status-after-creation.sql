-- Mettre à jour le cabinet nouvellement créé en période d'essai
UPDATE cabinets
SET 
  subscription_status = 'trial',
  subscription_started_at = NOW(),
  subscription_expires_at = NOW() + INTERVAL '7 days',
  subscription_plan = 'essentiel'
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'contact@neira.fr'
)
AND subscription_status IS NULL;

-- Vérifier le résultat
SELECT 
  c.nom,
  c.subscription_status,
  c.subscription_plan,
  c.subscription_started_at,
  c.subscription_expires_at,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
JOIN auth.users u ON u.id = cm.user_id
WHERE u.email = 'contact@neira.fr';

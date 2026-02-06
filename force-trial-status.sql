-- Forcer le statut en trial pour le cabinet de contact@neira.fr
UPDATE cabinets
SET 
  subscription_status = 'trial',
  subscription_expires_at = NOW() + INTERVAL '7 days'
WHERE id IN (
  SELECT c.id
  FROM cabinets c
  JOIN cabinet_members cm ON cm.cabinet_id = c.id
  JOIN auth.users u ON u.id = cm.user_id
  WHERE u.email = 'contact@neira.fr'
);

-- Vérifier
SELECT 
  c.nom,
  c.subscription_status,
  c.subscription_expires_at,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
JOIN auth.users u ON u.id = cm.user_id
WHERE u.email = 'contact@neira.fr';

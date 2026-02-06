-- Vérifier le statut actuel de l'abonnement pour contact@neira.fr
SELECT 
  c.nom as cabinet_name,
  c.subscription_status,
  c.subscription_started_at,
  c.subscription_expires_at,
  c.stripe_subscription_id,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
JOIN auth.users u ON u.id = cm.user_id
WHERE u.email = 'contact@neira.fr';

-- Si le statut n'est pas "trial", le mettre à jour :
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

-- Vérifier le résultat
SELECT 
  c.nom as cabinet_name,
  c.subscription_status,
  c.subscription_started_at,
  c.subscription_expires_at,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
JOIN auth.users u ON u.id = cm.user_id
WHERE u.email = 'contact@neira.fr';

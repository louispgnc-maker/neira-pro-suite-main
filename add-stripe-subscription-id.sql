-- Ajouter le stripe_subscription_id pour contact@neira.fr
UPDATE cabinets
SET 
  stripe_subscription_id = 'sub_1SxqS97epLIfQ2kHmCqzIqPA',
  stripe_customer_id = (
    SELECT customer 
    FROM stripe.subscriptions 
    WHERE id = 'sub_1SxqS97epLIfQ2kHmCqzIqPA'
  )
WHERE id IN (
  SELECT c.id
  FROM cabinets c
  JOIN cabinet_members cm ON cm.cabinet_id = c.id
  JOIN auth.users u ON u.id = cm.user_id
  WHERE u.email = 'contact@neira.fr'
);

-- Vérifier le résultat
SELECT 
  c.nom,
  c.stripe_subscription_id,
  c.stripe_customer_id,
  c.subscription_status,
  c.subscription_expires_at,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
JOIN auth.users u ON u.id = cm.user_id
WHERE u.email = 'contact@neira.fr';

-- Vérifier si contact@neira.fr a un stripe_subscription_id
SELECT 
  c.nom,
  c.stripe_subscription_id,
  c.stripe_customer_id,
  c.subscription_status,
  c.subscription_plan,
  c.subscription_expires_at,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
JOIN auth.users u ON u.id = cm.user_id
WHERE u.email = 'contact@neira.fr';

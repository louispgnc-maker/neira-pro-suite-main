-- Chercher le cabinet par email du membre
SELECT 
  c.id,
  c.nom,
  c.subscription_plan,
  c.subscription_status,
  c.max_members,
  c.stripe_subscription_id,
  cm.email,
  cm.role_cabinet
FROM cabinets c
JOIN cabinet_members cm ON cm.cabinet_id = c.id
WHERE cm.email = 'contact@neira.fr'
LIMIT 5;

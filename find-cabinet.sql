-- Vérifier que le cabinet existe (sans filtre WHERE strict)
SELECT 
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_subscription_id,
  stripe_customer_id
FROM cabinets
WHERE nom LIKE '%test%' OR stripe_customer_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

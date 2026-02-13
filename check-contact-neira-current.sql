-- Vérifier l'abonnement actuel de contact@neira.fr
-- Cabinet ID: 85e7f59a-ac19-476d-8484-6e4988b9638d

SELECT 
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_subscription_id,
  stripe_customer_id,
  billing_period,
  current_period_end,
  created_at,
  updated_at
FROM cabinets
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';

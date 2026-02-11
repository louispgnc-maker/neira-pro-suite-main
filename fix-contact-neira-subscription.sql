-- Corriger l'abonnement de contact@neira.fr
-- Cabinet ID: 85e7f59a-ac19-476d-8484-6e4988b9638d
-- Stripe Subscription ID: sub_1SzMka7epLIfQ2kH26WjZrBP

-- ÉTAPE 1: Mettre à jour avec le nouvel abonnement professionnel
UPDATE cabinets
SET 
  subscription_plan = 'professionnel',
  max_members = 2,
  stripe_subscription_id = 'sub_1SzMka7epLIfQ2kH26WjZrBP',
  subscription_status = 'trialing',
  updated_at = NOW()
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';

-- ÉTAPE 2: Vérifier la mise à jour
SELECT 
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_subscription_id,
  stripe_customer_id,
  billing_period,
  current_period_end
FROM cabinets
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';

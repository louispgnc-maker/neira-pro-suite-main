-- SCRIPT COMPLET DE CORRECTION POUR contact@neira.fr
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier l'état actuel
SELECT 
  'AVANT CORRECTION' as etape,
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_subscription_id,
  stripe_customer_id
FROM cabinets
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';

-- ÉTAPE 2: FORCER la mise à jour
UPDATE cabinets
SET 
  subscription_plan = 'professionnel',
  max_members = 2,
  stripe_subscription_id = 'sub_1SzMka7epLIfQ2kH26WjZrBP',
  stripe_subscription_item_id = NULL, -- On va le remplir après
  subscription_status = 'trialing',
  billing_period = 'monthly',
  updated_at = NOW()
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d'
RETURNING *;

-- ÉTAPE 3: Vérifier que ça a marché
SELECT 
  'APRÈS CORRECTION' as etape,
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_subscription_id,
  stripe_customer_id
FROM cabinets
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';

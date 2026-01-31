-- Script pour forcer la synchronisation d'un abonnement Stripe vers un cabinet
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, vérifier l'état actuel du cabinet
SELECT 
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_customer_id,
  stripe_subscription_id
FROM cabinets 
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'louispgnc.business@gmail.com'
);

-- 2. Mettre à jour manuellement le cabinet avec le nouvel abonnement
-- ATTENTION : Remplacez les valeurs ci-dessous avec les vraies valeurs depuis Stripe Dashboard

/*
UPDATE cabinets
SET 
  subscription_plan = 'professionnel',
  subscription_status = 'active',
  max_members = 5,
  current_period_end = NOW() + INTERVAL '1 month',
  stripe_subscription_id = 'sub_XXXXXXXXXXXXXXXX',  -- Depuis Stripe
  stripe_customer_id = 'cus_XXXXXXXXXXXXXXXX'        -- Depuis Stripe
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'louispgnc.business@gmail.com'
);
*/

-- 3. Vérifier que la mise à jour a fonctionné
SELECT 
  id,
  nom,
  subscription_plan,
  subscription_status,
  max_members,
  stripe_customer_id,
  stripe_subscription_id
FROM cabinets 
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'louispgnc.business@gmail.com'
);
